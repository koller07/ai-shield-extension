// ============================================
// IA SHIELD - CONTENT SCRIPT V2.1
// Fixed: Duplicate detections & alert bugs
// By Koller Group
// ============================================

const BACKEND_URL = 'https://ai-shield-backend-production.up.railway.app';

// Cache to prevent duplicate detections
const detectionCache = new Set();
const CACHE_DURATION = 60000; // 1 minute

// Cooldown for alerts
let lastAlertTime = 0;
const ALERT_COOLDOWN = 2000; // 2 seconds between alerts

// Debounce timer
let debounceTimer = null;
const DEBOUNCE_DELAY = 1000; // Wait 1 second after user stops typing

// Sensitive data patterns with confidence levels
const sensitivePatterns = {
    // HIGH CONFIDENCE (CONFIRMED) - Strong patterns
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
    
    // MEDIUM CONFIDENCE (SUSPICIOUS) - Could be false positives
    nif: {
        pattern: /\b\d{9}\b/g,
        confidence: 'suspicious',
        type: 'NIF'
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
    },
    
    // Keywords
    medicalKeywords: {
        pattern: /\b(diagnosis|medical record|patient|prescription|health condition)\b/gi,
        confidence: 'suspicious',
        type: 'MEDICAL_DATA'
    },
    financialKeywords: {
        pattern: /\b(salary|income|bank account|financial statement|tax return)\b/gi,
        confidence: 'suspicious',
        type: 'FINANCIAL_DATA'
    },
    confidentialKeywords: {
        pattern: /\b(confidential|secret|private|password|api[_\s]?key|token)\b/gi,
        confidence: 'suspicious',
        type: 'CONFIDENTIAL'
    }
};

// Create unique hash for detection (to prevent duplicates)
function createDetectionHash(type, value) {
    return `${type}-${value.toLowerCase().replace(/\s/g, '')}`;
}

// Check if detection is in cache
function isInCache(hash) {
    return detectionCache.has(hash);
}

// Add to cache with auto-expiry
function addToCache(hash) {
    detectionCache.add(hash);
    
    // Remove from cache after duration
    setTimeout(() => {
        detectionCache.delete(hash);
    }, CACHE_DURATION);
}

// Detect sensitive data in text
function detectSensitiveData(text) {
    const detections = [];
    const seenInThisRun = new Set();
    
    for (const [key, config] of Object.entries(sensitivePatterns)) {
        const matches = text.match(config.pattern);
        if (matches) {
            matches.forEach(match => {
                const hash = createDetectionHash(config.type, match);
                
                // Skip if already detected in this run or in cache
                if (!seenInThisRun.has(hash) && !isInCache(hash)) {
                    seenInThisRun.add(hash);
                    addToCache(hash);
                    
                    detections.push({
                        type: config.type,
                        confidence: config.confidence,
                        value: match,
                        timestamp: new Date().toISOString(),
                        hash: hash
                    });
                }
            });
        }
    }
    
    return detections;
}

// Show visual alert (with cooldown)
function showAlert(detectionType, confidence) {
    const now = Date.now();
    
    // Check cooldown
    if (now - lastAlertTime < ALERT_COOLDOWN) {
        return; // Skip this alert
    }
    
    lastAlertTime = now;
    
    // Remove existing alert
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
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease-out;
    `;

    alert.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <div>
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 12px; opacity: 0.9;">${detectionType}</div>
        </div>
    `;

    document.body.appendChild(alert);

    // Trigger animation
    setTimeout(() => {
        alert.style.opacity = '1';
        alert.style.transform = 'translateX(0)';
    }, 10);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    }, 4000);
}

function getAIPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com')) return 'Gemini';
    if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    if (hostname.includes('mistral.ai')) return 'Mistral';
    if (hostname.includes('huggingface.co')) return 'HuggingFace';
    if (hostname.includes('groq.com')) return 'Groq';
    return 'Unknown AI Platform';
}

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
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('IA Shield: Error registering user:', error);
        return false;
    }
}

async function sendDetectionToBackend(detection, apiKey, userEmail) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/detections`, {
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
        
        return response.ok;
    } catch (error) {
        console.error('IA Shield: Error sending detection:', error);
        return false;
    }
}

function updateCounters(detections) {
    chrome.storage.local.get(['confirmedCount', 'suspiciousCount'], (result) => {
        const confirmed = detections.filter(d => d.confidence === 'confirmed').length;
        const suspicious = detections.filter(d => d.confidence === 'suspicious').length;
        
        const newConfirmed = (result.confirmedCount || 0) + confirmed;
        const newSuspicious = (result.suspiciousCount || 0) + suspicious;
        
        chrome.storage.local.set({
            confirmedCount: newConfirmed,
            suspiciousCount: newSuspicious
        }, () => {
            try {
                chrome.runtime.sendMessage({
                    action: 'updateCounts',
                    confirmed: newConfirmed,
                    suspicious: newSuspicious
                });
            } catch (e) {}
        });
    });
}

// Process detections (called after debounce)
async function processDetections() {
    const text = document.body.innerText;
    const detections = detectSensitiveData(text);

    if (detections.length > 0) {
        // Get user credentials
        chrome.storage.local.get(['apiKey', 'userName', 'userEmail', 'registered'], async (result) => {
            const { apiKey, userName, userEmail, registered } = result;
            
            if (!apiKey || !userEmail) {
                console.log('IA Shield: Not configured. Please open extension popup.');
                return;
            }
            
            // Register user if not registered yet
            if (!registered) {
                const success = await registerUser(apiKey, userName, userEmail);
                if (success) {
                    chrome.storage.local.set({ registered: true });
                }
            }
            
            // Show alert for first detection (with cooldown)
            if (detections.length > 0) {
                showAlert(detections[0].type, detections[0].confidence);
            }
            
            // Update counters
            updateCounters(detections);
            
            // Send to backend
            for (const detection of detections) {
                await sendDetectionToBackend(detection, apiKey, userEmail);
            }
        });
    }
}

// Monitor DOM changes with debounce
function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        // Clear previous timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        
        // Set new timer
        debounceTimer = setTimeout(() => {
            processDetections();
        }, DEBOUNCE_DELAY);
    });

    observer.observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true
    });
}

// Initialize
console.log('✅ IA Shield v2.1: Monitoring active on', getAIPlatform());
setupMutationObserver();
