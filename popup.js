// AI-Shield Popup Script

class PopupController {
  constructor() {
    this.settings = {
      enabled: true,
      blockSubmit: true,
      showWarnings: true
    };
    this.logs = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadLogs();
    this.setupEventListeners();
    this.updateUI();
    this.displayStats();
    this.displayRecentActivity();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['aiShieldSettings']);
      if (result.aiShieldSettings) {
        this.settings = { ...this.settings, ...result.aiShieldSettings };
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  async loadLogs() {
    try {
      const result = await chrome.storage.local.get(['aiShieldLogs']);
      this.logs = result.aiShieldLogs || [];
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  }

  setupEventListeners() {
    // Toggle switches
    document.getElementById('toggle-enabled').addEventListener('change', (e) => {
      this.updateSetting('enabled', e.target.checked);
    });

    document.getElementById('toggle-block-submit').addEventListener('change', (e) => {
      this.updateSetting('blockSubmit', e.target.checked);
    });

    document.getElementById('toggle-show-warnings').addEventListener('change', (e) => {
      this.updateSetting('showWarnings', e.target.checked);
    });

    // Buttons
    document.getElementById('clear-logs-btn').addEventListener('click', () => {
      this.clearLogs();
    });

    document.getElementById('export-logs-btn').addEventListener('click', () => {
      this.exportLogs();
    });
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      await chrome.storage.sync.set({ aiShieldSettings: this.settings });
      this.updateUI();
      
      // Notifica content script para recarregar configurações
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsUpdated', 
          settings: this.settings 
        }).catch(() => {
          // Ignora erro se content script não está carregado
        });
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }
  }

  updateUI() {
    // Atualiza checkboxes
    document.getElementById('toggle-enabled').checked = this.settings.enabled;
    document.getElementById('toggle-block-submit').checked = this.settings.blockSubmit;
    document.getElementById('toggle-show-warnings').checked = this.settings.showWarnings;

    // Atualiza status
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    if (this.settings.enabled) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Proteção Ativa';
      statusText.style.color = '#10b981';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Proteção Desativada';
      statusText.style.color = '#ef4444';
    }
  }

  displayStats() {
    const totalDetections = this.logs.reduce((sum, log) => 
      sum + (log.detections?.length || 0), 0
    );

    const today = new Date().toDateString();
    const todayDetections = this.logs
      .filter(log => new Date(log.timestamp).toDateString() === today)
      .reduce((sum, log) => sum + (log.detections?.length || 0), 0);

    document.getElementById('total-detections').textContent = totalDetections;
    document.getElementById('today-detections').textContent = todayDetections;
  }

  displayRecentActivity() {
    const container = document.getElementById('recent-logs');
    
    if (this.logs.length === 0) {
      container.innerHTML = '<p class="no-logs">Nenhuma detecção registrada</p>';
      return;
    }

    const recentLogs = this.logs.slice(0, 5);
    let html = '';

    recentLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const timeStr = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const dateStr = date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      });

      const site = this.getSiteName(log.url);
      const detectionCount = log.detections?.length || 0;
      const severityClass = this.getMaxSeverity(log.detections);

      html += `
        <div class="log-item severity-${severityClass}">
          <div class="log-header">
            <span class="log-site">${site}</span>
            <span class="log-time">${timeStr} · ${dateStr}</span>
          </div>
          <div class="log-detections">
            <strong>${detectionCount}</strong> ${detectionCount === 1 ? 'detecção' : 'detecções'}
            ${this.formatDetections(log.detections)}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  getSiteName(url) {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
        return '💬 ChatGPT';
      } else if (hostname.includes('claude.ai')) {
        return '🤖 Claude';
      } else if (hostname.includes('gemini.google.com')) {
        return '✨ Gemini';
      }
      return hostname;
    } catch {
      return 'Desconhecido';
    }
  }

  getMaxSeverity(detections) {
    if (!detections || detections.length === 0) return 'low';
    
    const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    const maxSeverity = detections.reduce((max, d) => {
      const current = severityOrder[d.severity] || 0;
      return current > max ? current : max;
    }, 0);

    return Object.keys(severityOrder).find(key => severityOrder[key] === maxSeverity) || 'low';
  }

  formatDetections(detections) {
    if (!detections || detections.length === 0) return '';
    
    const types = [...new Set(detections.map(d => d.type))];
    const preview = types.slice(0, 2).join(', ');
    const more = types.length > 2 ? ` +${types.length - 2}` : '';
    
    return `<div class="log-types">${preview}${more}</div>`;
  }

  async clearLogs() {
    if (confirm('Tem certeza que deseja limpar todos os logs?')) {
      try {
        await chrome.storage.local.set({ aiShieldLogs: [] });
        this.logs = [];
        this.displayStats();
        this.displayRecentActivity();
        alert('Logs limpos com sucesso!');
      } catch (error) {
        console.error('Erro ao limpar logs:', error);
        alert('Erro ao limpar logs.');
      }
    }
  }

  exportLogs() {
    if (this.logs.length === 0) {
      alert('Não há logs para exportar.');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      totalLogs: this.logs.length,
      logs: this.logs.map(log => ({
        timestamp: log.timestamp,
        url: this.anonymizeUrl(log.url),
        detections: log.detections?.map(d => ({
          type: d.type,
          region: d.region,
          severity: d.severity
          // Não inclui o valor mascarado para maior privacidade
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-shield-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  anonymizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return 'URL inválida';
    }
  }
}

// Inicializa popup quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
