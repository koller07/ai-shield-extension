// Patterns for detecting sensitive data
const sensitivePatterns = {
  cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
  creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\(\d{2}\)\s?\d{4,5}-\d{4}/g,
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{1,30}/g,
  keywords: /(confidential|secret|private|password|card|cpf|nif|iban|ssn|social security)/gi
};

// Function to detect sensitive data
function detectSensitiveData(text) {
  let detections = [];
  
  if (sensitivePatterns.cpf.test(text)) {
    detections.push('CPF');
    sensitivePatterns.cpf.lastIndex = 0;
  }
  if (sensitivePatterns.creditCard.test(text)) {
    detections.push('Credit Card');
    sensitivePatterns.creditCard.lastIndex = 0;
  }
  if (sensitivePatterns.email.test(text)) {
    detections.push('Email');
    sensitivePatterns.email.lastIndex = 0;
  }
  if (sensitivePatterns.phone.test(text)) {
    detections.push('Phone');
    sensitivePatterns.phone.lastIndex = 0;
  }
  if (sensitivePatterns.iban.test(text)) {
    detections.push('IBAN');
    sensitivePatterns.iban.lastIndex = 0;
  }
  if (sensitivePatterns.keywords.test(text)) {
    detections.push('Sensitive keyword');
    sensitivePatterns.keywords.lastIndex = 0;
  }
  
  return detections;
}

// Monitor text fields
document.addEventListener('input', function(e) {
  if (e.target.tagName === 'TEXTAREA' || 
      (e.target.tagName === 'INPUT' && e.target.type === 'text') ||
      e.target.contentEditable === 'true') {
    
    const text = e.target.value || e.target.textContent;
    const detections = detectSensitiveData(text);
    
    if (detections.length > 0) {
      // Send message to popup
      chrome.runtime.sendMessage({
        action: 'dataSensitiveDetected',
        detections: detections,
        text: text.substring(0, 100)
      });
      
      // Show visual alert
      showAlert(detections);
    }
  }
}, true);

// Function to show alert
function showAlert(detections) {
  // Remove previous alert if exists
  const existingAlert = document.getElementById('ai-shield-alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // Create new alert
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
    <strong>⚠️ SENSITIVE DATA DETECTED</strong>  

    ${detections.join(', ')}
  `;
  
  document.body.appendChild(alert);
  
  // Remove alert after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Add animation CSS
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

// Debug log
console.log('AI-Shield: Content script loaded successfully');
