// ============================================================
// AI Shield — Content Script v1.1.0
// Text-field monitoring + FILE UPLOAD coverage (PDF, CSV, XLSX)
//
// NEW IN v1.1.0:
// • File upload scanning: PDF (pdf.js), CSV, XLSX (SheetJS) — all local
// • Expanded detection: UK/EU structured IDs + anchored contextual data
// • Same audit-trail flow (detected/removed/sent_anyway/ignored/abandoned)
//
// PRIVACY: file content is parsed 100% locally in the browser.
//          Only detection metadata (type/platform) is sent to the server,
//          never the file content or the prompt text.
// ============================================================
const API_URL = 'https://ai-shield-backend-production.up.railway.app';

// ─── Detection patterns ────────────────────────────────────
const PATTERNS = {
  // ── Banking & Payments ──
  IBAN: /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}[\s]?[\dA-Z]{0,4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[\s\-]?){3}\d{1,4}\b/g,
  // ── Brazilian IDs ──
  CPF: /\b(?:CPF[\s:]*)?\d{3}\.\d{3}\.\d{3}-\d{2}\b|\bCPF[\s:]+\d{11}\b/gi,
  CNPJ: /\b(?:CNPJ[\s:]*)?\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\bCNPJ[\s:]+\d{14}\b/gi,
  // ── Portuguese Tax ID ──
  NIF: /\b(?:NIF|VAT)?[\s:]*([125]\d{8})\b/gi,
  // ── National IDs (Big 5 EU) ──
  ES_DNI: /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z])\b/g,
  FR_INSEE: /\b[12][\s]?\d{2}[\s]?(?:0[1-9]|1[0-2]|2\d|3[0-9])[\s]?(?:\d{2,3}|2[AB]\d{2})[\s]?\d{3}[\s]?\d{3}[\s]?\d{2}\b/g,
  IT_CODICE_FISCALE: /\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/gi,
  DE_STEUER_ID: /\b(?:Steuer[\-\s]?ID|Tax[\-\s]?ID|IdNr|Identifikationsnummer)[\s:]*(\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3})\b/gi,
  // ── EU + UK VAT ──
  VAT_NUMBER: new RegExp(
    '\\b(?:' +
      'AT[U]\\d{8}|BE[01]\\d{9}|BG\\d{9,10}|HR\\d{11}|CY\\d{8}[A-Z]|CZ\\d{8,10}|' +
      'DK\\d{8}|EE\\d{9}|FI\\d{8}|FR[A-Z0-9]{2}\\d{9}|DE\\d{9}|EL\\d{9}|HU\\d{8}|' +
      'IE\\d{7}[A-W][A-I]?|IT\\d{11}|LV\\d{11}|LT(?:\\d{9}|\\d{12})|LU\\d{8}|MT\\d{8}|' +
      'NL\\d{9}B\\d{2}|PL\\d{10}|PT\\d{9}|RO\\d{2,10}|SK\\d{10}|SI\\d{8}|' +
      'ES[A-Z0-9]\\d{7}[A-Z0-9]|SE\\d{12}|GB(?:\\d{9}|\\d{12}|GD\\d{3}|HA\\d{3})|' +
      'NO\\d{9}MVA?|CHE-?\\d{3}\\.?\\d{3}\\.?\\d{3}' +
    ')\\b', 'g'
  ),
  // ── UK National Insurance ──
  UK_NI_NUMBER: /\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?[A-D]\b/g,
  // ── US SSN ──
  SSN: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
  // ── Contact ──
  EMAIL: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  PHONE: /(?:(?:\+|00)\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{0,4})|\b\d{2,4}[\s\-]\d{3,4}[\s\-]\d{3,4}\b/g,
  // ── Tech Secrets ──
  API_KEY: /\b(?:sk-(?:ant-)?[\w]{20,}|sk_(?:test|live|proj)_[\w]{20,}|pk_(?:test|live)_[\w]{20,}|AIza[\w\-]{35}|ghp_[\w]{36}|gho_[\w]{36}|github_pat_[\w]{82}|xoxb-\d{11,}-\d{11,}-[\w]{24}|AKIA[A-Z0-9]{16})\b/g,
  PASSWORD: /\b(?:password|senha|pwd|pass|passwd)\s*[:=]\s*\S{4,}/gi,

  // ══ NEW v1.1.0 — Structured UK/EU (anchored where risk of FP) ══
  UK_PASSPORT: /(?:passport|passaporte)[\s:#]*(\d{9})\b/gi,
  UK_DRIVING_LICENCE: /(?:driving\s*licen[cs]e|dvla|licence\s*no)[\s:#]*([A-Z9]{5}\d{6}[A-Z9]{2}\d[A-Z]{2})\b/gi,
  UK_SORT_CODE_ACCOUNT: /(?:sort\s*code)[\s:]*\d{2}-?\d{2}-?\d{2}\b|\b\d{2}-\d{2}-\d{2}\b[\s\S]{0,20}?\b\d{8}\b/gi,
  UK_NHS: /(?:NHS)[\s:No.#]*(\d{3}[\s]?\d{3}[\s]?\d{4})\b/gi,
  EU_PASSPORT: /(?:passport|passaporte|reisepass|pasaporte|passeport)[\s:#]*([A-Z0-9]{8,9})\b/gi,

  // ══ NEW v1.1.0 — Anchored contextual (label + value only) ══
  NAME_LABELLED: /(?:patient|cliente|client|name|nome|titular|customer|paciente)\s*[:=]\s*([A-ZÀ-Þ][a-zà-ÿ]+(?:\s+[A-ZÀ-Þ][a-zà-ÿ]+){1,3})/gi,
  HEALTH_LABELLED: /(?:diagnosis|diagnóstico|diagnostico|condition|treatment|medicação|medicacao|medication)\s*[:=]\s*\S+/gi,
  DOB_LABELLED: /(?:DOB|D\.O\.B|date of birth|data de nascimento|nascimento)\s*[:=]\s*\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}\b/gi,
  SALARY_LABELLED: /(?:salary|salário|salario|remuneração|remuneracao)\s*[:=]\s*[€£$]?\s?\d[\d.,]{2,}/gi,
};

// ─── Display labels ──
const DISPLAY_LABELS = {
  IBAN:'IBAN', CREDIT_CARD:'CREDIT CARD', CPF:'CPF', CNPJ:'CNPJ', NIF:'NIF',
  ES_DNI:'DNI / NIE', FR_INSEE:'INSEE', IT_CODICE_FISCALE:'CODICE FISCALE',
  DE_STEUER_ID:'STEUER-ID', VAT_NUMBER:'VAT NUMBER', UK_NI_NUMBER:'NI NUMBER',
  SSN:'SSN', EMAIL:'EMAIL', PHONE:'PHONE', API_KEY:'API KEY', PASSWORD:'PASSWORD',
  UK_PASSPORT:'PASSPORT', UK_DRIVING_LICENCE:'DRIVING LICENCE',
  UK_SORT_CODE_ACCOUNT:'BANK ACCOUNT', UK_NHS:'NHS NUMBER', EU_PASSPORT:'PASSPORT',
  NAME_LABELLED:'NAME', HEALTH_LABELLED:'HEALTH DATA', DOB_LABELLED:'DATE OF BIRTH',
  SALARY_LABELLED:'SALARY',
};

const MIN_LENGTH = 8;
const pendingDetections = new Map();

// ─── Auth ──
async function getAuth() {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken', 'user', 'company'], r => {
      let user = r.user, company = r.company;
      if (typeof user === 'string')    { try { user = JSON.parse(user); } catch(e){ user = null; } }
      if (typeof company === 'string') { try { company = JSON.parse(company); } catch(e){ company = null; } }
      resolve({ token: r.authToken || null, user, company });
    });
  });
}

// ─── Platform ──
function detectPlatform() {
  const h = window.location.hostname;
  if (h.includes('chatgpt.com') || h.includes('openai.com')) return 'chatgpt';
  if (h.includes('claude.ai'))             return 'claude';
  if (h.includes('gemini.google.com'))     return 'gemini';
  if (h.includes('copilot.microsoft.com')) return 'copilot';
  if (h.includes('perplexity.ai'))         return 'perplexity';
  if (h.includes('mistral.ai'))            return 'mistral';
  if (h.includes('huggingface.co'))        return 'huggingface';
  if (h.includes('groq.com'))              return 'groq';
  return 'unknown';
}

// ─── Detect on text ──
function detect(text) {
  if (!text || text.length < MIN_LENGTH) return [];
  const found = [];
  const seen = new Set();
  for (const [type, re] of Object.entries(PATTERNS)) {
    re.lastIndex = 0;
    const matches = text.match(re);
    if (matches) {
      matches.forEach(m => {
        const trimmed = m.trim();
        const key = `${type}:${trimmed}`;
        if (!seen.has(key)) { seen.add(key); found.push({ type, value: trimmed }); }
      });
    }
  }
  return found;
}

// ─── Create / update detection (audit trail) ──
async function createDetection(type) {
  const auth = await getAuth();
  if (!auth.token) return null;
  try {
    const res = await fetch(`${API_URL}/detections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ platform: detectPlatform(), dataType: type, action: 'detected', urlHost: window.location.hostname }),
    });
    if (res.status === 401 || res.status === 403) { chrome.storage.local.remove(['authToken','user','company']); return null; }
    if (res.ok) {
      const data = await res.json();
      chrome.storage.local.get(['detectionCount'], r => {
        const n = (r.detectionCount || 0) + 1;
        chrome.storage.local.set({ detectionCount: n });
        chrome.runtime.sendMessage({ action: 'updateDetectionCount', count: n }).catch(() => {});
      });
      return { id: data.id };
    }
  } catch (e) { /* silent */ }
  return null;
}
async function updateDetection(detectionId, action) {
  if (!detectionId) return;
  const auth = await getAuth();
  if (!auth.token) return;
  try {
    await fetch(`${API_URL}/detections/${detectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
      body: JSON.stringify({ action }),
    });
  } catch (e) { /* silent */ }
  pendingDetections.delete(detectionId);
}

// ─── Alert CSS (unchanged) ──
(function injectCSS() {
  if (document.getElementById('ai-shield-styles')) return;
  const s = document.createElement('style');
  s.id = 'ai-shield-styles';
  s.textContent = `
    #ai-shield-alert{position:fixed;top:18px;right:18px;z-index:2147483647;width:292px;background:#D92D20;border-radius:12px;padding:0;box-shadow:0 8px 32px rgba(217,45,32,.45),0 2px 8px rgba(0,0,0,.25);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:ai-shield-in .35s cubic-bezier(.34,1.56,.64,1) forwards;overflow:hidden}
    #ai-shield-alert.hiding{animation:ai-shield-out .25s ease forwards}
    @keyframes ai-shield-in{from{opacity:0;transform:scale(.88) translateY(-8px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes ai-shield-out{from{opacity:1;transform:scale(1) translateY(0)}to{opacity:0;transform:scale(.92) translateY(-6px)}}
    #ai-shield-alert .as-head{padding:12px 14px 10px;display:flex;align-items:center;gap:10px}
    #ai-shield-alert .as-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.8);flex-shrink:0;animation:as-pulse 1.8s ease-in-out infinite}
    @keyframes as-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.5)}50%{box-shadow:0 0 0 5px rgba(255,255,255,0)}}
    #ai-shield-alert .as-label{font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);line-height:1;margin-bottom:2px}
    #ai-shield-alert .as-type{font-size:15px;font-weight:700;color:#fff;line-height:1;letter-spacing:.02em}
    #ai-shield-alert .as-shield{margin-left:auto;width:28px;height:28px;background:rgba(255,255,255,.18);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    #ai-shield-alert .as-shield svg{width:16px;height:16px;fill:white}
    #ai-shield-alert .as-divider{height:1px;background:rgba(255,255,255,.18);margin:0 14px}
    #ai-shield-alert .as-actions{display:flex;gap:8px;padding:10px 12px 12px}
    #ai-shield-alert .as-btn{flex:1;padding:7px 0;border-radius:7px;font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:opacity .15s}
    #ai-shield-alert .as-btn:hover{opacity:.85}
    #ai-shield-alert .as-btn-remove{background:rgba(0,0,0,.25);color:white}
    #ai-shield-alert .as-btn-ignore{background:rgba(255,255,255,.15);color:rgba(255,255,255,.85)}
  `;
  (document.head || document.documentElement).appendChild(s);
})();

// ─── Show alert ──
// source: 'text' (has editable target) or 'file' (informational only)
async function showAlert(detections, targetEl, source) {
  const existing = document.getElementById('ai-shield-alert');
  if (existing) existing.remove();
  const types = [...new Set(detections.map(d => d.type))];
  const displayTypes = types.map(t => DISPLAY_LABELS[t] || t.replace(/_/g, ' '));
  const label = displayTypes.length === 1 ? displayTypes[0] : `${displayTypes.length} data types`;

  const createdIds = [];
  for (const type of types) {
    const result = await createDetection(type);
    if (result?.id) {
      createdIds.push(result.id);
      pendingDetections.set(result.id, { type, status: 'detected', timestamp: Date.now() });
    }
  }
  if (createdIds.length === 0) return;

  const isFile = source === 'file';
  const alert = document.createElement('div');
  alert.id = 'ai-shield-alert';
  alert.dataset.detectionIds = createdIds.join(',');
  alert.innerHTML = `
    <div class="as-head">
      <div class="as-dot"></div>
      <div>
        <div class="as-label">Sensitive data ${isFile ? 'in uploaded file' : 'detected'}</div>
        <div class="as-type">${label}</div>
      </div>
      <div class="as-shield"><svg viewBox="0 0 20 20"><path d="M10 1L2 4.5v6C2 14.5 5.5 18.3 10 19c4.5-.7 8-4.5 8-8.5v-6L10 1z"/></svg></div>
    </div>
    <div class="as-divider"></div>
    <div class="as-actions">
      ${isFile
        ? '<button class="as-btn as-btn-ignore" id="as-ack" style="flex:1">Got it</button>'
        : '<button class="as-btn as-btn-remove" id="as-remove">Remove data</button><button class="as-btn as-btn-ignore" id="as-ignore">Send anyway</button>'}
    </div>
  `;
  document.body.appendChild(alert);

  let resolved = false;
  if (isFile) {
    // File alerts are informational: warn (can't clear a file input reliably).
    document.getElementById('as-ack')?.addEventListener('click', () => {
      if (resolved) return; resolved = true;
      createdIds.forEach(id => updateDetection(id, 'sent_anyway'));
      dismissAlert();
    });
    setTimeout(() => { if (resolved) return; resolved = true; createdIds.forEach(id => updateDetection(id, 'ignored')); dismissAlert(); }, 12000);
    return;
  }

  document.getElementById('as-remove').addEventListener('click', () => {
    if (resolved) return; resolved = true;
    if (targetEl && (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT')) {
      targetEl.value = ''; targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (targetEl && targetEl.isContentEditable) {
      targetEl.textContent = ''; targetEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    createdIds.forEach(id => updateDetection(id, 'removed'));
    dismissAlert();
  });
  document.getElementById('as-ignore').addEventListener('click', () => {
    if (resolved) return; resolved = true;
    createdIds.forEach(id => updateDetection(id, 'sent_anyway'));
    dismissAlert();
  });
  setTimeout(() => { if (resolved) return; resolved = true; createdIds.forEach(id => updateDetection(id, 'ignored')); dismissAlert(); }, 12000);
}
function dismissAlert() {
  const el = document.getElementById('ai-shield-alert');
  if (!el) return;
  el.classList.add('hiding');
  setTimeout(() => el && el.remove(), 280);
}

// ─── Text field monitoring (unchanged) ──
const fieldTimers = new WeakMap();
const lastDetected = new WeakMap();
function monitorField(el) {
  el.addEventListener('input', () => {
    clearTimeout(fieldTimers.get(el));
    fieldTimers.set(el, setTimeout(() => {
      const text = el.value !== undefined ? el.value : el.innerText;
      const detections = detect(text);
      if (detections.length === 0) return;
      const key = detections.map(d => d.type + d.value).join('|');
      if (lastDetected.get(el) === key) return;
      lastDetected.set(el, key);
      showAlert(detections, el, 'text');
    }, 300));
  });
}
const observedFields = new WeakSet();
function attachToFields() {
  const selectors = ['textarea','input[type="text"]','div[contenteditable="true"]','div[contenteditable=""]','p[contenteditable="true"]'];
  document.querySelectorAll(selectors.join(',')).forEach(el => {
    if (!observedFields.has(el)) { observedFields.add(el); monitorField(el); }
  });
}

// ══════════════════════════════════════════════════════════
// NEW v1.1.0 — FILE UPLOAD SCANNING (PDF / CSV / XLSX) — LOCAL
// ══════════════════════════════════════════════════════════
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB cap — avoid freezing the page
const scannedFiles = new WeakSet();

// Extract plain text from a File, using the libraries loaded via manifest.
async function extractText(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  try {
    // CSV / plain text — no library needed
    if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt') || type === 'text/csv' || type.startsWith('text/')) {
      return await file.text();
    }
    // XLSX / XLS — SheetJS (global: XLSX)
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheet') || type.includes('excel')) {
      if (typeof XLSX === 'undefined') return null;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      let out = '';
      wb.SheetNames.forEach(sn => { out += XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + '\n'; });
      return out;
    }
    // PDF — pdf.js (global: pdfjsLib)
    if (name.endsWith('.pdf') || type === 'application/pdf') {
      if (typeof pdfjsLib === 'undefined') return null;
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
      } catch (e) { /* worker may already be set */ }
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let out = '';
      const maxPages = Math.min(pdf.numPages, 50); // cap pages for performance
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        out += content.items.map(it => it.str).join(' ') + '\n';
      }
      return out;
    }
  } catch (e) { /* parse failed — silent */ }
  return null;
}

async function scanFile(file) {
  if (!file || scannedFiles.has(file)) return;
  scannedFiles.add(file);
  if (file.size > MAX_FILE_BYTES) return; // too big — skip
  const text = await extractText(file);
  if (!text) return;
  const detections = detect(text);
  if (detections.length === 0) return;
  showAlert(detections, null, 'file');
}

function handleFileList(fileList) {
  if (!fileList) return;
  Array.from(fileList).forEach(f => { scanFile(f); });
}

// Intercept file inputs (button uploads)
function attachToFileInputs() {
  document.querySelectorAll('input[type="file"]').forEach(input => {
    if (observedFields.has(input)) return;
    observedFields.add(input);
    input.addEventListener('change', e => { handleFileList(e.target.files); });
  });
}

// Intercept drag-and-drop (many AI tools accept dropped files)
function attachDragAndDrop() {
  if (window.__aishieldDrop) return;
  window.__aishieldDrop = true;
  document.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFileList(e.dataTransfer.files);
    }
  }, true);
}

// ─── Boot ──
attachToFields();
attachToFileInputs();
attachDragAndDrop();
const domObserver = new MutationObserver(() => { attachToFields(); attachToFileInputs(); });
domObserver.observe(document.body, { childList: true, subtree: true });

// ─── Tab close → abandoned ──
window.addEventListener('beforeunload', () => {
  if (pendingDetections.size === 0) return;
  chrome.storage.local.get(['authToken'], r => {
    if (!r.authToken) return;
    pendingDetections.forEach((info, id) => {
      try {
        fetch(`${API_URL}/detections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${r.authToken}` },
          body: JSON.stringify({ action: 'abandoned' }),
          keepalive: true,
        });
      } catch (e) { /* silent */ }
    });
  });
});
console.log('[AI Shield v1.1.0] Loaded on', detectPlatform(), '— text + file scanning (PDF/CSV/XLSX), expanded detection');
