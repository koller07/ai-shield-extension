// Padrões de detecção de dados sensíveis
const sensitivePatterns = {
    // CPF (Brasil) - formato: 123.456.789-00 ou 12345678900
    cpf: /(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/g,
    
    // CNPJ (Brasil) - formato: 12.345.678/0001-90 ou 12345678000190
    cnpj: /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/g,
    
    // NIF (Portugal) - formato: 123456789
    nif: /\b\d{9}\b/g,
    
    // IBAN - formato: PT50 0035 1234 5678 9012 3456 78
    iban: /[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/g,
    
    // Cartão de Crédito - formato: 4532 1234 5678 9010
    creditCard: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
    
    // Email corporativo
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    
    // Telefone - formato: +55 11 98765-4321 ou 11 98765-4321
    phone: /(\+\d{1,3}\s?)?\(\d{2,3}\)\s?\d{4,5}-\d{4}|\+\d{1,3}\s?\d{2,3}\s?\d{4,5}\s?\d{4}/g,
    
    // Palavras-chave sensíveis
    keywords: /\b(confidential|secret|private|password|token|api_key|segredo|confidencial|privado|senha|token|chave|diagnóstico|diagnóstico médico|patient|paciente|medical|médico)\b/gi
};

// Função para detectar dados sensíveis
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

// Função para mostrar alerta visual
function showAlert(detectionType) {
    // Remover alerta anterior se existir
    const existingAlert = document.getElementById('ai-shield-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Criar novo alerta
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

    // Adicionar ícone
    const icon = document.createElement('span');
    icon.textContent = '⚠️';
    icon.style.fontSize = '18px';

    // Adicionar texto
    const text = document.createElement('span');
    text.textContent = `SENSITIVE DATA DETECTED: ${detectionType}`;

    alert.appendChild(icon);
    alert.appendChild(text);
    document.body.appendChild(alert);

    // Remover alerta após 4 segundos
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Adicionar animações CSS
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

                    // Mostrar alerta para o primeiro tipo detectado
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

// Função para enviar detecções para o backend
function sendDetectionToBackend(detections) {
    chrome.storage.local.get(['companyId', 'userId'], (result) => {
        const companyId = result.companyId || 'default-company';
        const userId = result.userId || 'default-user';

        const backendUrl = 'https://ai-shield-backend-production.up.railway.app';

        detections.forEach(detection => {
            fetch(`${backendUrl}/api/detections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    companyId: companyId,
                    userId: userId,
                    detectionType: detection.type,
                    detectionValue: detection.value,
                    timestamp: detection.timestamp,
                    url: window.location.href
                })
            })
            .catch(error => {
                console.error('Error sending detection to backend:', error);
            });
        });
    });
}

// Iniciar monitoramento
setupMutationObserver();

console.log('AI-Shield Content Script loaded and monitoring active');
