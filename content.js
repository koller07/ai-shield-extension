// ============================================================
// AI Shield — Content Script v1.0.2
// Monitors AI tool input fields for sensitive data
//
// FIXES vs v1.0.1:
// - Monitors INPUT FIELDS ONLY (not entire page body)
// - Debounced detection (300ms) — no spam
// - Alert has "Remove data" + "Send anyway" buttons
// - Correct backend endpoint (/detections not /api/detection)
// - Consistent storage format for user/company
// - Brand-aligned visual design
// ============================================================

const API_URL = 'https://ai-shield-backend-production.up.railway.app';

// ─── Detection patterns ────────────────────────────────────
const PATTERNS = {
  IBAN:        /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}[\s]?[\dA-Z]{0,4}\b/g,
  CREDIT_CARD: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  CPF:         /\b\d{3}\.?\d{3}\.?\d{3}[-]?\d{2}\b/g,
  CNPJ:        /\b\d{2}\.?\d{3}\.?\d{3}[\/]?\d{4}[-]?\d{2}\b/g,
  NIF:         /\b[1-9]\d{8}\b/g,
  EMAIL:       /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  PHONE:       /(\+\d{1,3}[\s\-]?)?(\(?\d{2,3}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}\b/g,
  API_KEY:     /\b(sk[-_][\w\-]{20,}|pk[-_][\w\-]{20,}|[A-Za-z0-9]{32,})\b/g,
  PASSWORD:    /\b(password|senha|pwd|pass)\s*[:=]\s*\S+/gi,
};

// Minimum text length to trigger detection (avoid noise)
const MIN_LENGTH = 8;

// ─── Get auth from storage ─────────────────────────────────
async function getAuth() {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken', 'user', 'company'], r => {
      let user    = r.user;
      let company = r.company;
      // Safely parse if stored as JSON string (backward compat)
      if (typeof user    === 'string') { try { user    = JSON.parse(user);    } catch(e) { user    = null; } }
      if (typeof company === 'string') { try { company = JSON.parse(company); } catch(e) { company = null; } }
      resolve({ token: r.authToken || null, user, company });
    });
  });
}

// ─── Detect platform ──────────────────────────────────────
function detectPlatform() {
  const h = window.location.hostname;
  if (h.includes('chatgpt.com') || h.includes('openai.com')) return 'chatgpt';
  if (h.includes('claude.ai'))            return 'claude';
  if (h.includes('gemini.google.com'))    return 'gemini';
  if (h.includes('copilot.microsoft.com'))return 'copilot';
  if (h.includes('perplexity.ai'))        return 'perplexity';
  if (h.includes('mistral.ai'))           return 'mistral';
  if (h.includes('huggingface.co'))       return 'huggingface';
  if (h.includes('groq.com'))             return 'groq';
  return 'unknown';
}

// ─── Run detection on text ────────────────────────────────
function detect(text) {
  if (!text || text.length < MIN_LENGTH) return [];
  const found = [];
  const seen  = new Set();
  for (const [type, re] of Object.entries(PATTERNS)) {
    re.lastIndex = 0;
    const matches = text.match(re);
    if (matches) {
      matches.forEach(m => {
        const key = `${type}:${m}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push({ type, value: m });
        }
      });
    }
  }
  return found;
}

// ─── Send to backend ──────────────────────────────────────
async function sendDetection(type, action) {
  const auth = await getAuth();
  if (!auth.token) return; // not logged in — silent

  try {
    const res = await fetch(`${API_URL}/detections`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        platform:        detectPlatform(),
        dataType:        type,
        wasBlocked:      action === 'removed',
        employeeAction:  action,   // 'removed' | 'ignored'
        urlHost:         window.location.hostname,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      // Token expired — clear storage
      chrome.storage.local.remove(['authToken', 'user', 'company']);
      return;
    }

    if (res.ok) {
      // Increment local counter
      chrome.storage.local.get(['detectionCount'], r => {
        const n = (r.detectionCount || 0) + 1;
        chrome.storage.local.set({ detectionCount: n });
        chrome.runtime.sendMessage({ action: 'updateDetectionCount', count: n }).catch(() => {});
      });
    }
  } catch (e) {
    // Network error — don't crash
  }
}

// ─── Inject animation CSS once ────────────────────────────
(function injectCSS() {
  if (document.getElementById('ai-shield-styles')) return;
  const s = document.createElement('style');
  s.id = 'ai-shield-styles';
  s.textContent = `
    #ai-shield-alert {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 2147483647;
      width: 292px;
      background: #D92D20;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 8px 32px rgba(217,45,32,.45), 0 2px 8px rgba(0,0,0,.25);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: ai-shield-in .35s cubic-bezier(.34,1.56,.64,1) forwards;
      overflow: hidden;
    }
    #ai-shield-alert.hiding {
      animation: ai-shield-out .25s ease forwards;
    }
    @keyframes ai-shield-in {
      from { opacity:0; transform: scale(.88) translateY(-8px); }
      to   { opacity:1; transform: scale(1)   translateY(0);    }
    }
    @keyframes ai-shield-out {
      from { opacity:1; transform: scale(1)    translateY(0);   }
      to   { opacity:0; transform: scale(.92) translateY(-6px); }
    }
    #ai-shield-alert .as-head {
      padding: 12px 14px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #ai-shield-alert .as-dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      background: rgba(255,255,255,.35);
      border: 2px solid rgba(255,255,255,.8);
      flex-shrink: 0;
      animation: as-pulse 1.8s ease-in-out infinite;
    }
    @keyframes as-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.5); }
      50%      { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
    }
    #ai-shield-alert .as-label {
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: rgba(255,255,255,.75);
      line-height: 1;
      margin-bottom: 2px;
    }
    #ai-shield-alert .as-type {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      line-height: 1;
      letter-spacing: .02em;
    }
    #ai-shield-alert .as-shield {
      margin-left: auto;
      width: 28px; height: 28px;
      background: rgba(255,255,255,.18);
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #ai-shield-alert .as-shield svg { width:16px; height:16px; fill:white; }
    #ai-shield-alert .as-divider {
      height: 1px;
      background: rgba(255,255,255,.18);
      margin: 0 14px;
    }
    #ai-shield-alert .as-actions {
      display: flex;
      gap: 8px;
      padding: 10px 12px 12px;
    }
    #ai-shield-alert .as-btn {
      flex: 1;
      padding: 7px 0;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: opacity .15s;
    }
    #ai-shield-alert .as-btn:hover { opacity: .85; }
    #ai-shield-alert .as-btn-remove {
      background: rgba(0,0,0,.25);
      color: white;
    }
    #ai-shield-alert .as-btn-ignore {
      background: rgba(255,255,255,.15);
      color: rgba(255,255,255,.85);
    }
  `;
  (document.head || document.documentElement).appendChild(s);
})();

// ─── Show alert popup ─────────────────────────────────────
function showAlert(detections, targetEl) {
  // Remove any existing alert
  const existing = document.getElementById('ai-shield-alert');
  if (existing) existing.remove();

  const types = [...new Set(detections.map(d => d.type))];
  const label = types.length === 1 ? types[0] : `${types.length} data types`;

  const alert = document.createElement('div');
  alert.id = 'ai-shield-alert';
  alert.innerHTML = `
    <div class="as-head">
      <div class="as-dot"></div>
      <div>
        <div class="as-label">Sensitive data detected</div>
        <div class="as-type">${label}</div>
      </div>
      <div class="as-shield">
        <svg viewBox="0 0 20 20"><path d="M10 1L2 4.5v6C2 14.5 5.5 18.3 10 19c4.5-.7 8-4.5 8-8.5v-6L10 1z"/></svg>
      </div>
    </div>
    <div class="as-divider"></div>
    <div class="as-actions">
      <button class="as-btn as-btn-remove" id="as-remove">Remove data</button>
      <button class="as-btn as-btn-ignore" id="as-ignore">Send anyway</button>
    </div>
  `;

  document.body.appendChild(alert);

  // "Remove data" — clear the input field
  document.getElementById('as-remove').addEventListener('click', () => {
    if (targetEl && (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT')) {
      targetEl.value = '';
      // Dispatch input event so React state updates
      targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (targetEl && targetEl.isContentEditable) {
      targetEl.textContent = '';
      targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    types.forEach(t => sendDetection(t, 'removed'));
    dismissAlert();
  });

  // "Send anyway" — log but allow
  document.getElementById('as-ignore').addEventListener('click', () => {
    types.forEach(t => sendDetection(t, 'ignored'));
    dismissAlert();
  });

  // Auto-dismiss after 12 seconds
  setTimeout(dismissAlert, 12000);
}

function dismissAlert() {
  const el = document.getElementById('ai-shield-alert');
  if (!el) return;
  el.classList.add('hiding');
  setTimeout(() => el && el.remove(), 280);
}

// ─── Per-field monitor with debounce ──────────────────────
const fieldTimers = new WeakMap();
const lastDetected = new WeakMap();

function monitorField(el) {
  el.addEventListener('input', () => {
    clearTimeout(fieldTimers.get(el));
    fieldTimers.set(el, setTimeout(() => {
      const text = el.value !== undefined ? el.value : el.innerText;
      const detections = detect(text);

      if (detections.length === 0) return;

      // Avoid re-alerting for the exact same set of detections
      const key = detections.map(d => d.type + d.value).join('|');
      if (lastDetected.get(el) === key) return;
      lastDetected.set(el, key);

      showAlert(detections, el);
    }, 300)); // 300ms debounce
  });
}

// ─── Find and observe input fields ────────────────────────
const observedFields = new WeakSet();

function attachToFields() {
  // Target: textarea, input[type=text], contenteditable divs
  const selectors = [
    'textarea',
    'input[type="text"]',
    'div[contenteditable="true"]',
    'div[contenteditable=""]',
    'p[contenteditable="true"]',
  ];

  document.querySelectorAll(selectors.join(',')).forEach(el => {
    if (!observedFields.has(el)) {
      observedFields.add(el);
      monitorField(el);
    }
  });
}

// Run on load
attachToFields();

// Watch for dynamically added fields (SPAs like ChatGPT)
const domObserver = new MutationObserver(() => attachToFields());
domObserver.observe(document.body, { childList: true, subtree: true });

console.log('[AI Shield v1.0.2] Loaded on', detectPlatform());
