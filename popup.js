// ================================================================
// AI Shield — Extension Popup JS v2
// Employee-only: login, join with company code, overview, settings
// NO billing info shown to employees
// ================================================================

const API_URL       = 'https://ai-shield-backend-production.up.railway.app';
const DASHBOARD_URL = 'https://getaishield.co';

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupTabs();
  setupForms();
  loadSettings();
});

// ─── Tab navigation ───────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });
}

// ─── Auth check ───────────────────────────────────────────
function checkAuth() {
  chrome.storage.local.get(['authToken', 'user', 'company', 'active'], r => {
    if (chrome.runtime.lastError || !r.authToken || !r.user) {
      showAuthSection();
      return;
    }
    showMain(r.user, r.company, r.active !== false);
    loadMyCount();
  });
}

function showAuthSection() {
  document.getElementById('authSection').classList.add('active');
  document.getElementById('mainSection').classList.remove('active');
  setHeader('Employee Protection', false);
}

function showMain(user, company, active) {
  document.getElementById('authSection').classList.remove('active');
  document.getElementById('mainSection').classList.add('active');

  setHeader(active ? 'Protected' : 'Inactive', active);

  setText('userEmail',   user?.email   || '—');
  setText('companyName', company?.name || '—');

  const banner = document.getElementById('inactiveBanner');
  const status = document.getElementById('statusBar');
  if (banner) banner.style.display = active ? 'none' : 'block';
  if (status) status.style.display = active ? 'flex' : 'none';
}

function setHeader(sub, active) {
  const dot = document.getElementById('headerDot');
  const sub_ = document.getElementById('headerSub');
  if (sub_) sub_.textContent = sub;
  if (dot)  dot.className = 'header-dot' + (active ? '' : ' off');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Form toggle (login ↔ join) ───────────────────────────
function setupForms() {
  document.getElementById('showJoinLink')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('loginForm').style.display  = 'none';
    document.getElementById('joinForm').style.display   = 'block';
    hideError();
  });

  document.getElementById('showLoginLink')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('joinForm').style.display   = 'none';
    document.getElementById('loginForm').style.display  = 'block';
    hideError();
  });

  document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
  document.getElementById('joinBtn')?.addEventListener('click',  handleJoin);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Allow Enter key in login form
  ['loginEmail','loginPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
  });

  // Auto-uppercase company code input
  document.getElementById('joinCode')?.addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
  });
}

// ─── Login (returning employee) ───────────────────────────
async function handleLogin() {
  const email    = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const btn      = document.getElementById('loginBtn');

  if (!email || !password) { showError('Please fill in all fields.'); return; }

  btn.disabled = true;
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
      saveAndShow(data);
    } else {
      showError(data.error || 'Incorrect email or password.');
    }
  } catch (e) {
    showError('Connection error. Check your internet and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}

// ─── Join with company code (first time) ──────────────────
async function handleJoin() {
  const code     = document.getElementById('joinCode')?.value.trim();
  const email    = document.getElementById('joinEmail')?.value.trim();
  const password = document.getElementById('joinPassword')?.value;
  const name     = document.getElementById('joinName')?.value.trim();
  const btn      = document.getElementById('joinBtn');

  if (!code || !email || !password) {
    showError('Company code, email and password are required.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Activating…';
  hideError();

  try {
    const res  = await fetch(`${API_URL}/auth/employee/join`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ companyCode: code, email, password, name }),
    });
    const data = await res.json();

    if (res.ok && data.token) {
      saveAndShow(data);
    } else {
      showError(data.error || 'Could not activate. Check your company code.');
    }
  } catch (e) {
    showError('Connection error. Check your internet and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Activate protection';
  }
}

// ─── Save auth data and show main screen ──────────────────
function saveAndShow(data) {
  chrome.storage.local.set({
    authToken: data.token,
    user:      data.user,
    company:   data.company,
    active:    data.active !== false,
  }, () => {
    if (chrome.runtime.lastError) {
      showError('Failed to save session. Try again.');
      return;
    }
    showMain(data.user, data.company, data.active !== false);
    loadMyCount();
  });
}

// ─── Logout ───────────────────────────────────────────────
function handleLogout() {
  chrome.storage.local.clear(() => {
    showAuthSection();
    // Reset to login form
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('joinForm').style.display  = 'none';
  });
}

// ─── My detection count ───────────────────────────────────
async function loadMyCount() {
  // First load from local storage (instant)
  chrome.storage.local.get(['detectionCount'], r => {
    setText('countToday', String(r.detectionCount || 0));
  });

  // Then fetch from backend for accurate daily count
  chrome.storage.local.get(['authToken'], async r => {
    if (!r.authToken) return;
    try {
      const res  = await fetch(`${API_URL}/detections/my`, {
        headers: { Authorization: `Bearer ${r.authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setText('countToday', String(data.countToday || 0));
      }
    } catch (e) {
      // Use local count as fallback — already loaded above
    }
  });
}

// Listen for updates from content script
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'updateDetectionCount') {
    setText('countToday', String(msg.count || 0));
  }
});

// ─── Settings ─────────────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(['settings'], r => {
    const s = r.settings || {};
    setToggle('toggle-monitoring', s.monitoring !== false);
    setToggle('toggle-alerts',     s.alerts     !== false);
    document.querySelectorAll('.data-toggle').forEach(cb => {
      cb.checked = s.dataTypes?.[cb.dataset.type] !== false;
    });
  });

  ['toggle-monitoring','toggle-alerts'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', saveSettings);
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
  chrome.storage.local.set({
    settings: {
      monitoring: document.getElementById('toggle-monitoring')?.checked !== false,
      alerts:     document.getElementById('toggle-alerts')?.checked     !== false,
      dataTypes,
    }
  });
}

function setToggle(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = val;
}

// ─── Helpers ──────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideError() {
  document.getElementById('errorMsg')?.classList.remove('show');
}
