/* utils.js — shared helpers */

const ICONS = {
  edit:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
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
