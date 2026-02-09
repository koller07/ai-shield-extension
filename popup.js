// ============================================
// IA SHIELD - POPUP SCRIPT
// Manages extension configuration and stats
// By Koller Group
// ============================================

// DOM Elements
const confirmedCountEl = document.getElementById('confirmedCount');
const suspiciousCountEl = document.getElementById('suspiciousCount');
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

// Load data on popup open
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    updateCounts();
});

// Load saved configuration
function loadSavedData() {
    chrome.storage.local.get(['apiKey', 'userName', 'userEmail', 'confirmedCount', 'suspiciousCount'], (result) => {
        const { apiKey, userName, userEmail } = result;

        if (apiKey && userEmail) {
            // Show display mode
            displayUserName.textContent = userName || userEmail;
            displayUserEmail.textContent = userEmail;
            configSection.style.display = 'none';
            displaySection.style.display = 'block';
        } else {
            // Show configuration mode
            configSection.style.display = 'block';
            displaySection.style.display = 'none';
            if (userName) userNameInput.value = userName;
            if (userEmail) userEmailInput.value = userEmail;
            if (apiKey) apiKeyInput.value = apiKey;
        }

        // Update counters
        confirmedCountEl.textContent = result.confirmedCount || 0;
        suspiciousCountEl.textContent = result.suspiciousCount || 0;
    });
}

// Update detection counters
function updateCounts() {
    chrome.storage.local.get(['confirmedCount', 'suspiciousCount'], (result) => {
        confirmedCountEl.textContent = result.confirmedCount || 0;
        suspiciousCountEl.textContent = result.suspiciousCount || 0;
    });
}

// Save configuration
saveBtn.addEventListener('click', () => {
    const userName = userNameInput.value.trim();
    const userEmail = userEmailInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    // Validation
    if (!userName || !userEmail || !apiKey) {
        alert('Please fill in all fields');
        return;
    }

    if (!isValidEmail(userEmail)) {
        alert('Please enter a valid email address');
        return;
    }

    if (!apiKey.startsWith('sk_')) {
        alert('Invalid API Key format. It should start with "sk_"');
        return;
    }

    // Save to storage
    chrome.storage.local.set({
        userName: userName,
        userEmail: userEmail,
        apiKey: apiKey,
        registered: false // Will register on first detection
    }, () => {
        // Update UI
        loadSavedData();
        
        // Show success message
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#00ff88';
        
        setTimeout(() => {
            saveBtn.textContent = 'Save & Activate';
            saveBtn.style.background = '';
        }, 2000);
    });
});

// Reset configuration
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all configuration?')) {
        userNameInput.value = '';
        userEmailInput.value = '';
        apiKeyInput.value = '';
        
        chrome.storage.local.set({
            userName: '',
            userEmail: '',
            apiKey: '',
            registered: false
        }, () => {
            loadSavedData();
        });
    }
});

// Edit configuration
editBtn.addEventListener('click', () => {
    configSection.style.display = 'block';
    displaySection.style.display = 'none';
    userNameInput.value = displayUserName.textContent;
    userEmailInput.value = displayUserEmail.textContent;
    
    chrome.storage.local.get(['apiKey'], (result) => {
        apiKeyInput.value = result.apiKey || '';
    });
});

// Listen for updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateCounts') {
        confirmedCountEl.textContent = request.confirmed;
        suspiciousCountEl.textContent = request.suspicious;
    }
});

// Auto-update counters every 2 seconds
setInterval(updateCounts, 2000);

// Email validation
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
