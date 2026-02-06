// Elementos do DOM
const detectionCountElement = document.getElementById('detectionCount');
const companyIdInput = document.getElementById('companyId');
const userIdInput = document.getElementById('userId');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const editBtn = document.getElementById('editBtn');
const configSection = document.getElementById('configSection');
const displaySection = document.getElementById('displaySection');
const displayCompanyId = document.getElementById('displayCompanyId');
const displayUserId = document.getElementById('displayUserId');

// Carregar dados salvos ao abrir o popup
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    updateDetectionCount();
});

// Carregar dados salvos do localStorage
function loadSavedData() {
    chrome.storage.local.get(['companyId', 'userId', 'detectionCount'], (result) => {
        const companyId = result.companyId || '';
        const userId = result.userId || '';

        if (companyId && userId) {
            // Mostrar modo de exibição
            displayCompanyId.textContent = companyId;
            displayUserId.textContent = userId;
            configSection.style.display = 'none';
            displaySection.style.display = 'block';
        } else {
            // Mostrar modo de configuração
            configSection.style.display = 'block';
            displaySection.style.display = 'none';
            if (companyId) companyIdInput.value = companyId;
            if (userId) userIdInput.value = userId;
        }

        // Atualizar contador
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// Atualizar contador de detecções
function updateDetectionCount() {
    chrome.storage.local.get(['detectionCount'], (result) => {
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// Salvar configuração
saveBtn.addEventListener('click', () => {
    const companyId = companyIdInput.value.trim();
    const userId = userIdInput.value.trim();

    if (!companyId || !userId) {
        alert('Please fill in both Company ID and User ID');
        return;
    }

    // Salvar no localStorage
    chrome.storage.local.set({
        companyId: companyId,
        userId: userId
    }, () => {
        // Enviar para backend
        sendConfigToBackend(companyId, userId);
        
        // Atualizar UI
        loadSavedData();
    });
});

// Resetar configuração
resetBtn.addEventListener('click', () => {
    companyIdInput.value = '';
    userIdInput.value = '';
    chrome.storage.local.set({
        companyId: '',
        userId: ''
    }, () => {
        loadSavedData();
    });
});

// Editar configuração
editBtn.addEventListener('click', () => {
    configSection.style.display = 'block';
    displaySection.style.display = 'none';
    companyIdInput.value = displayCompanyId.textContent;
    userIdInput.value = displayUserId.textContent;
});

// Enviar configuração para o backend
function sendConfigToBackend(companyId, userId) {
    const backendUrl = 'https://ai-shield-backend-production.up.railway.app';
    
    fetch(`${backendUrl}/api/companies`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            companyId: companyId,
            companyName: companyId,
            userId: userId,
            userName: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Configuration saved to backend:', data);
    })
    .catch(error => {
        console.error('Error sending configuration to backend:', error);
    });
}

// Ouvir mensagens do content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDetectionCount') {
        updateDetectionCount();
    }
});

// Atualizar contador a cada 2 segundos
setInterval(updateDetectionCount, 2000);
