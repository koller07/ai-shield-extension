// ============================================================
// AI Shield — Popup JS v1.0.6
// Single auth form: email, password, company code
// ============================================================
const API_URL = 'https://ai-shield-backend-production.up.railway.app';
// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupTabs();
  setupAuth();
  loadSettings();
});
// ── Check auth on load ────────────────────────────────────
function checkAuth() {
  chrome.storage.local.get(['authToken', 'user', 'company'], r => {
    if (chrome.runtime.lastError || !r.authToken || !r.user) {
      showAuthSection();
      return;
    }
    showMain(r.user, r.company);
    loadMyCount();
  });
}
function showAuthSection() {
  document.getElementById('authSection').classList.add('active');
  document.getElementById('mainSection').classList.remove('active');
  setHeader('Employee Protection', false);
}
function showMain(user, company) {
  document.getElementById('authSection').classList.remove('active');
  document.getElementById('mainSection').classList.add('active');
  setHeader('Protected', true);
  setText('userEmail',   user?.email   || '—');
  setText('companyName', company?.name || '—');
}
function setHeader(sub, active) {
  const dot  = document.getElementById('headerDot');
  const sub_ = document.getElementById('headerSub');
  if (sub_) sub_.textContent = sub;
  if (dot)  dot.className = 'header-dot' + (active ? '' : ' off');
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
// ── Tab navigation (Overview / Settings) ─────────────────
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
// ── Auth (single form) ────────────────────────────────────
function setupAuth() {
  const btn = document.getElementById('authBtn');
  const inputs = ['authEmail', 'authPassword', 'authCode'];
  // Enter key submits
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAuth();
    });
  });
  // Auto-uppercase company code
  document.getElementById('authCode')?.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.setSelectionRange(pos, pos);
  });
  // Click handler
  btn?.addEventListener('click', handleAuth);
}
async function handleAuth() {
  const email    = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const code     = document.getElementById('authCode')?.value.trim();
  const btn      = document.getElementById('authBtn');
  hideError();
  if (!email)    { showError('Email is required.'); return; }
  if (!password) { showError('Password is required.'); return; }
  if (!code)     { showError('Company code is required.'); return; }
  if (code.length < 6) { showError('Company code must be 6-8 characters.'); return; }
  if (password.length < 8) { showError('Password must be at least 8 characters.'); return; }
  btn.disabled = true;
  btn.textContent = 'Activating…';
  try {
    // Try login first (existing employee)
    let res = await fetch(`${API_URL}/auth/employee/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    let data = await res.json();
    // If login fails, try join (first time)
    if (!res.ok) {
      res = await fetch(`${API_URL}/auth/employee/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyCode: code, email, password }),
      });
      data = await res.json();
    }
    if (res.ok && data.token) {
      saveAndShow(data);
    } else {
      showError(data.error || 'Could not activate. Check your details and try again.');
    }
  } catch (e) {
    showError('Connection error. Check your internet and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Activate protection';
  }
}
// ── Save auth + show main ─────────────────────────────────
function saveAndShow(data) {
  chrome.storage.local.set({
    authToken: data.token,
    user:      data.user,
    company:   data.company,
  }, () => {
    if (chrome.runtime.lastError) {
      showError('Failed to save session. Try again.');
      return;
    }
    showMain(data.user, data.company);
    loadMyCount();
  });
}
// ── Logout ────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    showAuthSection();
    setText('countToday', '0');
    // Clear form
    ['authEmail','authPassword','authCode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  });
});
// ── Detection count ───────────────────────────────────────
function loadMyCount() {
  chrome.storage.local.get(['detectionCount'], r => {
    setText('countToday', String(r.detectionCount || 0));
  });
  chrome.storage.local.get(['authToken'], async r => {
    if (!r.authToken) return;
    try {
      const res = await fetch(`${API_URL}/detections/my`, {
        headers: { Authorization: `Bearer ${r.authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setText('countToday', String(data.countToday || 0));
      }
    } catch (e) { /* use local count */ }
  });
}
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'updateDetectionCount') {
    setText('countToday', String(msg.count || 0));
  }
});
// ── Settings ──────────────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(['settings'], r => {
    const s = r.settings || {};
    setToggle('toggle-monitoring', s.monitoring !== false);
    setToggle('toggle-alerts',     s.alerts     !== false);
  });
  ['toggle-monitoring','toggle-alerts'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', saveSettings);
  });
}
function saveSettings() {
  chrome.storage.local.set({
    settings: {
      monitoring: document.getElementById('toggle-monitoring')?.checked !== false,
      alerts:     document.getElementById('toggle-alerts')?.checked     !== false,
    }
  });
}
function setToggle(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = val;
}
// ── Helpers ───────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideError() {
  document.getElementById('errorMsg')?.classList.remove('show');
}
