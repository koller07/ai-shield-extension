// ============================================
// IA SHIELD - CONTENT SCRIPT
// Detects sensitive data in AI platforms
// By Koller Group
// ============================================

const BACKEND_URL = 'https://ai-shield-backend-production.up.railway.app';

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
    
    // Keywords that suggest sensitive content
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

// Detect sensitive data in text
function detectSensitiveData(text) {
    const detections = [];
    
    for (const [key, config] of Object.entries(sensitivePatterns)) {
        const matches = text.match(config.pattern);
        if (matches) {
            matches.forEach(match => {
                detections.push({
                    type: config.type,
                    confidence: config.confidence,
                    value: match,
                    timestamp: new Date().toISOString()
                });
            });
        }
    }
    
    return detections;
}

// Show visual alert
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
        z-index: 999999;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease-out;
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
        alert.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

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

function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                const text = document.body.innerText;
                const detections = detectSensitiveData(text);

                if (detections.length > 0) {
                    chrome.storage.local.get(['apiKey', 'userName', 'userEmail', 'registered'], async (result) => {
                        const { apiKey, userName, userEmail, registered } = result;
                        
                        if (!apiKey || !userEmail) {
                            console.log('IA Shield: Not configured. Please open extension popup.');
                            return;
                        }
                        
                        if (!registered) {
                            const success = await registerUser(apiKey, userName, userEmail);
                            if (success) {
                                chrome.storage.local.set({ registered: true });
                            }
                        }
                        
                        showAlert(detections[0].type, detections[0].confidence);
                        updateCounters(detections);
                        
                        detections.forEach(detection => {
                            sendDetectionToBackend(detection, apiKey, userEmail);
                        });
                    });
                }
            }
        });
    });

    observer.observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true
    });
}

console.log('✅ IA Shield: Monitoring active on', getAIPlatform());
setupMutationObserver();
