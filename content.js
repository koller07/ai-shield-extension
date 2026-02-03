// ============================================
// AI-SHIELD CONTENT SCRIPT
// Detects sensitive data and sends to backend
// ============================================

// Patterns for detecting sensitive data
const sensitivePatterns = {
  cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
  nif: /\d{9}/g,
  creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\(\d{2}\)\s?\d{4,5}-\d{4}/g,
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{1,30}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  keywords: /(confidential|secret|private|password|card|cpf|nif|iban|ssn|social security|medical|diagnosis|treatment)/gi
};

// Function to detect sensitive data
function detectSensitiveData(text) {
  let detections = [];
  
  if (sensitivePatterns.cpf.test(text)) {
    detections.push('CPF');
    sensitivePatterns.cpf.lastIndex = 0;
  }
  if (sensitivePatterns.nif.test(text)) {
    detections.push('NIF');
    sensitivePatterns.nif.lastIndex = 0;
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
  if (sensitivePatterns.ssn.test(text)) {
    detections.push('SSN');
    sensitivePatterns.ssn.lastIndex = 0;
  }
  if (sensitivePatterns.keywords.test(text)) {
    detections.push('Sensitive keyword');
    sensitivePatterns.keywords.lastIndex = 0;
  }
  
  return detections;
}

// Get user ID from localStorage (set by popup)
function getUserId() {
  return localStorage.getItem('aishield_user_id') || 'anonymous';
}

// Get company ID from localStorage (set by popup)
function getCompanyId() {
  return localStorage.getItem('aishield_company_id') || 'unknown';
}

// Send detection to backend
function sendDetectionToBackend(detectionType, aiPlatform) {
  const backendUrl = 'https://api.aishield.eu/api/detection'; // Change to your backend URL
  
  try {
    fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: getUserId( ),
        companyId: getCompanyId(),
        detectionType: detectionType,
        aiPlatform: aiPlatform,
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      console.log('AI-Shield: Could not send to backend', error);
    });
  } catch (error) {
    console.log('AI-Shield: Error sending detection', error);
  }
}

// Monitor text fields
document.addEventListener('input', function(e) {
  if (e.target.tagName === 'TEXTAREA' || 
      (e.target.tagName === 'INPUT' && e.target.type === 'text') ||
      e.target.contentEditable === 'true') {
    
    const text = e.target.value || e.target.textContent;
    const detections = detectSensitiveData(text);
    
    if (detections.length > 0) {
      // Show visual alert
      showAlert(detections);
      
      // Send to backend
      detections.forEach(detection => {
        sendDetectionToBackend(detection, window.location.hostname);
      });
      
      // Update counter in popup
      updateDetectionCounter();
    }
  }
}, true);

// Function to show alert
function showAlert(detections) {
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

// Update detection counter
function updateDetectionCounter() {
  chrome.storage.local.get(['detectionCount'], function(result) {
    const newCount = (result.detectionCount || 0) + 1;
    chrome.storage.local.set({ detectionCount: newCount });
  });
}

console.log('AI-Shield: Content script loaded successfully');
