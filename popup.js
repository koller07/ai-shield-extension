// Load data when popup opens
document.addEventListener('DOMContentLoaded', function() {
  // Retrieve stored data
  chrome.storage.local.get(['detectionCount', 'protectionEnabled'], function(result) {
    const detectionCount = result.detectionCount || 0;
    const protectionEnabled = result.protectionEnabled !== false;
    
    // Update UI
    document.querySelector('.stat-value').textContent = detectionCount;
    
    const toggleSwitch = document.querySelector('.toggle-switch');
    if (protectionEnabled) {
      toggleSwitch.classList.remove('off');
    } else {
      toggleSwitch.classList.add('off');
    }
  });
});

// Report button
document.querySelectorAll('button')[0].addEventListener('click', function() {
  alert('Full report coming soon!');
});

// Settings button
document.querySelectorAll('button')[1].addEventListener('click', function() {
  alert('Settings coming soon!');
});

// Protection toggle
document.querySelector('.toggle-switch').addEventListener('click', function() {
  this.classList.toggle('off');
  
  const isEnabled = !this.classList.contains('off');
  chrome.storage.local.set({ protectionEnabled: isEnabled });
  
  alert(isEnabled ? 'Protection enabled' : 'Protection disabled');
});

// Receive messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'dataSensitiveDetected') {
    // Increment counter
    chrome.storage.local.get(['detectionCount'], function(result) {
      const newCount = (result.detectionCount || 0) + 1;
      chrome.storage.local.set({ detectionCount: newCount });
      
      // Update UI
      document.querySelector('.stat-value').textContent = newCount;
    });
  }
});
