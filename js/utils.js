/* utils.js — shared helpers */

/* ── Icon system ── */
const _P = {
  edit:        `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  trash:       `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>`,
  warning:     `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  pin:         `<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>`,
  globe:       `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>`,
  camera:      `<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>`,
  upload:      `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
  download:    `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
  clipboard:   `<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>`,
  zap:         `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  clock:       `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  calendar:    `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  creditCard:  `<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>`,
  barChart:    `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
  suitcase:    `<rect x="2" y="8" width="20" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>`,
  checkSquare: `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>`,
  info:        `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="0.5" fill="currentColor" stroke-width="3"/>`,
  mapPin:      `<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>`,
  /* item types */
  landmark:    `<path d="M3 22h18M3 10h18M12 2L3 10M12 2l9 8M5 10v12M9 10v12M15 10v12M19 10v12"/>`,
  coffee:      `<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`,
  bed:         `<path d="M2 4v16"/><path d="M2 8h18a2 2 0 012 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>`,
  car:         `<rect x="1" y="8" width="22" height="11" rx="2"/><path d="M5 8l2-5h10l2 5"/>`,
  shoppingBag: `<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>`,
  refresh:     `<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>`,
  /* budget categories */
  plane:       `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
  bus:         `<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>`,
  utensils:    `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>`,
  tag:         `<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`,
  archive:     `<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>`,
  /* info sections */
  phone:       `<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.69a19.79 19.79 0 01-3-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v3z"/>`,
};

function icon(name, size = 24, sw = 1.75) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${_P[name] || ''}</svg>`;
}

const ICONS = {
  edit:  icon('edit', 16, 2),
  trash: icon('trash', 16, 2),
};

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch(e) {}
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

function formatMoney(amount) {
  const n = Number(amount);
  if (isNaN(n)) return 'NT$ 0';
  return `NT$ ${n.toLocaleString('zh-TW')}`;
}

function calcDays(start, end) {
  const s = new Date(start), e = new Date(end);
  const diff = Math.round((e - s) / 86400000) + 1;
  return diff > 0 ? diff : 1;
}

function getDatesInRange(start, end) {
  const dates = [];
  let cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function timeToMinutes(t) {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(s1, e1, s2, e2) {
  const a = timeToMinutes(s1), b = timeToMinutes(e1);
  const c = timeToMinutes(s2), d = timeToMinutes(e2);
  if (a < 0 || b < 0 || c < 0 || d < 0) return false;
  return a < d && b > c;
}

function showToast(message, type = 'success') {
  try {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  } catch(e) {}
}

function showConfirm(message) {
  return new Promise(resolve => {
    try {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="confirm-cancel">取消</button>
            <button class="btn btn-danger" id="confirm-ok">確定刪除</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#confirm-ok').addEventListener('click', () => { overlay.remove(); resolve(true); });
      overlay.querySelector('#confirm-cancel').addEventListener('click', () => { overlay.remove(); resolve(false); });
    } catch(e) { resolve(false); }
  });
}

function getCountryGradient(name) {
  const palettes = [
    ['#4F7EFF','#8B5CF6'], ['#FF7043','#FF9A3C'], ['#06B6D4','#4F7EFF'],
    ['#22C55E','#06B6D4'], ['#EC4899','#8B5CF6'], ['#F59E0B','#FF7043'],
    ['#3561E0','#22C55E'], ['#8B5CF6','#EC4899'],
  ];
  let hash = 0;
  for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `linear-gradient(135deg, ${palettes[Math.abs(hash) % palettes.length].join(', ')})`;
}

function openBottomSheet(sheetId) {
  try {
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;
    sheet.classList.add('open');
    document.body.classList.add('sheet-open');
  } catch(e) {}
}

function closeBottomSheet(sheetId) {
  try {
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;
    sheet.classList.remove('open');
    document.body.classList.remove('sheet-open');
  } catch(e) {}
}

function closeAllSheets() {
  try {
    document.querySelectorAll('.bottom-sheet.open').forEach(s => s.classList.remove('open'));
    document.body.classList.remove('sheet-open');
  } catch(e) {}
}

function resizeBase64Image(file, maxKB = 500) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          let quality = 0.9;
          let result = canvas.toDataURL('image/jpeg', quality);
          while (result.length > maxKB * 1024 * 1.37 && quality > 0.3) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }
          if (result.length > maxKB * 1024 * 1.37) {
            reject(new Error('圖片過大，請選擇較小的圖片（< 500KB）'));
          } else {
            resolve(result);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch(e) { reject(e); }
  });
}
