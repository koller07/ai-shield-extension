// AI Shield - content.js v3.0 FINAL
// Detecta dados sensíveis e envia para backend

const BACKEND_URL = 'https://ai-shield-backend-production.up.railway.app';

// ================================================
// PADRÕES DE DETECÇÃO COM CONFIDENCE LEVEL
// ================================================
const sensitivePatterns = {
    // 🇪🇺 EUROPA - CONFIRMED
    nif_pt:         { pattern: /\b[125689]\d{8}\b/g,                                         confidence: 'confirmed' },
    nie_es:         { pattern: /\b[XYZ]\d{7}[A-Z]\b/g,                                      confidence: 'confirmed' },
    dni_es:         { pattern: /\b\d{8}[A-Z]\b/g,                                            confidence: 'confirmed' },
    insee_fr:       { pattern: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g, confidence: 'confirmed' },
    ni_uk:          { pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, confidence: 'confirmed' },
    codice_fiscale: { pattern: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g,              confidence: 'confirmed' },

    // 🇧🇷 BRASIL - CONFIRMED
    cpf:  { pattern: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,          confidence: 'confirmed' },
    cnpj: { pattern: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,   confidence: 'confirmed' },

    // 🇺🇸 USA - CONFIRMED
    ssn: { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, confidence: 'confirmed' },

    // 🌍 UNIVERSAL - CONFIRMED
    iban:        { pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}[A-Z0-9]{4}[A-Z0-9]{4}[A-Z0-9]{4}[A-Z0-9]{0,4}\b/g, confidence: 'confirmed' },
    credit_card: { pattern: /\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g, confidence: 'confirmed' },

    // 🌍 UNIVERSAL - SUSPICIOUS
    email:    { pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, confidence: 'suspicious' },
    phone:    { pattern: /\+\d{1,3}\s?\d{2,3}\s?\d{3,4}\s?\d{3,4}/g,            confidence: 'suspicious' },
    keywords: { pattern: /\b(password|senha|confidential|secret|private|token|api_key)\b/gi, confidence: 'suspicious' }
};

// Cache para evitar duplicatas (válido por 5 minutos)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// Cooldown entre alertas
let lastAlertTime = 0;
const ALERT_COOLDOWN = 2000;

// Debounce
let debounceTimer = null;
const DEBOUNCE_DELAY = 1500;

// ================================================
// DETECÇÃO
// ================================================
function detectSensitiveData(text) {
    const detections = [];
    const now = Date.now();

    // Limpar cache expirado
    for (const [key, time] of cache.entries()) {
        if (now - time > CACHE_DURATION) cache.delete(key);
    }

    for (const [type, config] of Object.entries(sensitivePatterns)) {
        const matches = text.match(config.pattern);
        if (!matches) continue;

        for (const match of matches) {
            const key = `${type}:${match.trim()}`;
            if (cache.has(key)) continue;

            cache.set(key, now);
            detections.push({
                type: type.toUpperCase(),
                value: match.trim(),
                confidence: config.confidence,
                timestamp: new Date().toISOString()
            });
        }
    }

    return detections;
}

// ================================================
// ALERTA VISUAL (vermelho = confirmed, amarelo = suspicious)
// ================================================
function showAlert(detection) {
    const now = Date.now();
    if (now - lastAlertTime < ALERT_COOLDOWN) return;
    lastAlertTime = now;

    const existing = document.getElementById('ai-shield-alert');
    if (existing) existing.remove();

    const isConfirmed = detection.confidence === 'confirmed';
    const bg = isConfirmed
        ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
        : 'linear-gradient(135deg, #ffa500 0%, #e08000 100%)';
    const icon = isConfirmed ? '🔴' : '⚠️';
    const label = isConfirmed ? 'SENSITIVE DATA DETECTED' : 'POSSIBLE SENSITIVE DATA';

    const alert = document.createElement('div');
    alert.id = 'ai-shield-alert';
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bg};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 280px;
        animation: aiShieldSlideIn 0.3s ease-out;
    `;
    alert.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px">${icon}</span>
            <div>
                <div style="font-size:11px;opacity:0.85;margin-bottom:2px;">${label}</div>
                <div style="font-size:14px;font-weight:700;">${detection.type}</div>
            </div>
        </div>
    `;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'aiShieldSlideOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes aiShieldSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes aiShieldSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
`;
document.head.appendChild(style);

// ================================================
// BACKEND
// ================================================
function getAIPlatform() {
    const h = window.location.hostname;
    if (h.includes('chatgpt.com') || h.includes('openai.com')) return 'ChatGPT';
    if (h.includes('claude.ai')) return 'Claude';
    if (h.includes('gemini.google.com')) return 'Gemini';
    if (h.includes('copilot.microsoft.com')) return 'Copilot';
    if (h.includes('perplexity.ai')) return 'Perplexity';
    if (h.includes('mistral.ai')) return 'Mistral';
    if (h.includes('groq.com')) return 'Groq';
    return 'Unknown AI';
}

// Registrar usuário (garante que existe antes de enviar detecções)
async function ensureUserRegistered(userName, userEmail, apiKey) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ userName, userEmail })
        });
        const data = await res.json();
        return data.success === true;
    } catch (e) {
        console.error('AI Shield - Register error:', e);
        return false;
    }
}

// Enviar detecção
async function sendDetection(detection, userEmail, apiKey) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/detections`, {
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
        const data = await res.json();
        console.log('AI Shield - Detection saved:', data.success ? '✅' : '❌', data);
    } catch (e) {
        console.error('AI Shield - Send detection error:', e);
    }
}

// ================================================
// PROCESSAR DETECÇÕES
// ================================================
async function processDetections(detections) {
    // 1. Atualizar contadores PRIMEIRO
    const newConfirmed = detections.filter(d => d.confidence === 'confirmed').length;
    const newSuspicious = detections.filter(d => d.confidence === 'suspicious').length;

    chrome.storage.local.get(['detectionCount', 'confirmedCount', 'suspiciousCount'], (result) => {
        const total = (result.detectionCount || 0) + detections.length;
        const confirmed = (result.confirmedCount || 0) + newConfirmed;
        const suspicious = (result.suspiciousCount || 0) + newSuspicious;

        chrome.storage.local.set({ detectionCount: total, confirmedCount: confirmed, suspiciousCount: suspicious }, () => {
            console.log(`AI Shield - Counter → Total:${total} Confirmed:${confirmed} Suspicious:${suspicious}`);
            try {
                chrome.runtime.sendMessage({ action: 'updateDetectionCount', count: total }, () => {
                    if (chrome.runtime.lastError) { /* popup fechado, normal */ }
                });
            } catch (e) { /* ignore */ }
        });
    });

    // 2. Mostrar alerta com o primeiro detection (objeto completo)
    showAlert(detections[0]);

    // 3. Enviar para backend
    chrome.storage.local.get(['userName', 'userEmail', 'apiKey'], async (result) => {
        const { userName, userEmail, apiKey } = result;

        if (!apiKey || !userEmail) {
            console.log('AI Shield - No API Key or Email configured - skipping backend');
            return;
        }

        await ensureUserRegistered(userName || 'Unknown', userEmail, apiKey);

        for (const detection of detections) {
            await sendDetection(detection, userEmail, apiKey);
        }
    });
}

// ================================================
// MUTATION OBSERVER
// ================================================
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    const text = document.body.innerText;
                    if (!text || text.length < 5) return;

                    const detections = detectSensitiveData(text);
                    if (detections.length > 0) {
                        processDetections(detections);
                    }
                }
            });
        }, DEBOUNCE_DELAY);
    });

    observer.observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true,
        characterDataOldValue: false
    });
}

setupObserver();
console.log('🛡️ AI Shield v3.0 - Active (25+ data types, EU focus)');
