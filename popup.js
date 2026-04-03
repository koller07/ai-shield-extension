// AI Shield Popup - Authentication & Stats
// Professional implementation using chrome.storage

const API_URL = 'https://ai-shield-backend-production.up.railway.app';
const DASHBOARD_URL = 'https://www.getaishield.eu';

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ AI Shield Popup loaded');
    checkAuthStatus();
    loadDetectionCount();
    setupEventListeners();
});

// ===================================
// EVENT LISTENERS
// ===================================

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Dashboard buttons
    const openDashboardBtn = document.getElementById('openDashboardBtn');
    const viewDashboardBtn = document.getElementById('viewDashboardBtn');
    
    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', openDashboard);
    }
    
    if (viewDashboardBtn) {
        viewDashboardBtn.addEventListener('click', openDashboard);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Signup link
    const signupLink = document.getElementById('signupLink');
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://www.getaishield.eu/signup' });
        });
    }
}

// ===================================
// AUTHENTICATION
// ===================================

function checkAuthStatus() {
    chrome.storage.local.get(['authToken', 'user', 'company'], (result) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Storage error:', chrome.runtime.lastError);
            showLogin();
            return;
        }

        if (result.authToken && result.user && result.company) {
            console.log('✅ User authenticated');
            showLoggedIn(result.user, result.company);
        } else {
            console.log('ℹ️ Not authenticated');
            showLogin();
        }
    });
}

function showLogin() {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    
    if (loginSection) loginSection.classList.add('active');
    if (loggedInSection) loggedInSection.classList.remove('active');
}

function showLoggedIn(user, company) {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    
    if (loginSection) loginSection.classList.remove('active');
    if (loggedInSection) loggedInSection.classList.add('active');
    
    // Update user info
    const userEmailEl = document.getElementById('userEmail');
    const companyNameEl = document.getElementById('companyName');
    const planNameEl = document.getElementById('planName');
    
    if (userEmailEl) userEmailEl.textContent = user.email || '-';
    if (companyNameEl) companyNameEl.textContent = company.name || '-';
    if (planNameEl) planNameEl.textContent = company.plan || 'Team';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    // Disable button
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    hideError();

    try {
        console.log('🔄 Attempting login...');
        
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('📡 Server response:', response.status);

        if (response.ok && data.token) {
            console.log('✅ Login successful');
            
            // Save to chrome.storage
            const storageData = {
                authToken: data.token,
                user: data.user,
                company: data.company,
                companyId: data.company.id,
                userId: data.user.id
            };

            chrome.storage.local.set(storageData, () => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Storage error:', chrome.runtime.lastError);
                    showError('Failed to save login. Please try again.');
                    return;
                }

                console.log('💾 Login data saved to storage');
                
                // Clear form
                emailInput.value = '';
                passwordInput.value = '';
                
                // Show logged in state
                showLoggedIn(data.user, data.company);
            });
        } else {
            console.error('❌ Login failed:', data.error);
            showError(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('❌ Network error:', error);
        showError('Connection error. Please check your internet connection and try again.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

function handleLogout() {
    console.log('🚪 Logging out...');
    
    chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
            console.error('❌ Storage clear error:', chrome.runtime.lastError);
        } else {
            console.log('✅ Logged out, storage cleared');
        }
        
        showLogin();
        
        // Reset detection count
        const detectionCountEl = document.getElementById('detectionCount');
        if (detectionCountEl) {
            detectionCountEl.textContent = '0';
        }
    });
}

// ===================================
// DETECTION COUNTER
// ===================================

function loadDetectionCount() {
    chrome.storage.local.get(['detectionCount'], (result) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Storage error:', chrome.runtime.lastError);
            return;
        }

        const count = result.detectionCount || 0;
        const detectionCountEl = document.getElementById('detectionCount');
        
        if (detectionCountEl) {
            detectionCountEl.textContent = count;
        }
    });
}

// Listen for detection updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDetectionCount') {
        console.log('📊 Detection count updated');
        loadDetectionCount();
    }
});

// Auto-refresh detection count every 2 seconds
setInterval(loadDetectionCount, 2000);

// ===================================
// UI HELPERS
// ===================================

function openDashboard() {
    console.log('🌐 Opening dashboard...');
    chrome.tabs.create({ url: `${DASHBOARD_URL}/company-dashboard` });
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.classList.remove('show');
    }
}
