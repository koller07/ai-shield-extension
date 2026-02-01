// AI-Shield Content Script
// Monitora campos de texto e detecta PII em tempo real

class AIShield {
  constructor() {
    this.patterns = {
      // Estados Unidos
      ssn: {
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        name: 'SSN (Social Security Number)',
        region: 'USA',
        severity: 'high'
      },
      
      // Europa - Passaporte genérico
      passport: {
        regex: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
        name: 'Passaporte',
        region: 'EU',
        severity: 'high'
      },
      
      // Alemanha - Steuer-ID
      germanTaxId: {
        regex: /\b\d{11}\b/g,
        name: 'Steuer-ID (Alemanha)',
        region: 'DE',
        severity: 'high'
      },
      
      // França - NIR (Numéro de sécurité sociale)
      frenchNIR: {
        regex: /\b[12]\s?\d{2}\s?(0[1-9]|1[0-2])\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
        name: 'NIR (França)',
        region: 'FR',
        severity: 'high'
      },
      
      // Reino Unido - National Insurance Number
      ukNIN: {
        regex: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
        name: 'National Insurance Number (UK)',
        region: 'UK',
        severity: 'high'
      },
      
      // Cartões de crédito (formato genérico)
      creditCard: {
        regex: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
        name: 'Cartão de Crédito',
        region: 'Global',
        severity: 'critical'
      },
      
      // E-mail
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        name: 'E-mail',
        region: 'Global',
        severity: 'medium'
      },
      
      // Telefones internacionais
      phone: {
        regex: /\b(\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}\b/g,
        name: 'Telefone',
        region: 'Global',
        severity: 'medium'
      },
      
      // Palavras-chave sensíveis
      sensitiveKeywords: {
        regex: /\b(confidential|private|secret|password|api[_-]?key|token|credential|senha|contraseña)\b/gi,
        name: 'Palavras-chave sensíveis',
        region: 'Global',
        severity: 'high'
      }
    };

    this.detectedPII = [];
    this.isBlocked = false;
    this.settings = {
      enabled: true,
      blockSubmit: true,
      showWarnings: true
    };
    
    this.init();
  }

  async init() {
    // Carrega configurações
    await this.loadSettings();
    
    // Aguarda o DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['aiShieldSettings']);
      if (result.aiShieldSettings) {
        this.settings = { ...this.settings, ...result.aiShieldSettings };
      }
    } catch (error) {
      console.error('AI-Shield: Erro ao carregar configurações', error);
    }
  }

  start() {
    if (!this.settings.enabled) return;

    console.log('AI-Shield: Iniciado');
    
    // Monitora mudanças no DOM
    this.observeDOM();
    
    // Monitora inputs existentes
    this.monitorInputs();
    
    // Cria interface de alerta
    this.createAlertUI();
  }

  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      this.monitorInputs();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  monitorInputs() {
    // Seleciona diferentes tipos de campos de entrada baseado no site
    const selectors = [
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
      'div[role="textbox"]'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (!element.dataset.aiShieldMonitored) {
          element.dataset.aiShieldMonitored = 'true';
          element.addEventListener('input', (e) => this.handleInput(e));
          element.addEventListener('paste', (e) => this.handleInput(e));
        }
      });
    });

    // Monitora botões de envio
    this.monitorSubmitButtons();
  }

  handleInput(event) {
    const text = event.target.value || event.target.textContent || '';
    
    if (text.length === 0) {
      this.clearDetections();
      return;
    }

    this.detectPII(text);
  }

  detectPII(text) {
    this.detectedPII = [];

    Object.entries(this.patterns).forEach(([key, pattern]) => {
      const matches = text.match(pattern.regex);
      
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          this.detectedPII.push({
            type: key,
            value: match,
            name: pattern.name,
            region: pattern.region,
            severity: pattern.severity,
            suggestion: this.getSuggestion(key, match)
          });
        });
      }
    });

    if (this.detectedPII.length > 0) {
      this.handlePIIDetection();
    } else {
      this.clearDetections();
    }
  }

  getSuggestion(type, value) {
    const suggestions = {
      ssn: '***-**-****',
      passport: '[PASSAPORTE]',
      germanTaxId: '[STEUER-ID]',
      frenchNIR: '[NIR]',
      ukNIN: '[NI NUMBER]',
      creditCard: '**** **** **** ****',
      email: '[EMAIL]',
      phone: '[TELEFONE]',
      sensitiveKeywords: '[REDACTED]'
    };

    return suggestions[type] || '[DADOS SENSÍVEIS]';
  }

  handlePIIDetection() {
    // Bloqueia botões de envio
    if (this.settings.blockSubmit) {
      this.blockSubmitButtons();
    }

    // Exibe alerta
    if (this.settings.showWarnings) {
      this.showAlert();
    }

    // Salva log localmente
    this.saveLog();
  }

  monitorSubmitButtons() {
    const buttonSelectors = [
      'button[type="submit"]',
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Enviar"]',
      'button:has(svg)', // Botões com ícones
      '[data-testid="send-button"]',
      '.send-button'
    ];

    buttonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (!button.dataset.aiShieldMonitored) {
          button.dataset.aiShieldMonitored = 'true';
          button.dataset.originalDisabled = button.disabled;
        }
      });
    });
  }

  blockSubmitButtons() {
    const buttonSelectors = [
      'button[type="submit"]',
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Enviar"]',
      'button:has(svg)',
      '[data-testid="send-button"]',
      '.send-button'
    ];

    buttonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.title = 'AI-Shield: PII detectado - Remova dados sensíveis';
      });
    });

    this.isBlocked = true;
  }

  unblockSubmitButtons() {
    const buttonSelectors = [
      'button[type="submit"]',
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Enviar"]',
      'button:has(svg)',
      '[data-testid="send-button"]',
      '.send-button'
    ];

    buttonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (button.dataset.aiShieldMonitored) {
          button.disabled = button.dataset.originalDisabled === 'true';
          button.style.opacity = '';
          button.style.cursor = '';
          button.title = '';
        }
      });
    });

    this.isBlocked = false;
  }

  createAlertUI() {
    if (document.getElementById('ai-shield-alert')) return;

    const alertContainer = document.createElement('div');
    alertContainer.id = 'ai-shield-alert';
    alertContainer.className = 'ai-shield-alert hidden';
    alertContainer.innerHTML = `
      <div class="ai-shield-alert-header">
        <span class="ai-shield-icon">🛡️</span>
        <h3>AI-Shield: PII Detectado</h3>
        <button class="ai-shield-close" id="ai-shield-close-btn">×</button>
      </div>
      <div class="ai-shield-alert-body">
        <p class="ai-shield-warning">
          ⚠️ Dados pessoais identificáveis foram detectados em sua mensagem.
        </p>
        <div id="ai-shield-detections"></div>
        <div class="ai-shield-compliance">
          <strong>Compliance:</strong> GDPR (EU), CCPA (USA), EU AI Act
        </div>
        <div class="ai-shield-actions">
          <button class="ai-shield-btn ai-shield-btn-primary" id="ai-shield-anonymize-btn">
            Anonimizar Dados
          </button>
          <button class="ai-shield-btn ai-shield-btn-secondary" id="ai-shield-dismiss-btn">
            Revisar Manualmente
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(alertContainer);

    // Event listeners
    document.getElementById('ai-shield-close-btn').addEventListener('click', () => {
      this.hideAlert();
    });

    document.getElementById('ai-shield-dismiss-btn').addEventListener('click', () => {
      this.hideAlert();
    });

    document.getElementById('ai-shield-anonymize-btn').addEventListener('click', () => {
      this.anonymizeData();
    });
  }

  showAlert() {
    const alert = document.getElementById('ai-shield-alert');
    const detectionsDiv = document.getElementById('ai-shield-detections');
    
    if (!alert || !detectionsDiv) return;

    // Agrupa detecções por tipo
    const grouped = {};
    this.detectedPII.forEach(pii => {
      if (!grouped[pii.name]) {
        grouped[pii.name] = [];
      }
      grouped[pii.name].push(pii);
    });

    // Gera HTML das detecções
    let html = '<ul class="ai-shield-detection-list">';
    Object.entries(grouped).forEach(([name, items]) => {
      const severityClass = items[0].severity;
      html += `
        <li class="ai-shield-detection-item severity-${severityClass}">
          <strong>${name}</strong> (${items[0].region})
          <span class="ai-shield-count">${items.length}x</span>
          <div class="ai-shield-examples">
            ${items.slice(0, 3).map(item => 
              `<code>${this.maskValue(item.value)}</code>`
            ).join(' ')}
            ${items.length > 3 ? `<span>+${items.length - 3} mais</span>` : ''}
          </div>
        </li>
      `;
    });
    html += '</ul>';

    detectionsDiv.innerHTML = html;
    alert.classList.remove('hidden');
  }

  hideAlert() {
    const alert = document.getElementById('ai-shield-alert');
    if (alert) {
      alert.classList.add('hidden');
    }
  }

  maskValue(value) {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    const visible = Math.min(2, Math.floor(value.length * 0.2));
    return value.substring(0, visible) + '*'.repeat(value.length - visible * 2) + value.substring(value.length - visible);
  }

  anonymizeData() {
    const textFields = document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"], div[role="textbox"]');
    
    textFields.forEach(field => {
      let text = field.value || field.textContent || '';
      
      // Substitui cada PII detectado pela sugestão
      this.detectedPII.forEach(pii => {
        text = text.replace(pii.value, pii.suggestion);
      });

      if (field.value !== undefined) {
        field.value = text;
      } else {
        field.textContent = text;
      }

      // Dispara evento de input para atualizar o estado
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });

    this.hideAlert();
    this.clearDetections();
  }

  clearDetections() {
    this.detectedPII = [];
    this.hideAlert();
    
    if (this.isBlocked) {
      this.unblockSubmitButtons();
    }
  }

  async saveLog() {
    try {
      const timestamp = new Date().toISOString();
      const log = {
        timestamp,
        url: window.location.href,
        detections: this.detectedPII.map(pii => ({
          type: pii.name,
          region: pii.region,
          severity: pii.severity,
          masked: this.maskValue(pii.value)
        }))
      };

      // Recupera logs existentes
      const result = await chrome.storage.local.get(['aiShieldLogs']);
      const logs = result.aiShieldLogs || [];
      
      // Adiciona novo log (mantém últimos 100)
      logs.unshift(log);
      if (logs.length > 100) {
        logs.pop();
      }

      await chrome.storage.local.set({ aiShieldLogs: logs });
    } catch (error) {
      console.error('AI-Shield: Erro ao salvar log', error);
    }
  }
}

// Inicializa AI-Shield
const aiShield = new AIShield();
