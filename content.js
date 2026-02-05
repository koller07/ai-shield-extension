// ============================================
// AI-SHIELD CONTENT SCRIPT
// Detects sensitive data in AI platforms
// Sends to backend for logging
// ============================================

// Configuration
const BACKEND_URL = 'https://ai-shield-backend-production.up.railway.app';
const COMPANY_ID = localStorage.getItem('ai-shield-company-id' ) || 'default-company';
const USER_ID = localStorage.getItem('ai-shield-user-id') || 'anonymous-' + Math.random().toString(36).substr(2, 9);

// Sensitive data patterns
const DETECTION_PATTERNS = {
  // CPF (Portuguese)
  'CPF': /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
  
  // IBAN (European)
  'IBAN': /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
  
  // Credit Card
  'CREDIT_CARD': /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // Email
  'EMAIL': /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone (International)
  'PHONE': /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  
  // Social Security Number (US)
  'SSN': /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Keywords (Confidential, Secret, etc)
  'SENSITIVE_KEYWORD': /\b(confidential|secret|password|api.?key|token|private|classified)\b/gi
};

// Store detections count
let detectionsCount = 0;

// Listen for text input in contenteditable elements
document.addEventListener('input', (event) => {
  const target = event.target;
  
  // Check if it's a text input area
  if (target.contentEditable === 'true' || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
    const text = target.textContent || target.value;
    
    // Check for sensitive data
    const detections = detectSensitiveData(text);
    
    if (detections.length > 0) {
      // Show visual alert
      showAlert(detections);
      
      // Send to backend
      sendDetectionToBackend(detections);
      
      // Update counter
      detectionsCount += detections.length;
      updateBadge();
    }
  }
}, true);

// Detect sensitive data
function detectSensitiveData(text) {
  const detections = [];
  
  for (const [type, pattern] of Object.entries(DETECTION_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      detections.push({
        type: type,
        count: matches.length,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return detections;
}

// Show visual alert
function showAlert(detections) {
  // Remove existing alert
  const existingAlert = document.getElementById('ai-shield-alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // Create alert element
  const alert = document.createElement('div');
  alert.id = 'ai-shield-alert';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #dc2626;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    max-width: 300px;
  `;
  
  const detectionList = detections.map(d => `${d.type} (${d.count})`).join(', ');
  alert.innerHTML = `
    <strong>⚠️ SENSITIVE DATA DETECTED</strong>  

    <small>${detectionList}</small>
  `;
  
  document.body.appendChild(alert);
  
  // Remove after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Send detection to backend
async function sendDetectionToBackend(detections) {
  try {
    for (const detection of detections) {
      const response = await fetch(`${BACKEND_URL}/api/detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: USER_ID,
          companyId: COMPANY_ID,
          detectionType: detection.type,
          aiPlatform: getAIPlatform(),
          timestamp: detection.timestamp
        })
      });
      
      if (response.ok) {
        console.log('AI-Shield: Detection sent to backend');
      } else {
        console.error('AI-Shield: Failed to send detection');
      }
    }
  } catch (error) {
    console.error('AI-Shield: Backend connection error', error);
  }
}

// Get current AI platform
function getAIPlatform() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('chatgpt')) return 'ChatGPT';
  if (hostname.includes('claude')) return 'Claude';
  if (hostname.includes('gemini')) return 'Gemini';
  if (hostname.includes('copilot')) return 'Copilot';
  if (hostname.includes('perplexity')) return 'Perplexity';
  if (hostname.includes('mistral')) return 'Mistral';
  if (hostname.includes('huggingface')) return 'Hugging Face';
  if (hostname.includes('groq')) return 'Groq';
  if (hostname.includes('llama')) return 'Llama';
  
  return 'Unknown AI';
}

// Update badge with detection count
function updateBadge() {
  chrome.runtime.sendMessage({
    action: 'updateBadge',
    count: detectionsCount
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('AI-Shield: Badge update error (normal if popup closed)');
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCount') {
    sendResponse({ count: detectionsCount });
  }
  if (request.action === 'resetCount') {
    detectionsCount = 0;
    sendResponse({ success: true });
  }
});

console.log('AI-Shield: Content script loaded');
