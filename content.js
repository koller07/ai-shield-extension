// ============================================
// IA SHIELD - CONTENT SCRIPT V2.4
// Debug version - Shows detailed logs
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
        console.log('IA Shield: Text already checked (in cache)');
        return null;
    }
    
    // Check cooldown
    const now = Date.now();
    if (now - lastCheckTime < CHECK_COOLDOWN) {
        console.log('IA Shield: Cooldown active, skipping check');
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
            
            console.log('✅ IA Shield: Detection found!', {
                type: config.type,
                confidence: config.confidence,
                value: match[0]
            });
            
            return {
                type: config.type,
                confidence: config.confidence,
                value: match[0]
            };
        }
    }
    
    return null;
}

// Add CSS animations to page
function addAnimationStyles() {
    if (document.getElementById('ia-shield-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ia-shield-styles';
    style.textContent = `
        @keyframes iaShieldSlideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes iaShieldSlideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        .ia-shield-alert-enter {
            animation: iaShieldSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .ia-shield-alert-exit {
            animation: iaShieldSlideOut 0.3s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }
    `;
    document.head.appendChild(style);
}

// Show alert with smooth animations
function showAlert(detectionType, confidence) {
    console.log('🎨 IA Shield: Showing alert -', detectionType, confidence);
    
    // Add styles if not already added
    addAnimationStyles();
    
    // Remove existing alert
    const existingAlert = document.getElementById('ia-shield-alert');
    if (existingAlert) {
        existingAlert.classList.add('ia-shield-alert-exit');
        setTimeout(() => existingAlert.remove(), 300);
    }

    const alert = document.createElement('div');
    alert.id = 'ia-shield-alert';
    
    const isConfirmed = confidence === 'confirmed';
    const bgColor = isConfirmed ? '#dc2626' : '#f59e0b';
    const shadowColor = isConfirmed ? 'rgba(220, 38, 38, 0.5)' : 'rgba(245, 158, 11, 0.5)';
    const icon = isConfirmed ? '🔴' : '⚠️';
    const title = isConfirmed ? 'SENSITIVE DATA DETECTED' : 'POSSIBLE SENSITIVE DATA';
    
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${bgColor} 0%, ${isConfirmed ? '#991b1b' : '#d97706'} 100%);
        color: white;
        padding: 18px 22px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 10px 40px ${shadowColor}, 0 6px 20px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 340px;
        transform: translateX(400px);
        opacity: 0;
        border: 2px solid rgba(255, 255, 255, 0.2);
    `;

    alert.innerHTML = `
        <span style="font-size: 24px; line-height: 1;">${icon}</span>
        <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.3px;">${title}</div>
            <div style="font-size: 12px; opacity: 0.95; font-weight: 500;">${detectionType}</div>
        </div>
    `;

    document.body.appendChild(alert);

    // Trigger enter animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            alert.classList.add('ia-shield-alert-enter');
        });
    });

    // Auto-remove after 4 seconds with exit animation
    setTimeout(() => {
        alert.classList.remove('ia-shield-alert-enter');
        alert.classList.add('ia-shield-alert-exit');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
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
    console.log('📝 IA Shield: Registering user...', { userName, userEmail });
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ userName, userEmail })
        });
        
        const data = await response.json();
        
        console.log('📝 IA Shield: Register response:', {
            status: response.status,
            success: data.success,
            data: data
        });
        
        return data.success;
    } catch (error) {
        console.error('❌ IA Shield: Register error:', error);
        return false;
    }
}

// Send to backend
async function sendToBackend(detection, apiKey, userEmail) {
    const payload = {
        userEmail: userEmail,
        detectionType: detection.type,
        confidenceLevel: detection.confidence,
        aiPlatform: getAIPlatform(),
        url: window.location.href,
        detectedValue: detection.value
    };
    
    console.log('📤 IA Shield: Sending detection to backend...', payload);
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/detections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        console.log('📤 IA Shield: Backend response:', {
            status: response.status,
            ok: response.ok,
            data: data
        });
        
        if (!response.ok) {
            console.error('❌ IA Shield: Backend returned error:', data);
        } else {
            console.log('✅ IA Shield: Detection saved successfully!');
        }
        
        return response.ok;
    } catch (error) {
        console.error('❌ IA Shield: Network error sending detection:', error);
        return false;
    }
}

// Update counters
function updateCounters(confidence) {
    console.log('📊 IA Shield: Updating counter -', confidence);
    
    chrome.storage.local.get(['confirmedCount', 'suspiciousCount'], (result) => {
        const field = confidence === 'confirmed' ? 'confirmedCount' : 'suspiciousCount';
        const newValue = (result[field] || 0) + 1;
        
        console.log('📊 IA Shield: New counter value:', field, '=', newValue);
        
        chrome.storage.local.set({ [field]: newValue }, () => {
            try {
                chrome.runtime.sendMessage({
                    action: 'updateCounts',
                    confirmed: confidence === 'confirmed' ? newValue : (result.confirmedCount || 0),
                    suspicious: confidence === 'suspicious' ? newValue : (result.suspiciousCount || 0)
                });
            } catch (e) {
                console.log('IA Shield: Popup not open, counter updated locally');
            }
        });
    });
}

// Process detection
async function processDetection(detection) {
    if (!detection) return;
    
    console.log('⚙️ IA Shield: Processing detection...', detection);
    
    chrome.storage.local.get(['apiKey', 'userName', 'userEmail', 'registered'], async (result) => {
        const { apiKey, userName, userEmail, registered } = result;
        
        console.log('⚙️ IA Shield: User config:', {
            hasApiKey: !!apiKey,
            userName: userName,
            userEmail: userEmail,
            registered: registered
        });
        
        if (!apiKey || !userEmail) {
            console.error('❌ IA Shield: Not configured! Missing API Key or Email.');
            return;
        }
        
        // Register user on first detection
        if (!registered) {
            console.log('📝 IA Shield: First detection, registering user...');
            const success = await registerUser(apiKey, userName, userEmail);
            if (success) {
                console.log('✅ IA Shield: User registered successfully!');
                chrome.storage.local.set({ registered: true });
            } else {
                console.error('❌ IA Shield: User registration failed!');
            }
        } else {
            console.log('✅ IA Shield: User already registered');
        }
        
        // Show alert
        showAlert(detection.type, detection.confidence);
        
        // Update counter
        updateCounters(detection.confidence);
        
        // Send to backend
        console.log('📤 IA Shield: Sending detection to backend...');
        const sent = await sendToBackend(detection, apiKey, userEmail);
        
        if (sent) {
            console.log('✅ IA Shield: Full flow completed successfully!');
        } else {
            console.error('❌ IA Shield: Failed to send detection to backend');
        }
    });
}

// Monitor user input (ONLY user typing, not AI responses)
function setupInputMonitoring() {
    console.log('👀 IA Shield: Setting up input monitoring...');
    
    // Track all input fields
    const monitorElement = (element) => {
        let typingTimer;
        const TYPING_DELAY = 1500; // Wait 1.5s after user stops typing
        
        element.addEventListener('input', (e) => {
            clearTimeout(typingTimer);
            
            typingTimer = setTimeout(() => {
                const text = element.value || element.textContent || element.innerText;
                console.log('🔍 IA Shield: Checking text...', text.substring(0, 50) + '...');
                const detection = detectInText(text);
                if (detection) {
                    processDetection(detection);
                }
            }, TYPING_DELAY);
        });
        
        element.addEventListener('paste', (e) => {
            setTimeout(() => {
                const text = element.value || element.textContent || element.innerText;
                console.log('📋 IA Shield: Checking pasted text...', text.substring(0, 50) + '...');
                const detection = detectInText(text);
                if (detection) {
                    processDetection(detection);
                }
            }, 100);
        });
    };
    
    // Monitor existing inputs
    const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
    console.log('👀 IA Shield: Found', inputs.length, 'input fields to monitor');
    inputs.forEach(monitorElement);
    
    // Monitor new inputs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.matches('input, textarea, [contenteditable="true"]')) {
                        console.log('👀 IA Shield: New input field detected, monitoring...');
                        monitorElement(node);
                    }
                    node.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(el => {
                        console.log('👀 IA Shield: New input field detected, monitoring...');
                        monitorElement(el);
                    });
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
console.log('✅ IA Shield v2.4 (DEBUG): Active on', getAIPlatform());
console.log('📋 IA Shield: Backend URL:', BACKEND_URL);
setupInputMonitoring();
