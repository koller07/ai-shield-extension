// ============================================
// IA SHIELD - CONTENT SCRIPT v3.0 STABLE
// MINIMAL - Zero changes to working logic
// Only NEW patterns added
// ============================================

// Padrões de detecção (EXPANDIDOS com Europa)
const sensitivePatterns = {
    // 🇪🇺 EUROPA
    nif_pt: /\b[125689]\d{8}\b/g,
    nie_es: /\b[XYZ]\d{7}[A-Z]\b/g,
    dni_es: /\b\d{8}[A-Z]\b/g,
    insee_fr: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
    ni_uk: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
    codice_fiscale: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g,
    
    // 🇧🇷 BRASIL
    cpf: /(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/g,
    cnpj: /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/g,
    
    // 🇺🇸 USA
    ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    
    // 🌍 UNIVERSAL
    iban: /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{0,4}\s?[A-Z0-9]{0,4}\s?[A-Z0-9]{0,2}\b/g,
    credit_card: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    phone: /(\+\d{1,4}\s?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
    keywords: /\b(confidential|secret|private|password|token|api_key|segredo|confidencial|privado|senha|chave)\b/gi
};

// Função de detecção
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

// Alerta visual
function showAlert(detectionType) {
    const existingAlert = document.getElementById('ai-shield-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

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

// Animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Monitorar mudanças no DOM
function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                const text = document.body.innerText;
                const detections = detectSensitiveData(text);

                if (detections.length > 0) {
                    // Atualizar contador
                    chrome.storage.local.get(['detectionCount'], (result) => {
                        const currentCount = result.detectionCount || 0;
                        const newCount = currentCount + detections.length;

                        chrome.storage.local.set({
                            detectionCount: newCount
                        }, () => {
                            console.log('Counter updated:', newCount);
                            
                            // Notificar popup
                            try {
                                chrome.runtime.sendMessage({
                                    action: 'updateDetectionCount',
                                    count: newCount
                                });
                            } catch (e) {
                                // Popup não está aberto
                            }
                        });
                    });

                    // Mostrar alerta
                    showAlert(detections[0].type);

                    // Enviar para backend
                    sendDetectionToBackend(detections);
                }
            }
        });
    });

    observer.observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true,
        characterDataOldValue: false
    });
}

// Enviar para backend
function sendDetectionToBackend(detections) {
    chrome.storage.local.get(['apiKey', 'userEmail'], (result) => {
        const apiKey = result.apiKey || '';
        const userEmail = result.userEmail || '';

        if (!apiKey || !userEmail) {
            console.log('No API Key or Email configured');
            return;
        }

        const backendUrl = 'https://ai-shield-backend-production.up.railway.app';

        detections.forEach(detection => {
            fetch(`${backendUrl}/api/detections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    userEmail: userEmail,
                    detectionType: detection.type,
                    confidenceLevel: 'confirmed',
                    aiPlatform: detectAIPlatform(),
                    url: window.location.href,
                    detectedValue: detection.value
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Detection saved:', data);
            })
            .catch(error => {
                console.error('Error sending detection:', error);
            });
        });
    });
}

function detectAIPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com')) return 'Gemini';
    if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    
    return 'Unknown AI Platform';
}

// Iniciar monitoramento
setupMutationObserver();

console.log('🛡️ IA Shield v3.0 - Active');
