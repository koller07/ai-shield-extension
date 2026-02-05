// ============================================
// AI-SHIELD POPUP SCRIPT
// Displays detection statistics
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Get detection count from content script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getCount'}, (response) => {
      if (response && response.count) {
        document.getElementById('count').textContent = response.count;
      }
    });
  });
  
  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'resetCount'}, (response) => {
        if (response && response.success) {
          document.getElementById('count').textContent = '0';
        }
      });
    });
  });
  
  // Company ID input
  const companyIdInput = document.getElementById('companyId');
  const savedCompanyId = localStorage.getItem('ai-shield-company-id');
  if (savedCompanyId) {
    companyIdInput.value = savedCompanyId;
  }
  
  companyIdInput.addEventListener('change', () => {
    localStorage.setItem('ai-shield-company-id', companyIdInput.value);
  });
  
  // User ID input
  const userIdInput = document.getElementById('userId');
  const savedUserId = localStorage.getItem('ai-shield-user-id');
  if (savedUserId) {
    userIdInput.value = savedUserId;
  }
  
  userIdInput.addEventListener('change', () => {
    localStorage.setItem('ai-shield-user-id', userIdInput.value);
  });
});
