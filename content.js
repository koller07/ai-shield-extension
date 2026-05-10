// ============================================================
// AI Shield — Content Script v1.0.3 (FINAL MVP)
// Monitors AI tool input fields for sensitive data
//
// FEATURES:
// • Scenario C audit trail (immediate registration + status updates)
// • 16 refined detection types focused on UK + EU + BR markets
// • National IDs for Big 5 EU markets (ES, FR, IT, DE) + UK + PT
// • Display labels without underscores (BD keeps underscores)
//
// AUDIT TRAIL STATUSES:
// • 'detected'     — Initial state when sensitive data is found
// • 'removed'      — User clicked "Remove data" (was_blocked: true)
// • 'sent_anyway'  — User clicked "Send anyway" (was_blocked: false)
// • 'ignored'      — Auto-dismissed after 12s (was_blocked: false)
// • 'abandoned'    — User closed tab without action (was_blocked: false)
// ============================================================

const API_URL = 'https://ai-shield-backend-production.up.railway.app';

// ─── Detection patterns ────────────────────────────────────
// Maps internal type (used in BD) → regex
const PATTERNS = {

  // ── Banking & Payments ──────────────────────────────────

  // IBAN: 2 letters (country) + 2 check digits + 11-30 alphanumeric
  IBAN: /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}[\s]?[\dA-Z]{0,4}\b/g,

  // Credit Card: 13-19 digits with optional spaces/dashes (covers Visa, MC, Amex, etc.)
  CREDIT_CARD: /\b(?:\d{4}[\s\-]?){3}\d{1,4}\b/g,

  // ── Brazilian IDs (kept for BR clients) ─────────────────

  // CPF: 11 digits with required separators (XXX.XXX.XXX-XX)
  // OR with prefix "CPF:" to allow clean format
  CPF: /\b(?:CPF[\s:]*)?\d{3}\.\d{3}\.\d{3}-\d{2}\b|\bCPF[\s:]+\d{11}\b/gi,

  // CNPJ: 14 digits with required separators (XX.XXX.XXX/XXXX-XX)
  // OR with prefix "CNPJ:" to allow clean format
  CNPJ: /\b(?:CNPJ[\s:]*)?\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\bCNPJ[\s:]+\d{14}\b/gi,

  // ── Portuguese Tax ID ──────────────────────────────────

  // NIF (Portugal): 9 digits starting with 1, 2, or 5
  // 1, 2 = individuals | 5 = companies
  // Optional prefix "NIF:" or "VAT:" for higher confidence
  NIF: /\b(?:NIF|VAT)?[\s:]*([125]\d{8})\b/gi,

  // ── National IDs (Big 5 EU markets) ────────────────────

  // Spain — DNI (citizens) and NIE (foreigners)
  // DNI: 8 digits + 1 letter | NIE: X/Y/Z + 7 digits + 1 letter
  ES_DNI: /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z])\b/g,

  // France — INSEE (Numéro de Sécurité Sociale)
  // 15 digits, often spaced: 1 85 12 34 567 890 12
  // First digit: 1 (man) or 2 (woman) | Year/month follow
  FR_INSEE: /\b[12][\s]?\d{2}[\s]?(?:0[1-9]|1[0-2]|2\d|3[0-9])[\s]?(?:\d{2,3}|2[AB]\d{2})[\s]?\d{3}[\s]?\d{3}[\s]?\d{2}\b/g,

  // Italy — Codice Fiscale (16 alphanumeric chars, very specific format)
  // 6 letters (name) + 2 digits (year) + 1 letter (month) + 2 digits (day) + 4 chars (place) + 1 letter (check)
  IT_CODICE_FISCALE: /\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/gi,

  // Germany — Steuer-ID (Tax ID)
  // 11 digits, must have explicit prefix to avoid false positives
  // (because 11 digits alone matches phone numbers, IDs, etc.)
  DE_STEUER_ID: /\b(?:Steuer[\-\s]?ID|Tax[\-\s]?ID|IdNr|Identifikationsnummer)[\s:]*(\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})\b/gi,

  // ── EU + UK VAT Numbers ────────────────────────────────

  // VAT numbers for all 27 EU countries + UK + Norway + Switzerland
  // Each country has its own format
  VAT_NUMBER: new RegExp(
    '\\b(?:' +
      'AT[U]\\d{8}|' +              // Austria
      'BE[01]\\d{9}|' +              // Belgium
      'BG\\d{9,10}|' +               // Bulgaria
      'HR\\d{11}|' +                 // Croatia
      'CY\\d{8}[A-Z]|' +             // Cyprus
      'CZ\\d{8,10}|' +               // Czech Republic
      'DK\\d{8}|' +                  // Denmark
      'EE\\d{9}|' +                  // Estonia
      'FI\\d{8}|' +                  // Finland
      'FR[A-Z0-9]{2}\\d{9}|' +       // France
      'DE\\d{9}|' +                  // Germany
      'EL\\d{9}|' +                  // Greece
      'HU\\d{8}|' +                  // Hungary
      'IE\\d{7}[A-W][A-I]?|' +       // Ireland
      'IT\\d{11}|' +                 // Italy
      'LV\\d{11}|' +                 // Latvia
      'LT(?:\\d{9}|\\d{12})|' +      // Lithuania
      'LU\\d{8}|' +                  // Luxembourg
      'MT\\d{8}|' +                  // Malta
      'NL\\d{9}B\\d{2}|' +           // Netherlands
      'PL\\d{10}|' +                 // Poland
      'PT\\d{9}|' +                  // Portugal
      'RO\\d{2,10}|' +               // Romania
      'SK\\d{10}|' +                 // Slovakia
      'SI\\d{8}|' +                  // Slovenia
      'ES[A-Z0-9]\\d{7}[A-Z0-9]|' +  // Spain
      'SE\\d{12}|' +                 // Sweden
      'GB(?:\\d{9}|\\d{12}|GD\\d{3}|HA\\d{3})|' + // UK
      'NO\\d{9}MVA?|' +              // Norway
      'CHE-?\\d{3}\\.?\\d{3}\\.?\\d{3}' + // Switzerland
    ')\\b',
    'g'
  ),

  // ── UK National Insurance Number ───────────────────────

  // UK NI Number: 2 letters + 6 digits + 1 letter (A/B/C/D/space)
  // Format: AB 12 34 56 C or AB123456C
  UK_NI_NUMBER: /\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?[A-D]\b/g,

  // ── US Social Security Number ──────────────────────────

  // SSN: 3-2-4 digits with dashes
  // Strict format to minimize false positives
  SSN: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,

  // ── Contact Information ─────────────────────────────────

  // Email: standard RFC pattern (simplified)
  EMAIL: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,

  // Phone: requires international prefix (+/00) OR clear separators
  // Reduces false positives from random number sequences
  PHONE: /(?:(?:\+|00)\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{0,4})|\b\d{2,4}[\s\-]\d{3,4}[\s\-]\d{3,4}\b/g,

  // ── Tech Secrets ────────────────────────────────────────

  // API Key: only well-known patterns (no generic 32+ char detection)
  // Covers: Stripe, OpenAI, Anthropic, Google, GitHub, Slack, AWS
  API_KEY: /\b(?:sk-(?:ant-)?[\w]{20,}|sk_(?:test|live|proj)_[\w]{20,}|pk_(?:test|live)_[\w]{20,}|AIza[\w\-]{35}|ghp_[\w]{36}|gho_[\w]{36}|github_pat_[\w]{82}|xoxb-\d{11,}-\d{11,}-[\w]{24}|AKIA[A-Z0-9]{16})\b/g,

  // Password: explicit password patterns
  PASSWORD: /\b(?:password|senha|pwd|pass|passwd)\s*[:=]\s*\S{4,}/gi,
};

// ─── Display labels (without underscores) ──────────────────
// Used in popup, BD keeps internal name with underscores
const DISPLAY_LABELS = {
  IBAN:               'IBAN',
  CREDIT_CARD:        'CREDIT CARD',
  CPF:                'CPF',
  CNPJ:               'CNPJ',
  NIF:                'NIF',
  ES_DNI:             'DNI / NIE',
  FR_INSEE:           'INSEE',
  IT_CODICE_FISCALE:  'CODICE FISCALE',
  DE_STEUER_ID:       'STEUER-ID',
  VAT_NUMBER:         'VAT NUMBER',
  UK_NI_NUMBER:       'NI NUMBER',
  SSN:                'SSN',
  EMAIL:              'EMAIL',
  PHONE:              'PHONE',
  API_KEY:            'API KEY',
  PASSWORD:           'PASSWORD',
};

// Minimum text length to trigger detection (avoid noise on short input)
const MIN_LENGTH = 8;

// ─── Active detections waiting for user action ────────────
// Map: detectionId → { type, status, timestamp }
const pendingDetections = new Map();

// ─── Get auth from storage ─────────────────────────────────
async function getAuth() {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken', 'user', 'company'], r => {
      let user    = r.user;
      let company = r.company;
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
        const trimmed = m.trim();
        const key = `${type}:${trimmed}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push({ type, value: trimmed });
        }
      });
    }
  }
  return found;
}

// ─── CREATE detection (called immediately on detect) ──────
async function createDetection(type) {
  const auth = await getAuth();
  if (!auth.token) return null;

  try {
    const res = await fetch(`${API_URL}/detections`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        platform: detectPlatform(),
        dataType: type,                // internal name (BD keeps it)
        action:   'detected',
        urlHost:  window.location.hostname,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      chrome.storage.local.remove(['authToken', 'user', 'company']);
      return null;
    }

    if (res.ok) {
      const data = await res.json();
      // Increment local counter
      chrome.storage.local.get(['detectionCount'], r => {
        const n = (r.detectionCount || 0) + 1;
        chrome.storage.local.set({ detectionCount: n });
        chrome.runtime.sendMessage({ action: 'updateDetectionCount', count: n }).catch(() => {});
      });
      return { id: data.id };
    }
  } catch (e) {
    // Silent fail
  }
  return null;
}

// ─── UPDATE detection (when user takes action) ────────────
async function updateDetection(detectionId, action) {
  if (!detectionId) return;
  const auth = await getAuth();
  if (!auth.token) return;

  try {
    await fetch(`${API_URL}/detections/${detectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ action }),
    });
  } catch (e) {
    // Silent fail
  }

  pendingDetections.delete(detectionId);
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
async function showAlert(detections, targetEl) {
  const existing = document.getElementById('ai-shield-alert');
  if (existing) existing.remove();

  // Get unique types and convert to display labels
  const types = [...new Set(detections.map(d => d.type))];
  const displayTypes = types.map(t => DISPLAY_LABELS[t] || t.replace(/_/g, ' '));
  const label = displayTypes.length === 1
    ? displayTypes[0]
    : `${displayTypes.length} data types`;

  // CENÁRIO C: Create detection records IMMEDIATELY
  const createdIds = [];
  for (const type of types) {
    const result = await createDetection(type);
    if (result?.id) {
      createdIds.push(result.id);
      pendingDetections.set(result.id, {
        type,
        status: 'detected',
        timestamp: Date.now()
      });
    }
  }

  // If couldn't create any (e.g., not logged in) — don't show popup
  if (createdIds.length === 0) return;

  const alert = document.createElement('div');
  alert.id = 'ai-shield-alert';
  alert.dataset.detectionIds = createdIds.join(',');
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

  let resolved = false;

  // "Remove data" → clear input + status: 'removed'
  document.getElementById('as-remove').addEventListener('click', () => {
    if (resolved) return;
    resolved = true;

    if (targetEl && (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT')) {
      targetEl.value = '';
      targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (targetEl && targetEl.isContentEditable) {
      targetEl.textContent = '';
      targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    createdIds.forEach(id => updateDetection(id, 'removed'));
    dismissAlert();
  });

  // "Send anyway" → status: 'sent_anyway'
  document.getElementById('as-ignore').addEventListener('click', () => {
    if (resolved) return;
    resolved = true;

    createdIds.forEach(id => updateDetection(id, 'sent_anyway'));
    dismissAlert();
  });

  // Auto-dismiss after 12s → status: 'ignored'
  setTimeout(() => {
    if (resolved) return;
    resolved = true;

    createdIds.forEach(id => updateDetection(id, 'ignored'));
    dismissAlert();
  }, 12000);
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
    }, 300));
  });
}

// ─── Find and observe input fields ────────────────────────
const observedFields = new WeakSet();

function attachToFields() {
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

attachToFields();

const domObserver = new MutationObserver(() => attachToFields());
domObserver.observe(document.body, { childList: true, subtree: true });

// ─── On tab close: mark pending detections as 'abandoned' ──
window.addEventListener('beforeunload', () => {
  if (pendingDetections.size === 0) return;

  chrome.storage.local.get(['authToken'], r => {
    if (!r.authToken) return;
    pendingDetections.forEach((info, id) => {
      try {
        fetch(`${API_URL}/detections/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${r.authToken}`,
          },
          body: JSON.stringify({ action: 'abandoned' }),
          keepalive: true,
        });
      } catch (e) { /* silent */ }
    });
  });
});

console.log('[AI Shield v1.0.3] Loaded on', detectPlatform(), '— 16 detection types active, audit trail enabled');
