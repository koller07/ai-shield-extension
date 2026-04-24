// ============================================================
// AI Shield — Popup JS v1.0.2
//
// FIXES vs v1.0.1:
// - DASHBOARD_URL → getaishield.co
// - user/company stored as objects (not JSON strings) — consistent
// - Removed setInterval polling (uses onMessage instead)
// - Tab navigation
// - Settings persistence (monitoring, alerts, logging, data types)
// ============================================================

const API_URL       = 'https://ai-shield-backend-production.up.railway.app';
const DASHBOARD_URL = 'https://getaishield.co';

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadDetectionCount();
  setupTabs();
  setupEventListeners();
  loadSettings();
});

// ─── Tab navigation ───────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = 'tab-' + tab.dataset.tab;
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Auth check ───────────────────────────────────────────
function checkAuth() {
  chrome.storage.local.get(['authToken', 'user', 'company'], r => {
    if (chrome.runtime.lastError) { showLogin(); return; }

    // Support both object and legacy JSON-string storage
    let user    = r.user;
    let company = r.company;
    if (typeof user    === 'string') { try { user    = JSON.parse(user);    } catch(e) { user    = null; } }
    if (typeof company === 'string') { try { company = JSON.parse(company); } catch(e) { company = null; } }

    if (r.authToken && user && company) {
      showLoggedIn(user, company);
    } else {
      showLogin();
    }
  });
}

function showLogin() {
  document.getElementById('loginSection').classList.add('active');
  document.getElementById('loggedInSection').classList.remove('active');
  setHeader('Not connected', false);
}

function showLoggedIn(user, company) {
  document.getElementById('loginSection').classList.remove('active');
  document.getElementById('loggedInSection').classList.add('active');

  const platform = window.location?.hostname || '';
  setHeader(platform || 'Protected', true);

  // Fill user info
  setText('userEmail',   user?.email   || '—');
  setText('companyName', company?.name || '—');
  setText('planName',    (company?.plan || 'Trial').toUpperCase());

  // Trial days
  if (company?.trialEndsAt) {
    const days = Math.max(0, Math.ceil(
      (new Date(company.trialEndsAt) - Date.now()) / 86400000
    ));
    setText('trialDays',  days.toString());
    setText('trialLabel', 'Trial days left');
  } else if (company?.plan && company.plan !== 'trial') {
    setText('trialDays',  '∞');
    setText('trialLabel', 'Plan active');
  }
}

function setHeader(sub, active) {
  const dot = document.getElementById('headerDot');
  const sub_ = document.getElementById('headerSub');
  if (sub_) sub_.textContent = sub;
  if (dot)  dot.className = 'header-dot' + (active ? '' : ' inactive');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Event listeners ──────────────────────────────────────
function setupEventListeners() {
  // Login form
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

  // Dashboard buttons
  document.getElementById('openDashboardBtn')?.addEventListener('click', openDashboard);
  document.getElementById('viewDashboardBtn')?.addEventListener('click', openDashboard);

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Signup link
  document.getElementById('signupLink')?.addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: `${DASHBOARD_URL}/signup.html` });
  });
}

// ─── Login ────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');

  if (!email || !password) { showError('Please fill in all fields'); return; }

  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  hideError();

  try {
    const res  = await fetch(`${API_URL}/auth/employee/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
      // Store as plain objects (not JSON strings)
      chrome.storage.local.set({
        authToken: data.token,
        user:      data.user,
        company:   data.company,
      }, () => {
        if (chrome.runtime.lastError) {
          showError('Failed to save session. Please try again.');
          return;
        }
        document.getElementById('loginEmail').value    = '';
        document.getElementById('loginPassword').value = '';
        showLoggedIn(data.user, data.company);
      });
    } else {
      showError(data.error || 'Incorrect email or password.');
    }
  } catch (err) {
    showError('Connection error. Check your internet and try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign in';
  }
}

// ─── Logout ───────────────────────────────────────────────
function handleLogout() {
  chrome.storage.local.clear(() => {
    showLogin();
    setText('detectionCount', '0');
  });
}

// ─── Detection count ──────────────────────────────────────
function loadDetectionCount() {
  chrome.storage.local.get(['detectionCount'], r => {
    setText('detectionCount', String(r.detectionCount || 0));
  });
}

// Listen for updates from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'updateDetectionCount') {
    setText('detectionCount', String(msg.count || 0));
  }
});

// ─── Settings persistence ─────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(['settings'], r => {
    const s = r.settings || {};

    // Protection toggles (default: all on)
    setToggle('toggle-monitoring', s.monitoring !== false);
    setToggle('toggle-alerts',     s.alerts     !== false);
    setToggle('toggle-logging',    s.logging    !== false);

    // Data type toggles (default: all on)
    document.querySelectorAll('.data-toggle').forEach(cb => {
      const type = cb.dataset.type;
      cb.checked = s.dataTypes?.[type] !== false;
    });
  });

  // Save on any toggle change
  document.querySelectorAll('#toggle-monitoring, #toggle-alerts, #toggle-logging').forEach(cb => {
    cb.addEventListener('change', saveSettings);
  });
  document.querySelectorAll('.data-toggle').forEach(cb => {
    cb.addEventListener('change', saveSettings);
  });
}

function saveSettings() {
  const dataTypes = {};
  document.querySelectorAll('.data-toggle').forEach(cb => {
    dataTypes[cb.dataset.type] = cb.checked;
  });

  const settings = {
    monitoring: document.getElementById('toggle-monitoring')?.checked !== false,
    alerts:     document.getElementById('toggle-alerts')?.checked     !== false,
    logging:    document.getElementById('toggle-logging')?.checked    !== false,
    dataTypes,
  };

  chrome.storage.local.set({ settings });
}

function setToggle(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = val;
}

// ─── Dashboard ────────────────────────────────────────────
function openDashboard() {
  chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard.html` });
}

// ─── UI helpers ───────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMessage');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideError() {
  const el = document.getElementById('errorMessage');
  if (el) el.classList.remove('show');
}
