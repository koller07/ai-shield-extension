// ============================================
// IA SHIELD - CONTENT SCRIPT V2.2
// ULTRA SIMPLIFIED - Only detects user input
// By Koller Group
// ============================================

const BACKEND_URL = 'https://ai-shield-backend-production.up.railway.app';

// Track what has already been checked to avoid re-checking
const checkedTexts = new Set();

// Cooldown between checks (prevents spam)
let lastCheckTime = 0;
const CHECK_COOLDOWN = 2000; // 2 seconds

// Sensitive data patterns
const sensitivePatterns = {
    // CONFIRMED (Red Alert)
    cpf: {
        pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
        confidence: 'confirmed',
        type: 'CPF'
    },
    cnpj: {
        pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
        confidence: 'confirmed',
        type: 'CNPJ'
    },
    creditCard: {
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        confidence: 'confirmed',
        type: 'CREDIT_CARD'
    },
    iban: {
        pattern: /\b[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{2}\b/g,
        confidence: 'confirmed',
        type: 'IBAN'
    },
    ssn: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        confidence: 'confirmed',
        type: 'SSN'
    },
    
    // SUSPICIOUS (Yellow Alert)
    cpfUnformatted: {
        pattern: /\b\d{11}\b/g,
        confidence: 'suspicious',
        type: 'POSSIBLE_CPF'
    },
    phone: {
        pattern: /(\+\d{1,3}[\s-]?)?\(?\d{2,3}\)?[\s-]?\d{4,5}[\s-]?\d{4}\b/g,
        confidence: 'suspicious',
        type: 'PHONE'
    },
    email: {
        pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
        confidence: 'suspicious',
        type: 'EMAIL'
    }
};

// Simple detection function
function detectInText(text) {
    if (!text || text.length < 5) return null;
    
    // Skip if already checked this exact text
    const textHash = text.toLowerCase().replace(/\s/g, '');
    if (checkedTexts.has(textHash)) {
        return null;
    }
    
    // Check cooldown
    const now = Date.now();
    if (now - lastCheckTime < CHECK_COOLDOWN) {
        return null;
    }
    
    // Find first match
    for (const [key, config] of Object.entries(sensitivePatterns)) {
        const match = text.match(config.pattern);
        if (match && match.length > 0) {
            // Mark as checked
            checkedTexts.add(textHash);
            lastCheckTime = now;
            
            // Auto-clean cache after 5 minutes
            setTimeout(() => {
                checkedTexts.delete(textHash);
            }, 300000);
            
            return {
                type: config.type,
                confidence: config.confidence,
                value: match[0]
            };
        }
    }
    
    return null;
}

// Show alert
function showAlert(detectionType, confidence) {
    const existingAlert = document.getElementById('ia-shield-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.id = 'ia-shield-alert';
    
    const isConfirmed = confidence === 'confirmed';
    const bgColor = isConfirmed ? '#dc2626' : '#f59e0b';
    const icon = isConfirmed ? '🔴' : '⚠️';
    const title = isConfirmed ? 'SENSITIVE DATA DETECTED' : 'POSSIBLE SENSITIVE DATA';
    
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${bgColor} 0%, ${isConfirmed ? '#991b1b' : '#d97706'} 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 320px;
    `;

    alert.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <div>
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 12px; opacity: 0.9;">${detectionType}</div>
        </div>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 4000);
}

// Get AI platform
function getAIPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com')) return 'Gemini';
    if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    return 'AI Platform';
}

// Register user
async function registerUser(apiKey, userName, userEmail) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ userName, userEmail })
        });
        return (await response.json()).success;
    } catch (error) {
        return false;
    }
}

// Send to backend
async function sendToBackend(detection, apiKey, userEmail) {
    try {
        await fetch(`${BACKEND_URL}/api/detections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                userEmail: userEmail,
                detectionType: detection.type,
                confidenceLevel: detection.confidence,
                aiPlatform: getAIPlatform(),
                url: window.location.href,
                detectedValue: detection.value
            })
        });
    } catch (error) {
        console.error('IA Shield: Send error:', error);
    }
}

// Update counters
function updateCounters(confidence) {
    chrome.storage.local.get(['confirmedCount', 'suspiciousCount'], (result) => {
        const field = confidence === 'confirmed' ? 'confirmedCount' : 'suspiciousCount';
        const newValue = (result[field] || 0) + 1;
        
        chrome.storage.local.set({ [field]: newValue }, () => {
            try {
                chrome.runtime.sendMessage({
                    action: 'updateCounts',
                    confirmed: confidence === 'confirmed' ? newValue : (result.confirmedCount || 0),
                    suspicious: confidence === 'suspicious' ? newValue : (result.suspiciousCount || 0)
                });
            } catch (e) {}
        });
    });
}

// Process detection
async function processDetection(detection) {
    if (!detection) return;
    
    chrome.storage.local.get(['apiKey', 'userName', 'userEmail', 'registered'], async (result) => {
        const { apiKey, userName, userEmail, registered } = result;
        
        if (!apiKey || !userEmail) {
            console.log('IA Shield: Not configured');
            return;
        }
        
        // Register user on first detection
        if (!registered) {
            const success = await registerUser(apiKey, userName, userEmail);
            if (success) {
                chrome.storage.local.set({ registered: true });
            }
        }
        
        // Show alert
        showAlert(detection.type, detection.confidence);
        
        // Update counter
        updateCounters(detection.confidence);
        
        // Send to backend
        await sendToBackend(detection, apiKey, userEmail);
    });
}

// Monitor user input (ONLY user typing, not AI responses)
function setupInputMonitoring() {
    // Track all input fields
    const monitorElement = (element) => {
        let typingTimer;
        const TYPING_DELAY = 1500; // Wait 1.5s after user stops typing
        
        element.addEventListener('input', (e) => {
            clearTimeout(typingTimer);
            
            typingTimer = setTimeout(() => {
                const text = element.value || element.textContent || element.innerText;
                const detection = detectInText(text);
                if (detection) {
                    processDetection(detection);
                }
            }, TYPING_DELAY);
        });
        
        element.addEventListener('paste', (e) => {
            setTimeout(() => {
                const text = element.value || element.textContent || element.innerText;
                const detection = detectInText(text);
                if (detection) {
                    processDetection(detection);
                }
            }, 100);
        });
    };
    
    // Monitor existing inputs
    document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(monitorElement);
    
    // Monitor new inputs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.matches('input, textarea, [contenteditable="true"]')) {
                        monitorElement(node);
                    }
                    node.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(monitorElement);
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize
console.log('✅ IA Shield v2.2: Active on', getAIPlatform());
setupInputMonitoring();
