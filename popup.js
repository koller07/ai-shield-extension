// Carregar dados quando o popup abre
document.addEventListener('DOMContentLoaded', function() {
  // Recuperar dados armazenados
  chrome.storage.local.get(['detectionCount', 'protectionEnabled'], function(result) {
    const detectionCount = result.detectionCount || 0;
    const protectionEnabled = result.protectionEnabled !== false;
    
    // Atualizar UI
    document.querySelector('.stat-value').textContent = detectionCount;
    
    const toggleSwitch = document.querySelector('.toggle-switch');
    if (protectionEnabled) {
      toggleSwitch.classList.remove('off');
    } else {
      toggleSwitch.classList.add('off');
    }
  });
});

// Botão de Relatório
document.querySelectorAll('button')[0].addEventListener('click', function() {
  alert('Relatório completo em breve!');
});

// Botão de Configurações
document.querySelectorAll('button')[1].addEventListener('click', function() {
  alert('Configurações em breve!');
});

// Toggle de Proteção
document.querySelector('.toggle-switch').addEventListener('click', function() {
  this.classList.toggle('off');
  
  const isEnabled = !this.classList.contains('off');
  chrome.storage.local.set({ protectionEnabled: isEnabled });
  
  alert(isEnabled ? 'Proteção ativada' : 'Proteção desativada');
});

// Receber mensagens do content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'dataSensitiveDetected') {
    // Incrementar contador
    chrome.storage.local.get(['detectionCount'], function(result) {
      const newCount = (result.detectionCount || 0) + 1;
      chrome.storage.local.set({ detectionCount: newCount });
      
      // Atualizar UI
      document.querySelector('.stat-value').textContent = newCount;
    });
  }
});
