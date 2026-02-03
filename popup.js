// Load detection count
chrome.storage.local.get(['detectionCount'], function(result) {
  const count = result.detectionCount || 0;
  document.getElementById('detectionCount').textContent = count;
  
  // Calculate fine prevented (€50,000 per detection)
  const fineValue = count * 50000;
  document.getElementById('finePreventedValue').textContent = '€' + fineValue.toLocaleString();
});

// Load settings
chrome.storage.local.get(['aishield_user_id', 'aishield_company_id'], function(result) {
  if (result.aishield_user_id) {
    document.getElementById('userId').value = result.aishield_user_id;
  }
  if (result.aishield_company_id) {
    document.getElementById('companyId').value = result.aishield_company_id;
  }
});

// Save settings
function saveSettings() {
  const userId = document.getElementById('userId').value;
  const companyId = document.getElementById('companyId').value;
  
  if (!userId || !companyId) {
    alert('Please fill in both fields');
    return;
  }
  
  chrome.storage.local.set({
    'aishield_user_id': userId,
    'aishield_company_id': companyId
  }, function() {
    alert('Settings saved! Your data will now be tracked.');
  });
}

// Reset counter
function resetCounter() {
  if (confirm('Are you sure? This will reset the detection counter.')) {
    chrome.storage.local.set({ detectionCount: 0 }, function() {
      document.getElementById('detectionCount').textContent = '0';
      document.getElementById('finePreventedValue').textContent = '€0';
      alert('Counter reset!');
    });
  }
}

// Update counter every second
setInterval(() => {
  chrome.storage.local.get(['detectionCount'], function(result) {
    const count = result.detectionCount || 0;
    document.getElementById('detectionCount').textContent = count;
    
    const fineValue = count * 50000;
    document.getElementById('finePreventedValue').textContent = '€' + fineValue.toLocaleString();
  });
}, 1000);
