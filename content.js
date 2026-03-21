// ============================================
// AI-SHIELD CONTENT SCRIPT
// Detects sensitive data and sends with authentication
// ============================================

const API_URL = 'https://ai-shield-backend-production.up.railway.app';

// Detection patterns (unchanged)
const sensitivePatterns = {
    cpf: /(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/g,
    cnpj: /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/g,
    nif: /\b\d{9}\b/g,
    iban: /[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/g,
    creditCard: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    phone: /(\+\d{1,3}\s?)?\(\d{2,3}\)\s?\d{4,5}-\d{4}|\+\d{1,3}\s?\d{2,3}\s?\d{4,5}\s?\d{4}/g,
    keywords: /\b(confidential|secret|private|password|token|api_key|patient|medical)\b/gi
};

// Get authentication data from storage
async function getAuthData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authToken', 'user', 'company'], (result) => {
            resolve({
                token: result.authToken,
                user: result.user ? JSON.parse(result.user) : null,
                company: result.company ? JSON.parse(result.company) : null
            });
        });
    });
}

// Detect sensitive data
function detectSensitiveData(text) {
    const detections = [];
    
    for (const [type, pattern] of Object.entries(sensitivePatterns)) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                detections.push({
                    type: type.toUpperCase(),
                    value: match,
                    timestamp: new Date().toISOString()
                });
            });
        }
    }
    
    return detections;
}

// Show visual alert
function showAlert(detectionType) {
    const existingAlert = document.getElementById('ai-shield-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.id = 'ai-shield-alert';
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;

    const icon = document.createElement('span');
    icon.textContent = '⚠️';
    icon.style.fontSize = '18px';

    const text = document.createElement('span');
    text.textContent = `SENSITIVE DATA DETECTED: ${detectionType}`;

    alert.appendChild(icon);
    alert.appendChild(text);
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Add CSS animations
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

// Send detection to backend WITH authentication
async function sendDetectionToBackend(detections) {
    const authData = await getAuthData();
    
    // If not authenticated, ignore (don't send)
    if (!authData.token || !authData.user || !authData.company) {
        console.log('[AI Shield] User not authenticated. Detection not sent.');
        return;
    }

    detections.forEach(async (detection) => {
        try {
            const response = await fetch(`${API_URL}/api/detection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authData.token}`
                },
                body: JSON.stringify({
                    detectionType: detection.type,
                    aiPlatform: detectPlatform(),
                    url: window.location.href,
                    timestamp: detection.timestamp
                })
            });

            if (response.ok) {
                console.log('[AI Shield] Detection sent successfully:', detection.type);
                
                // Update local counter
                chrome.storage.local.get(['detectionCount'], (result) => {
                    const newCount = (result.detectionCount || 0) + 1;
                    chrome.storage.local.set({ detectionCount: newCount });
                    
                    // Notify popup to update
                    chrome.runtime.sendMessage({
                        action: 'updateDetectionCount',
                        count: newCount
                    }).catch(() => {
                        // Popup not open, OK
                    });
                });
            } else {
                console.error('[AI Shield] Error sending detection:', response.status);
                
                // If token expired (401/403), clear data
                if (response.status === 401 || response.status === 403) {
                    chrome.storage.local.remove(['authToken', 'user', 'company']);
                }
            }
        } catch (error) {
            console.error('[AI Shield] Network error sending detection:', error);
        }
    });
}

// Detect AI platform
function detectPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com')) return 'Google Gemini';
    if (hostname.includes('copilot.microsoft.com')) return 'Microsoft Copilot';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    if (hostname.includes('mistral.ai')) return 'Mistral';
    
    return 'Unknown AI Platform';
}

// Monitor DOM changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
            const text = document.body.innerText;
            const detections = detectSensitiveData(text);

            if (detections.length > 0) {
                // Show visual alert
                showAlert(detections[0].type);
                
                // Send to backend
                sendDetectionToBackend(detections);
            }
        }
    });
});

// Start observing
observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true
});

console.log('[AI Shield] Extension loaded. Platform:', detectPlatform());
