// ============================================
// IA SHIELD - POPUP v3.0
// Compatible with content.js v3.0
// ============================================

// DOM Elements
const detectionCountElement = document.getElementById('detectionCount');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const editBtn = document.getElementById('editBtn');
const configSection = document.getElementById('configSection');
const displaySection = document.getElementById('displaySection');
const displayUserName = document.getElementById('displayUserName');
const displayUserEmail = document.getElementById('displayUserEmail');
const displayApiKey = document.getElementById('displayApiKey');

// Load saved data on popup open
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    updateDetectionCount();
});

// Load saved configuration
function loadSavedData() {
    chrome.storage.local.get(['userName', 'userEmail', 'apiKey', 'detectionCount'], (result) => {
        const userName = result.userName || '';
        const userEmail = result.userEmail || '';
        const apiKey = result.apiKey || '';

        if (userName && userEmail && apiKey) {
            // Show display mode
            displayUserName.textContent = userName;
            displayUserEmail.textContent = userEmail;
            
            // Mask API Key for security (show only first 10 and last 4 chars)
            if (apiKey.length > 14) {
                displayApiKey.textContent = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
            } else {
                displayApiKey.textContent = apiKey;
            }
            
            configSection.style.display = 'none';
            displaySection.style.display = 'block';
        } else {
            // Show configuration mode
            configSection.style.display = 'block';
            displaySection.style.display = 'none';
            
            // Pre-fill if partially saved
            if (userName) userNameInput.value = userName;
            if (userEmail) userEmailInput.value = userEmail;
            if (apiKey) apiKeyInput.value = apiKey;
        }

        // Update counter
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// Update detection count
function updateDetectionCount() {
    chrome.storage.local.get(['detectionCount'], (result) => {
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// Save configuration
saveBtn.addEventListener('click', () => {
    const userName = userNameInput.value.trim();
    const userEmail = userEmailInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    // Validation
    if (!userName) {
        alert('Please enter your name');
        return;
    }

    if (!userEmail) {
        alert('Please enter your email');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
        alert('Please enter a valid email address');
        return;
    }

    if (!apiKey) {
        alert('Please enter your API Key');
        return;
    }

    // API Key validation (basic format check)
    if (!apiKey.startsWith('sk_')) {
        alert('Invalid API Key format. Should start with "sk_"');
        return;
    }

    // Save to storage
    chrome.storage.local.set({
        userName: userName,
        userEmail: userEmail,
        apiKey: apiKey
    }, () => {
        console.log('✅ Configuration saved');
        
        // Update UI
        loadSavedData();
        
        // Show success message briefly
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.style.background = '#27ae60';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
        }, 2000);
    });
});

// Reset configuration
resetBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to clear your configuration?')) {
        return;
    }
    
    userNameInput.value = '';
    userEmailInput.value = '';
    apiKeyInput.value = '';
    
    chrome.storage.local.set({
        userName: '',
        userEmail: '',
        apiKey: ''
    }, () => {
        console.log('✅ Configuration cleared');
        loadSavedData();
    });
});

// Edit configuration
editBtn.addEventListener('click', () => {
    chrome.storage.local.get(['userName', 'userEmail', 'apiKey'], (result) => {
        userNameInput.value = result.userName || '';
        userEmailInput.value = result.userEmail || '';
        apiKeyInput.value = result.apiKey || '';
        
        configSection.style.display = 'block';
        displaySection.style.display = 'none';
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDetectionCount') {
        updateDetectionCount();
    }
});

// Auto-update counter every 2 seconds
setInterval(updateDetectionCount, 2000);
