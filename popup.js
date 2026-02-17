// AI Shield - popup.js
// Registra usuário no backend ao salvar configuração

const BACKEND_URL = 'https://ai-shield-backend-production.up.railway.app';

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

document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    updateDetectionCount();
});

function loadSavedData() {
    chrome.storage.local.get(['userName', 'userEmail', 'apiKey', 'detectionCount', 'confirmedCount', 'suspiciousCount'], (result) => {
        const userName = result.userName || '';
        const userEmail = result.userEmail || '';
        const apiKey = result.apiKey || '';

        if (userName && userEmail && apiKey) {
            displayUserName.textContent = userName;
            displayUserEmail.textContent = userEmail;
            displayApiKey.textContent = apiKey.substring(0, 12) + '...' + apiKey.substring(apiKey.length - 4);
            configSection.style.display = 'none';
            displaySection.style.display = 'block';
        } else {
            configSection.style.display = 'block';
            displaySection.style.display = 'none';
            if (userName) userNameInput.value = userName;
            if (userEmail) userEmailInput.value = userEmail;
            if (apiKey) apiKeyInput.value = apiKey;
        }

        detectionCountElement.textContent = result.detectionCount || 0;
        document.getElementById('confirmedCount').textContent = result.confirmedCount || 0;
        document.getElementById('suspiciousCount').textContent = result.suspiciousCount || 0;
    });
}

function updateDetectionCount() {
    chrome.storage.local.get(['detectionCount', 'confirmedCount', 'suspiciousCount'], (result) => {
        detectionCountElement.textContent = result.detectionCount || 0;
        document.getElementById('confirmedCount').textContent = result.confirmedCount || 0;
        document.getElementById('suspiciousCount').textContent = result.suspiciousCount || 0;
    });
}

// REGISTRAR USUÁRIO NO BACKEND
async function registerUserOnBackend(userName, userEmail, apiKey) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                userName: userName,
                userEmail: userEmail
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ User registered on backend');
            return true;
        } else {
            console.error('❌ Register failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Error registering:', error);
        return false;
    }
}

// SALVAR CONFIGURAÇÃO
saveBtn.addEventListener('click', async () => {
    const userName = userNameInput.value.trim();
    const userEmail = userEmailInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!userName || !userEmail || !apiKey) {
        alert('Please fill all fields');
        return;
    }

    // Disable button during save
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    // 1. Save to local storage
    chrome.storage.local.set({ userName, userEmail, apiKey }, async () => {
        
        // 2. Register on backend
        const registered = await registerUserOnBackend(userName, userEmail, apiKey);

        if (registered) {
            saveBtn.textContent = '✅ Saved!';
            setTimeout(() => {
                saveBtn.textContent = 'Save';
                saveBtn.disabled = false;
                loadSavedData();
            }, 1500);
        } else {
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
            alert('Saved locally. Could not reach backend - check your API Key.');
            loadSavedData();
        }
    });
});

// RESETAR
resetBtn.addEventListener('click', () => {
    userNameInput.value = '';
    userEmailInput.value = '';
    apiKeyInput.value = '';
    chrome.storage.local.set({ userName: '', userEmail: '', apiKey: '' }, loadSavedData);
});

// EDITAR
editBtn.addEventListener('click', () => {
    chrome.storage.local.get(['userName', 'userEmail', 'apiKey'], (result) => {
        userNameInput.value = result.userName || '';
        userEmailInput.value = result.userEmail || '';
        apiKeyInput.value = result.apiKey || '';
        configSection.style.display = 'block';
        displaySection.style.display = 'none';
    });
});

// Ouvir mensagens do content.js
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateDetectionCount') {
        updateDetectionCount();
    }
});

// Auto-refresh contador
setInterval(updateDetectionCount, 2000);
