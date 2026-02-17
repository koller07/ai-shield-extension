// ============================================
// IA SHIELD - POPUP SCRIPT v3.0
// By Koller Group
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
            displayApiKey.textContent = maskApiKey(apiKey);
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

        // Update counter
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// Mask API Key for display
function maskApiKey(key) {
    if (key.length <= 12) return '••••••••••••';
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
}

// Update detection count
function updateDetectionCount() {
    chrome.storage.local.get(['detectionCount'], (result) => {
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// Save configuration
saveBtn.addEventListener('click', async () => {
    const userName = userNameInput.value.trim();
    const userEmail = userEmailInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    // Validation
    if (!userName || !userEmail || !apiKey) {
        alert('Please fill in all fields');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
        alert('Please enter a valid email address');
        return;
    }

    // Validate API Key format (should start with sk_)
    if (!apiKey.startsWith('sk_')) {
        const confirm = window.confirm('API Key should start with "sk_". Continue anyway?');
        if (!confirm) return;
    }

    // Show loading state
    saveBtn.textContent = 'Validating...';
    saveBtn.disabled = true;

    // Test API Key with backend
    const isValid = await testApiKey(apiKey, userEmail);

    if (isValid) {
        // Save to storage
        chrome.storage.local.set({
            userName: userName,
            userEmail: userEmail,
            apiKey: apiKey
        }, () => {
            saveBtn.textContent = '✓ Saved';
            setTimeout(() => {
                saveBtn.textContent = 'Save Configuration';
                saveBtn.disabled = false;
                loadSavedData();
            }, 1000);
        });
    } else {
        alert('Invalid API Key or connection error. Please check and try again.');
        saveBtn.textContent = 'Save Configuration';
        saveBtn.disabled = false;
    }
});

// Test API Key with backend
async function testApiKey(apiKey, userEmail) {
    try {
        const backendUrl = 'https://ai-shield-backend-production.up.railway.app';
        
        // Try to register/verify user
        const response = await fetch(`${backendUrl}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                userName: userNameInput.value.trim(),
                userEmail: userEmail
            })
        });

        if (response.ok) {
            return true;
        } else if (response.status === 409) {
            // User already exists, that's OK
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error testing API key:', error);
        return false;
    }
}

// Reset configuration
resetBtn.addEventListener('click', () => {
    const confirm = window.confirm('Are you sure you want to clear your configuration?');
    if (!confirm) return;

    userNameInput.value = '';
    userEmailInput.value = '';
    apiKeyInput.value = '';
    
    chrome.storage.local.set({
        userName: '',
        userEmail: '',
        apiKey: ''
    }, () => {
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
