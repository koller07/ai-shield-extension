// ============================================
// AI-SHIELD POPUP
// Integrated with authentication system
// ============================================

const API_URL = 'https://ai-shield-backend-production.up.railway.app';

// DOM elements
const detectionCountElement = document.getElementById('detectionCount');
const configSection = document.getElementById('configSection');
const displaySection = document.getElementById('displaySection');
const displayUserEmail = document.getElementById('displayUserId');
const displayCompanyName = document.getElementById('displayCompanyId');

// Load data when popup opens
document.addEventListener('DOMContentLoaded', () => {
    loadAuthData();
    updateDetectionCount();
});

// Load authentication data
async function loadAuthData() {
    chrome.storage.local.get(['authToken', 'user', 'company'], (result) => {
        if (result.authToken && result.user && result.company) {
            // User authenticated
            const user = JSON.parse(result.user);
            const company = JSON.parse(result.company);
            
            // Show display mode
            displayUserEmail.textContent = user.email;
            displayCompanyName.textContent = company.name;
            configSection.style.display = 'none';
            displaySection.style.display = 'block';
        } else {
            // Not authenticated
            configSection.style.display = 'block';
            displaySection.style.display = 'none';
        }
    });
}

// Update detection count
function updateDetectionCount() {
    chrome.storage.local.get(['detectionCount'], (result) => {
        const count = result.detectionCount || 0;
        detectionCountElement.textContent = count;
    });
}

// "Login" button (takes to site)
document.getElementById('saveBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://seu-site.vercel.app/login' });
});

// "Edit" button (takes to site)
document.getElementById('editBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://seu-site.vercel.app/company-dashboard' });
});

// "Logout" button
const logoutBtn = document.createElement('button');
logoutBtn.textContent = 'Logout';
logoutBtn.className = 'btn-secondary';
logoutBtn.style.width = '100%';
logoutBtn.style.marginTop = '16px';
logoutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        chrome.storage.local.remove(['authToken', 'user', 'company', 'detectionCount'], () => {
            loadAuthData();
            detectionCountElement.textContent = '0';
        });
    }
});

// Add logout button to displaySection
if (displaySection) {
    displaySection.appendChild(logoutBtn);
}

// Listen to messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDetectionCount') {
        updateDetectionCount();
    }
});

// Update counter every 2 seconds
setInterval(updateDetectionCount, 2000);
