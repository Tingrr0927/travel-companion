/* app.js — application entry point (ES module)
 * Single <script type="module"> referenced in HTML.
 * Imports all feature modules and orchestrates init, routing, and Firebase Auth.
 */

// ── Firebase / data imports ─────────────────────────────────────────────────
import { initAuth, getDisplayName, setDisplayName } from './auth.js';
import { State, getCurrentTripId, setCurrentTripId } from './state.js';
import {
  getCachedTrip, getCachedTrips, getCachedItems,
  exportAllData, LocalStorage, subscribeTrips,
  createTrip, createItem, createExpense, saveChecklist,
  saveBudgetLimit, saveInfo,
} from './storage.js';
import { joinTripByCode, copyInviteLink, shareToLine } from './share.js';

// ── Feature module imports ───────────────────────────────────────────────────
import { TripsModule }    from './trips.js';
import { ItineraryModule } from './itinerary.js';
import { BudgetModule }   from './budget.js';
import { ChecklistModule } from './checklist.js';
import { InfoModule }     from './info.js';
import { AIModule }       from './ai.js';

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

const PAGES = ['trips','itinerary','map','budget','checklist','info','ai','data'];
let _currentPage = 'trips';

function navigate(pageId) {
  try {
    if (!PAGES.includes(pageId)) return;
    _currentPage = pageId;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.page === pageId)
    );
    closeMoreMenu();

    const tripId = getCurrentTripId();
    switch (pageId) {
      case 'trips':     TripsModule.render();           break;
      case 'itinerary': ItineraryModule.render(tripId); break;
      case 'map':       MapModule.render(tripId);       break;
      case 'budget':    BudgetModule.render(tripId);    break;
      case 'checklist': ChecklistModule.render(tripId); break;
      case 'info':      InfoModule.render(tripId);      break;
      case 'ai':        AIModule.render();              break;
      case 'data':      /* static */                    break;
    }
    try { history.replaceState(null, '', '#' + pageId); } catch(e) {}
  } catch(e) {}
}

// Register navigate so state.js module consumers can call navigate()
State._navigateFn = navigate;

// ---------------------------------------------------------------------------
// Trip badge
// ---------------------------------------------------------------------------

function updateTripBadge() {
  try {
    const badge  = document.getElementById('current-trip-badge');
    if (!badge) return;
    const tripId = getCurrentTripId();
    const trip   = tripId ? getCachedTrip(tripId) : null;
    if (trip) {
      badge.textContent = trip.name;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}

// ---------------------------------------------------------------------------
// More menu
// ---------------------------------------------------------------------------

function closeMoreMenu() {
  try { document.getElementById('more-menu')?.classList.remove('open'); } catch(e) {}
}

// ---------------------------------------------------------------------------
// Network status
// ---------------------------------------------------------------------------

function initNetworkStatus() {
  window.addEventListener('online',  () => showToast('已恢復連線，資料同步中…'));
  window.addEventListener('offline', () => showToast('目前離線，顯示快取資料', 'error'));
}

// ---------------------------------------------------------------------------
// Invite URL handling
// ---------------------------------------------------------------------------

async function handleInviteParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('invite');
    if (!code) return;

    const existingTrip = getCachedTrips().find(t => t.inviteCode === code.toUpperCase());
    const label = existingTrip ? existingTrip.name : `邀請碼 ${code.toUpperCase()}`;

    const confirmed = await showConfirm(`你被邀請加入旅程「${label}」，確定加入？`);
    history.replaceState({}, '', window.location.pathname);
    if (!confirmed) return;

    const tripId = await joinTripByCode(code);
    setCurrentTripId(tripId);
    updateTripBadge();
    navigate('itinerary');
    showToast('已成功加入旅程！');
  } catch(e) {
    if (e.message) showToast(e.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Join trip by code dialog
// ---------------------------------------------------------------------------

function openJoinDialog() {
  try {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>輸入邀請碼加入旅程</p>
        <input type="text" id="join-code-input" class="form-input"
          style="margin:12px 0;text-transform:uppercase;letter-spacing:3px"
          placeholder="例：ABC123" maxlength="6">
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="join-cancel">取消</button>
          <button class="btn btn-primary"   id="join-ok">加入</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#join-code-input');
    input.focus();

    const doJoin = async () => {
      const code = input.value.trim().toUpperCase();
      if (!code) { showToast('請輸入邀請碼', 'error'); return; }
      overlay.remove();
      try {
        const tripId = await joinTripByCode(code);
        setCurrentTripId(tripId);
        updateTripBadge();
        navigate('itinerary');
        showToast('已成功加入旅程！');
      } catch(e) { showToast(e.message || '加入失敗', 'error'); }
    };
    overlay.querySelector('#join-ok').addEventListener('click', doJoin);
    overlay.querySelector('#join-cancel').addEventListener('click', () => overlay.remove());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  } catch(e) {}
}

// ---------------------------------------------------------------------------
// Nickname setup sheet
// ---------------------------------------------------------------------------

function showNicknameSheet() {
  return new Promise(resolve => {
    try {
      openBottomSheet('nickname-sheet');
      const saveBtn = document.getElementById('save-nickname-btn');
      const input   = document.getElementById('nickname-input');
      if (input) setTimeout(() => input.focus(), 300);

      const handler = () => {
        const name = input?.value.trim() || '旅伴';
        setDisplayName(name);
        closeBottomSheet('nickname-sheet');
        resolve();
      };
      saveBtn?.addEventListener('click', handler, { once: true });
      input?.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); }, { once: true });
    } catch(e) { resolve(); }
  });
}

// ---------------------------------------------------------------------------
// Share sheet wiring
// ---------------------------------------------------------------------------

function initShareSheet() {
  try {
    document.getElementById('share-sheet-close')?.addEventListener('click', () =>
      closeBottomSheet('share-sheet')
    );

    document.getElementById('copy-code-btn')?.addEventListener('click', async () => {
      const code = document.getElementById('invite-code-text')?.textContent?.trim();
      if (code && code !== '—') {
        try { await navigator.clipboard.writeText(code); showToast('邀請碼已複製'); }
        catch(e) { showToast('複製失敗', 'error'); }
      }
    });

    document.getElementById('copy-invite-link-btn')?.addEventListener('click', async () => {
      try {
        const tripId = TripsModule._shareCurrentTripId || getCurrentTripId();
        const trip   = getCachedTrip(tripId);
        if (!trip?.inviteCode) return;
        await copyInviteLink(trip.inviteCode);
        showToast('邀請連結已複製！');
      } catch(e) { showToast(e.message || '複製失敗', 'error'); }
    });

    document.getElementById('share-line-btn')?.addEventListener('click', () => {
      try {
        const tripId = TripsModule._shareCurrentTripId || getCurrentTripId();
        const trip   = getCachedTrip(tripId);
        if (trip?.inviteCode) shareToLine(trip.inviteCode);
      } catch(e) {}
    });
  } catch(e) {}
}

// ---------------------------------------------------------------------------
// Data module (export / import)
// ---------------------------------------------------------------------------

function initDataModule() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    try {
      const data = exportAllData();
      const date = new Date().toISOString().split('T')[0];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url, download: `travel-companion-backup-${date}.json`,
      });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('資料已匯出');
    } catch(e) { showToast('匯出失敗', 'error'); }
  });

  document.getElementById('import-file')?.addEventListener('change', async e => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await showConfirm('匯入將覆蓋現有資料，確定繼續？');
      if (!ok) { e.target.value = ''; return; }
      showToast('目前版本請使用「匯入舊資料」功能', 'error');
      e.target.value = '';
    } catch(e) { showToast('匯入失敗', 'error'); e.target.value = ''; }
  });
}

// ---------------------------------------------------------------------------
// Map module (no Firestore, reads from cache)
// ---------------------------------------------------------------------------

const MapModule = (() => {
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const TYPE_ICON = {
    attraction: () => icon('landmark',22), restaurant: () => icon('coffee',22),
    hotel:      () => icon('bed',22),      transport:  () => icon('car',22),
    shopping:   () => icon('shoppingBag',22), other:   () => icon('refresh',22),
  };

  function render(tripId) {
    try {
      const container = document.getElementById('map-content');
      if (!container) return;
      if (!tripId) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('mapPin',56,1.25)}</div><h3>請先選擇旅程</h3></div>`;
        return;
      }
      const trip = getCachedTrip(tripId);
      if (!trip) return;

      const withLoc = getCachedItems(tripId).filter(i => i.address || i.mapsUrl);
      if (!withLoc.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('pin',56,1.25)}</div><h3>尚無地點資訊</h3><p>在行程中加入地址後即可在此查看</p></div>`;
        return;
      }

      const dates = getDatesInRange(trip.startDate, trip.endDate);
      let html = '';
      dates.forEach((date, di) => {
        const dayItems = withLoc.filter(i => i.date === date);
        if (!dayItems.length) return;
        html += `<div class="map-day-section"><h3 class="map-day-title">Day ${di+1} · ${formatDateShort(date)}</h3>`;
        dayItems.forEach(item => {
          const typeIcon = (TYPE_ICON[item.type] || TYPE_ICON.other)();
          const addr   = item.address || '';
          const appUrl = `https://maps.google.com/?q=${encodeURIComponent(addr)}&api=1`;
          const webUrl = item.mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(addr)}`;
          html += `
            <div class="map-item">
              <div class="map-item-info">
                <span class="map-item-icon">${typeIcon}</span>
                <div>
                  <div class="map-item-name">${esc(item.name)}</div>
                  ${addr ? `<div class="map-item-addr">${esc(addr)}</div>` : ''}
                </div>
              </div>
              <div class="map-item-btns">
                <a href="${esc(appUrl)}" target="_blank" class="btn btn-sm btn-outline">${icon('pin',14,2)} App</a>
                <a href="${esc(webUrl)}" target="_blank" class="btn btn-sm btn-primary">${icon('globe',14,2)} 網頁</a>
              </div>
            </div>`;
        });
        html += '</div>';
      });
      container.innerHTML = html;
    } catch(e) {}
  }
  return { render };
})();

// ---------------------------------------------------------------------------
// One-time localStorage migration
// ---------------------------------------------------------------------------

async function offerMigration() {
  try {
    if (localStorage.getItem('tc_migrated_to_firebase')) return;
    const rawTrips = localStorage.getItem('tc_trips');
    if (!rawTrips) return;
    const trips = JSON.parse(rawTrips);
    if (!trips?.length) return;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>偵測到本機有 ${trips.length} 筆舊旅程資料</p>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:-12px">是否匯入到雲端？</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="mig-skip">略過</button>
          <button class="btn btn-primary"   id="mig-ok">匯入</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#mig-skip').addEventListener('click', () => {
      overlay.remove();
      localStorage.setItem('tc_migrated_to_firebase', 'skipped');
    });

    overlay.querySelector('#mig-ok').addEventListener('click', async () => {
      overlay.remove();
      showToast('匯入中，請稍候…');
      try {
        for (const trip of trips) {
          const newId = await createTrip({
            name: trip.name, country: trip.country || '', city: trip.city || '',
            startDate: trip.startDate, endDate: trip.endDate, notes: trip.notes || '',
          });
          if (trip.coverImage) LocalStorage.setCover(newId, trip.coverImage);

          const items    = JSON.parse(localStorage.getItem('tc_itinerary_' + trip.id) || '[]');
          const expenses = JSON.parse(localStorage.getItem('tc_expenses_'  + trip.id) || '[]');
          const clRaw    = localStorage.getItem('tc_checklist_' + trip.id);
          const cl       = clRaw ? JSON.parse(clRaw) : null;
          const info     = JSON.parse(localStorage.getItem('tc_info_'          + trip.id) || 'null');
          const budget   = Number(localStorage.getItem('tc_budget_limit_' + trip.id)) || 0;

          for (const item of items)    await createItem(newId, { ...item, id: undefined, tripId: newId });
          for (const exp  of expenses) await createExpense(newId, { ...exp, id: undefined, tripId: newId });
          if (cl) await saveChecklist(newId, Array.isArray(cl) ? cl : (cl.groups || []));
          if (info)   await saveInfo(newId, info);
          if (budget) await saveBudgetLimit(newId, budget);
        }
        localStorage.setItem('tc_migrated_to_firebase', 'done');
        showToast('匯入完成！');
      } catch(e) {
        showToast('部分資料匯入失敗：' + (e.message || ''), 'error');
        localStorage.setItem('tc_migrated_to_firebase', 'error');
      }
    });
  } catch(e) {}
}

// ---------------------------------------------------------------------------
// Navigation wiring
// ---------------------------------------------------------------------------

function initNavigation() {
  try {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.id !== 'more-btn') btn.addEventListener('click', () => navigate(btn.dataset.page));
    });

    document.getElementById('more-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('more-menu')?.classList.toggle('open');
    });

    document.querySelectorAll('.more-menu-item[data-page]').forEach(item =>
      item.addEventListener('click', () => navigate(item.dataset.page))
    );

    document.querySelectorAll('[data-back]').forEach(btn =>
      btn.addEventListener('click', () => navigate(btn.dataset.back))
    );

    document.addEventListener('click', closeMoreMenu);
    document.querySelector('.sheet-overlay')?.addEventListener('click', closeAllSheets);

    document.getElementById('join-trip-menu-btn')?.addEventListener('click', () => {
      closeMoreMenu();
      openJoinDialog();
    });
  } catch(e) {}
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
  try {
    // Inject SVG icon that can't be set in plain HTML (requires JS globals)
    const itinEmpty = document.getElementById('itinerary-empty-icon');
    if (itinEmpty) itinEmpty.innerHTML = icon('calendar', 56, 1.25);

    // Wait for Firebase anonymous auth
    await initAuth();

    // First-time: ask for a display name
    if (!getDisplayName()) await showNicknameSheet();

    // Init all modules
    TripsModule.init();
    ItineraryModule.init();
    BudgetModule.init();
    ChecklistModule.init();
    InfoModule.init();
    AIModule.init();

    // Wire UI
    initNavigation();
    initDataModule();
    initShareSheet();
    initNetworkStatus();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }

    // Restore last active trip
    const saved = localStorage.getItem('tc_current_trip');
    if (saved) setCurrentTripId(saved);

    // Keep trip badge up to date as Firestore syncs
    subscribeTrips(() => updateTripBadge());

    // Handle invite URL param before first render
    await handleInviteParam();

    // Offer one-time migration from localStorage
    await offerMigration();

    // Render start page
    const hash = location.hash.replace('#', '');
    navigate(PAGES.includes(hash) ? hash : 'trips');

    updateTripBadge();
  } catch(e) {
    console.error('[app] init error:', e);
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100vh;padding:24px;text-align:center;font-family:sans-serif">
        <h2 style="color:#1A1A2E">無法連線到 Firebase</h2>
        <p style="color:#6B7280;margin-top:8px">請確認已在 js/firebase.js 填入正確的 Firebase 設定</p>
        <pre style="font-size:12px;color:#EF4444;margin-top:12px;white-space:pre-wrap">${e.message || ''}</pre>
        <button onclick="location.reload()"
          style="margin-top:24px;padding:12px 24px;background:#4F7EFF;color:#fff;
                 border:none;border-radius:10px;font-size:15px;cursor:pointer">重試</button>
      </div>`;
  }
}

// Modules are automatically deferred — DOM is ready when this runs
init();
