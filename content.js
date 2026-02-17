// ============================================
// IA SHIELD - CONTENT SCRIPT v3.0
// Global Data Protection with European Focus
// By Koller Group
// ============================================

// ============================================
// SENSITIVE DATA PATTERNS
// Organized by Region: EU (Priority) > Americas > Universal
// ============================================

const sensitivePatterns = {
    
    // ========================================
    // 🇪🇺 EUROPEAN UNION (GDPR PRIORITY)
    // ========================================
    
    // 🇵🇹 PORTUGAL
    // NIF (Número de Identificação Fiscal) - 9 digits starting with 1,2,5,6,8,9
    nif_pt: {
        pattern: /\b[125689]\d{8}\b/g,
        confidence: 'confirmed',
        description: 'Portugal Tax ID (NIF)'
    },
    
    // NISS (Número de Identificação de Segurança Social) - 11 digits
    niss_pt: {
        pattern: /\b\d{11}\b/g,
        confidence: 'suspicious',
        description: 'Portugal Social Security Number'
    },
    
    // Cartão de Cidadão / BI - Format: 12345678 9 ZZ1
    cc_pt: {
        pattern: /\b\d{8}\s?\d\s?[A-Z]{2}\d\b/g,
        confidence: 'confirmed',
        description: 'Portugal Citizen Card'
    },
    
    // 🇪🇸 SPAIN
    // NIE (Número de Identidad de Extranjero) - X/Y/Z + 7 digits + letter
    nie_es: {
        pattern: /\b[XYZ]\d{7}[A-Z]\b/g,
        confidence: 'confirmed',
        description: 'Spain Foreigner ID (NIE)'
    },
    
    // DNI/NIF (Documento Nacional de Identidad) - 8 digits + letter
    dni_es: {
        pattern: /\b\d{8}[A-Z]\b/g,
        confidence: 'confirmed',
        description: 'Spain National ID (DNI)'
    },
    
    // 🇫🇷 FRANCE
    // INSEE / Numéro de Sécurité Sociale - 15 digits (1 YY MM DD XXX XXX XX)
    insee_fr: {
        pattern: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
        confidence: 'confirmed',
        description: 'France Social Security Number (INSEE)'
    },
    
    // 🇩🇪 GERMANY
    // Steuer-ID (Tax ID) - 11 digits
    steuer_de: {
        pattern: /\b\d{11}\b/g,
        confidence: 'suspicious',
        description: 'Germany Tax ID (Steuer-ID)'
    },
    
    // Sozialversicherungsnummer - Format: 12 digits
    sozial_de: {
        pattern: /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b/g,
        confidence: 'confirmed',
        description: 'Germany Social Insurance Number'
    },
    
    // 🇬🇧 UNITED KINGDOM
    // National Insurance Number - Format: AB123456C
    ni_uk: {
        pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
        confidence: 'confirmed',
        description: 'UK National Insurance Number'
    },
    
    // NHS Number - 10 digits (format: 123 456 7890)
    nhs_uk: {
        pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/g,
        confidence: 'suspicious',
        description: 'UK NHS Number'
    },
    
    // 🇮🇹 ITALY
    // Codice Fiscale - 16 characters (RSSMRA80A01H501U)
    codice_fiscale: {
        pattern: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g,
        confidence: 'confirmed',
        description: 'Italy Tax Code (Codice Fiscale)'
    },
    
    // 🇳🇱 NETHERLANDS
    // BSN (Burgerservicenummer) - 9 digits
    bsn_nl: {
        pattern: /\b\d{9}\b/g,
        confidence: 'suspicious',
        description: 'Netherlands Citizen Service Number (BSN)'
    },
    
    // 🇪🇺 PAN-EUROPEAN
    // VAT Number - Format varies by country (e.g., PT123456789, ES12345678A)
    vat_eu: {
        pattern: /\b[A-Z]{2}\s?[0-9A-Z]{8,12}\b/g,
        confidence: 'suspicious',
        description: 'EU VAT Number'
    },
    
    // IBAN - International Bank Account Number (all EU countries)
    iban: {
        pattern: /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{4}\s?[A-Z0-9]{0,4}\s?[A-Z0-9]{0,4}\s?[A-Z0-9]{0,2}\b/g,
        confidence: 'confirmed',
        description: 'IBAN (Bank Account)'
    },
    
    // European Health Insurance Card - 16 digits
    ehic: {
        pattern: /\b80756\s?\d{11}\b/g,
        confidence: 'confirmed',
        description: 'European Health Insurance Card'
    },
    
    // EU Passport - Format: 2 letters + 7 digits (e.g., PT1234567)
    passport_eu: {
        pattern: /\b[A-Z]{2}\s?[0-9]{6,9}\b/g,
        confidence: 'suspicious',
        description: 'European Passport Number'
    },
    
    // ========================================
    // 🇧🇷 BRAZIL
    // ========================================
    
    // CPF (Cadastro de Pessoas Físicas) - Format: 123.456.789-00 or 12345678900
    cpf: {
        pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
        confidence: 'confirmed',
        description: 'Brazil CPF'
    },
    
    // CNPJ (Cadastro Nacional da Pessoa Jurídica) - Format: 12.345.678/0001-90
    cnpj: {
        pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
        confidence: 'confirmed',
        description: 'Brazil CNPJ'
    },
    
    // ========================================
    // 🇺🇸 UNITED STATES
    // ========================================
    
    // Social Security Number - Format: 123-45-6789
    ssn_us: {
        pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        confidence: 'confirmed',
        description: 'US Social Security Number'
    },
    
    // ========================================
    // 🌍 UNIVERSAL / GLOBAL
    // ========================================
    
    // Credit Card - Format: 4532 1234 5678 9010 (Visa, Mastercard, Amex)
    credit_card: {
        pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b|\b\d{4}\s?\d{6}\s?\d{5}\b/g,
        confidence: 'confirmed',
        description: 'Credit Card Number'
    },
    
    // Email Address - Corporate and personal
    email: {
        pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
        confidence: 'suspicious',
        description: 'Email Address'
    },
    
    // Phone Number - International format (+351, +34, +33, etc)
    phone: {
        pattern: /(\+\d{1,4}\s?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
        confidence: 'suspicious',
        description: 'Phone Number'
    },
    
    // Generic patterns for sensitive keywords
    keywords: {
        pattern: /\b(password|senha|mot de passe|passwort|contraseña|secret|confidential|confidencial|private|privado|ssn|nif|nie|passport|pasaporte|passeport|reisepass)\b/gi,
        confidence: 'suspicious',
        description: 'Sensitive Keywords'
    }
};

// ============================================
// DETECTION CONFIGURATION
// ============================================

const config = {
    // Cooldown between alerts (milliseconds)
    alertCooldown: 2000,
    
    // Debounce delay after user stops typing (milliseconds)
    debounceDelay: 1500,
    
    // Cache duration for detected values (milliseconds)
    cacheExpiration: 5 * 60 * 1000, // 5 minutes
    
    // Backend URL
    backendUrl: 'https://ai-shield-backend-production.up.railway.app'
};

// ============================================
// GLOBAL STATE
// ============================================

let detectionCache = new Map(); // Cache to prevent duplicate detections
let lastAlertTime = 0; // Track last alert timestamp
let debounceTimer = null; // Debounce timer
let isProcessing = false; // Processing flag

// ============================================
// DETECTION FUNCTION
// ============================================

function detectSensitiveData(text) {
    const detections = [];
    const now = Date.now();
    
    // Clean cache of expired entries
    for (const [key, timestamp] of detectionCache.entries()) {
        if (now - timestamp > config.cacheExpiration) {
            detectionCache.delete(key);
        }
    }
    
    // Test each pattern
    for (const [type, config] of Object.entries(sensitivePatterns)) {
        const matches = text.match(config.pattern);
        
        if (matches) {
            for (const match of matches) {
                const cleanMatch = match.trim();
                const cacheKey = `${type}:${cleanMatch}`;
                
                // Skip if already detected recently
                if (detectionCache.has(cacheKey)) {
                    continue;
                }
                
                // Additional validation for specific types
                if (shouldDetect(type, cleanMatch)) {
                    detections.push({
                        type: type.toUpperCase(),
                        value: cleanMatch,
                        confidence: config.confidence,
                        description: config.description,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Add to cache
                    detectionCache.set(cacheKey, now);
                }
            }
        }
    }
    
    return detections;
}

// ============================================
// VALIDATION HELPERS
// ============================================

function shouldDetect(type, value) {
    // Additional validation rules to reduce false positives
    
    // Skip very common number sequences
    const commonSequences = ['11111111', '22222222', '00000000', '12345678', '99999999'];
    if (commonSequences.some(seq => value.includes(seq))) {
        return false;
    }
    
    // Skip dates that might be misdetected
    if (type === 'niss_pt' || type === 'bsn_nl' || type === 'steuer_de') {
        // Additional validation could be added here
        // For now, we keep it as is for maximum detection
    }
    
    // Validate IBAN checksum (optional, adds complexity)
    if (type === 'iban') {
        // Basic length check
        const cleanIban = value.replace(/\s/g, '');
        if (cleanIban.length < 15 || cleanIban.length > 34) {
            return false;
        }
    }
    
    // Validate credit card with Luhn algorithm (optional)
    if (type === 'credit_card') {
        const digits = value.replace(/\s/g, '');
        if (digits.length < 13 || digits.length > 19) {
            return false;
        }
        // Could add Luhn check here for higher confidence
    }
    
    return true;
}

// ============================================
// VISUAL ALERT
// ============================================

function showAlert(detection) {
    // Check cooldown
    const now = Date.now();
    if (now - lastAlertTime < config.alertCooldown) {
        return;
    }
    lastAlertTime = now;
    
    // Remove existing alert
    const existingAlert = document.getElementById('ia-shield-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert
    const alert = document.createElement('div');
    alert.id = 'ia-shield-alert';
    
    // Determine color based on confidence
    const isConfirmed = detection.confidence === 'confirmed';
    const bgColor = isConfirmed 
        ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)' 
        : 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)';
    
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 320px;
        animation: iaShieldSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;

    // Alert content
    const icon = isConfirmed ? '🔴' : '⚠️';
    const title = isConfirmed ? 'SENSITIVE DATA DETECTED' : 'POSSIBLE SENSITIVE DATA';
    
    alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">${icon}</span>
            <div style="flex: 1;">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 16px; font-weight: 700;">${detection.description}</div>
            </div>
        </div>
    `;

    document.body.appendChild(alert);

    // Remove after 4 seconds
    setTimeout(() => {
        alert.style.animation = 'iaShieldSlideOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Add CSS animations
if (!document.getElementById('ia-shield-styles')) {
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
    `;
    document.head.appendChild(style);
}

// ============================================
// BACKEND COMMUNICATION
// ============================================

async function registerUser(userName, userEmail, apiKey) {
    try {
        const response = await fetch(`${config.backendUrl}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                userName: userName,
                userEmail: userEmail
            })
        });
        
        if (response.ok) {
            console.log('✅ User registered successfully');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error registering user:', error);
        return false;
    }
}

async function sendDetectionToBackend(detection, userEmail, apiKey) {
    try {
        const response = await fetch(`${config.backendUrl}/api/detections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                userEmail: userEmail,
                detectionType: detection.type,
                confidenceLevel: detection.confidence,
                aiPlatform: detectAIPlatform(),
                url: window.location.href,
                detectedValue: detection.value
            })
        });
        
        if (response.ok) {
            console.log('✅ Detection saved to backend');
        }
    } catch (error) {
        console.error('Error sending detection:', error);
    }
}

function detectAIPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
    if (hostname.includes('claude.ai')) return 'Claude';
    if (hostname.includes('gemini.google.com')) return 'Gemini';
    if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
    if (hostname.includes('perplexity.ai')) return 'Perplexity';
    if (hostname.includes('mistral.ai')) return 'Mistral';
    if (hostname.includes('huggingface.co')) return 'HuggingFace';
    if (hostname.includes('groq.com')) return 'Groq';
    if (hostname.includes('anthropic.com')) return 'Anthropic';
    
    return 'Unknown AI Platform';
}

// ============================================
// USER INPUT MONITORING
// ============================================

function monitorUserInput() {
    // Monitor all input elements
    const inputSelectors = [
        'input[type="text"]',
        'textarea',
        '[contenteditable="true"]',
        '[role="textbox"]'
    ];
    
    document.querySelectorAll(inputSelectors.join(',')).forEach(element => {
        if (element.dataset.iaShieldMonitored) return;
        element.dataset.iaShieldMonitored = 'true';
        
        element.addEventListener('input', handleInput);
    });
}

async function handleInput(event) {
    if (isProcessing) return;
    
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
        const text = event.target.value || event.target.textContent || event.target.innerText;
        
        if (!text || text.length < 5) return;
        
        isProcessing = true;
        
        // Detect sensitive data
        const detections = detectSensitiveData(text);
        
        if (detections.length > 0) {
            // Show alert for first detection
            showAlert(detections[0]);
            
            // Update counter
            chrome.storage.local.get(['detectionCount', 'userName', 'userEmail', 'apiKey'], async (result) => {
                const currentCount = result.detectionCount || 0;
                const newCount = currentCount + detections.length;
                
                chrome.storage.local.set({ detectionCount: newCount });
                
                // Send to backend if configured
                if (result.apiKey && result.userEmail) {
                    // Register user if first detection
                    if (currentCount === 0 && result.userName) {
                        await registerUser(result.userName, result.userEmail, result.apiKey);
                    }
                    
                    // Send each detection
                    for (const detection of detections) {
                        await sendDetectionToBackend(detection, result.userEmail, result.apiKey);
                    }
                }
                
                // Notify popup if open
                try {
                    if (chrome.runtime?.id) {
                        chrome.runtime.sendMessage({
                            action: 'updateDetectionCount',
                            count: newCount
                        }, () => {
                            if (chrome.runtime.lastError) {
                                // Popup not open, ignore
                            }
                        });
                    }
                } catch (e) {
                    // Extension context invalidated, ignore
                }
            });
        }
        
        isProcessing = false;
    }, config.debounceDelay);
}

// ============================================
// INITIALIZATION
// ============================================

// Monitor existing inputs
monitorUserInput();

// Monitor for new inputs (dynamic content)
const observer = new MutationObserver(() => {
    monitorUserInput();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('🛡️ IA Shield v3.0 - Active (25+ data types, EU focus)');
