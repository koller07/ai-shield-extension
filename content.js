// Padrões de detecção de dados sensíveis
const sensitivePatterns = {
  cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
  creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\(\d{2}\)\s?\d{4,5}-\d{4}/g,
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{1,30}/g,
  keywords: /(confidencial|segredo|privado|senha|cartão|cpf|nif|iban)/gi
};

// Função para detectar dados sensíveis
function detectSensitiveData(text) {
  let detections = [];
  
  if (sensitivePatterns.cpf.test(text)) {
    detections.push('CPF');
    sensitivePatterns.cpf.lastIndex = 0;
  }
  if (sensitivePatterns.creditCard.test(text)) {
    detections.push('Cartão de Crédito');
    sensitivePatterns.creditCard.lastIndex = 0;
  }
  if (sensitivePatterns.email.test(text)) {
    detections.push('E-mail');
    sensitivePatterns.email.lastIndex = 0;
  }
  if (sensitivePatterns.phone.test(text)) {
    detections.push('Telefone');
    sensitivePatterns.phone.lastIndex = 0;
  }
  if (sensitivePatterns.iban.test(text)) {
    detections.push('IBAN');
    sensitivePatterns.iban.lastIndex = 0;
  }
  if (sensitivePatterns.keywords.test(text)) {
    detections.push('Palavra-chave sensível');
    sensitivePatterns.keywords.lastIndex = 0;
  }
  
  return detections;
}

// Monitorar campos de texto
document.addEventListener('input', function(e) {
  if (e.target.tagName === 'TEXTAREA' || 
      (e.target.tagName === 'INPUT' && e.target.type === 'text') ||
      e.target.contentEditable === 'true') {
    
    const text = e.target.value || e.target.textContent;
    const detections = detectSensitiveData(text);
    
    if (detections.length > 0) {
      // Enviar mensagem para o popup
      chrome.runtime.sendMessage({
        action: 'dataSensitiveDetected',
        detections: detections,
        text: text.substring(0, 100) // Primeiros 100 caracteres
      });
      
      // Mostrar alerta visual
      showAlert(detections);
    }
  }
}, true);

// Função para mostrar alerta
function showAlert(detections) {
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
    background-color: #ff6b6b;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  alert.innerHTML = `
    <strong>⚠️ DADO SENSÍVEL DETECTADO</strong>  

    ${detections.join(', ')}
  `;
  
  document.body.appendChild(alert);
  
  // Remover alerta após 5 segundos
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Adicionar animação CSS
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
`;
document.head.appendChild(style);

// Log para debug
console.log('AI-Shield: Content script carregado com sucesso');
