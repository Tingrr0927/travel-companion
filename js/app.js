/* app.js — main application entry, routing, initialization */

const App = (() => {
  let currentTripId = null;
  let currentPage = 'trips';

  const PAGES = ['trips', 'itinerary', 'map', 'budget', 'checklist', 'info', 'ai', 'data'];

  function getCurrentTripId() { return currentTripId; }

  function setCurrentTrip(id) {
    try {
      currentTripId = id;
      Storage.set('current_trip', id);
      updateTripBadge();
    } catch(e) {}
  }

  function navigate(pageId) {
    try {
      if (!PAGES.includes(pageId)) return;
      currentPage = pageId;

      // hide all pages
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      // show target
      const target = document.getElementById('page-' + pageId);
      if (target) target.classList.add('active');

      // update nav tabs
      document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.page === pageId);
      });

      // close "more" menu if open
      closeMoreMenu();

      // render module
      renderPage(pageId);

      // update URL hash (no scroll)
      try { history.replaceState(null, '', '#' + pageId); } catch(e) {}
    } catch(e) {}
  }

  function renderPage(pageId) {
    try {
      switch(pageId) {
        case 'trips':      TripsModule.render(); break;
        case 'itinerary':  ItineraryModule.render(); break;
        case 'map':        MapModule.render(); break;
        case 'budget':     BudgetModule.render(); break;
        case 'checklist':  ChecklistModule.render(); break;
        case 'info':       InfoModule.render(); break;
        case 'ai':         AIModule.render(); break;
        case 'data':       DataModule.render(); break;
      }
    } catch(e) {}
  }

  function updateTripBadge() {
    try {
      const badge = document.getElementById('current-trip-badge');
      if (!badge) return;
      if (currentTripId) {
        const trip = TripsModule.getById(currentTripId);
        badge.textContent = trip ? trip.name : '';
        badge.style.display = trip ? 'inline-block' : 'none';
      } else {
        badge.style.display = 'none';
      }
    } catch(e) {}
  }

  function closeMoreMenu() {
    try {
      const menu = document.getElementById('more-menu');
      if (menu) menu.classList.remove('open');
    } catch(e) {}
  }

  function initNavigation() {
    try {
      // bottom nav buttons
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.page));
      });

      // "more" menu toggle
      document.getElementById('more-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        const menu = document.getElementById('more-menu');
        if (menu) menu.classList.toggle('open');
      });

      document.querySelectorAll('.more-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          navigate(item.dataset.page);
        });
      });

      // close more menu on outside click
      document.addEventListener('click', closeMoreMenu);

      // back from sub-pages
      document.querySelectorAll('[data-back]').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.back));
      });
    } catch(e) {}
  }

  function initDataModule() {
    // export
    document.getElementById('export-btn')?.addEventListener('click', () => {
      try {
        const data = Storage.getAll();
        const json = JSON.stringify(data, null, 2);
        const date = new Date().toISOString().split('T')[0];
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `travel-companion-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('資料已匯出');
      } catch(e) { showToast('匯出失敗', 'error'); }
    });

    // import
    document.getElementById('import-file')?.addEventListener('change', async e => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        const ok = await showConfirm('匯入將覆蓋現有資料，確定繼續？');
        if (!ok) { e.target.value = ''; return; }
        const text = await file.text();
        const data = JSON.parse(text);
        if (Storage.importAll(data)) {
          showToast('匯入成功，即將重新載入...');
          setTimeout(() => location.reload(), 1200);
        } else {
          showToast('匯入失敗', 'error');
        }
      } catch(err) {
        showToast('檔案格式錯誤', 'error');
        e.target.value = '';
      }
    });
  }

  function init() {
    try {
      // restore current trip
      currentTripId = Storage.get('current_trip', null);

      // inject static empty state icons that can't be set in HTML directly
      const itinEmpty = document.getElementById('itinerary-empty-icon');
      if (itinEmpty) itinEmpty.innerHTML = icon('calendar', 56, 1.25);

      // init all modules
      TripsModule.init();
      ItineraryModule.init();
      BudgetModule.init();
      ChecklistModule.init();
      InfoModule.init();
      AIModule.init();

      initNavigation();
      initDataModule();

      // register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
          .catch(() => {});
      }

      // determine start page from hash or default
      const hash = location.hash.replace('#', '');
      const startPage = PAGES.includes(hash) ? hash : 'trips';
      navigate(startPage);

      updateTripBadge();
    } catch(e) {}
  }

  return { init, navigate, getCurrentTripId, setCurrentTrip, updateTripBadge };
})();

/* MapModule (simple, defined inline) */
const MapModule = (() => {
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const TYPE_META = {
    attraction: { label: '景點', icon: () => icon('landmark', 22) },
    restaurant:  { label: '餐廳', icon: () => icon('coffee', 22)   },
    hotel:       { label: '住宿', icon: () => icon('bed', 22)      },
    transport:   { label: '交通', icon: () => icon('car', 22)      },
    shopping:    { label: '購物', icon: () => icon('shoppingBag',22)},
    other:       { label: '備用', icon: () => icon('refresh', 22)  },
  };

  function render() {
    try {
      const tripId = App.getCurrentTripId();
      const container = document.getElementById('map-content');
      if (!container) return;

      if (!tripId) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('mapPin',56,1.25)}</div><h3>請先選擇旅程</h3></div>`;
        return;
      }

      const trip = TripsModule.getById(tripId);
      if (!trip) return;

      const allItems = Storage.get('itinerary_' + tripId, []);
      const withLocation = allItems.filter(i => i.address || i.mapsUrl);

      if (!withLocation.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('pin',56,1.25)}</div><h3>尚無地點資訊</h3><p>在行程中加入地址後即可在此查看</p></div>`;
        return;
      }

      const dates = getDatesInRange(trip.startDate, trip.endDate);
      let html = '';

      dates.forEach((date, di) => {
        const dayItems = withLocation.filter(i => i.date === date);
        if (!dayItems.length) return;

        html += `<div class="map-day-section">
          <h3 class="map-day-title">Day ${di + 1} · ${formatDateShort(date)}</h3>`;

        dayItems.forEach(item => {
          const meta = TYPE_META[item.type] || TYPE_META.other;
          const addr = item.address || '';
          const mapsUrl = item.mapsUrl || '';
          const appUrl = `https://maps.google.com/?q=${encodeURIComponent(addr)}&api=1`;
          const webUrl = mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(addr)}`;

          html += `
            <div class="map-item">
              <div class="map-item-info">
                <span class="map-item-icon">${meta.icon()}</span>
                <div>
                  <div class="map-item-name">${escapeHtml(item.name)}</div>
                  ${addr ? `<div class="map-item-addr">${escapeHtml(addr)}</div>` : ''}
                </div>
              </div>
              <div class="map-item-btns">
                <a href="${escapeHtml(appUrl)}" target="_blank" class="btn btn-sm btn-outline">${icon('pin',14,2)} App</a>
                <a href="${escapeHtml(webUrl)}" target="_blank" class="btn btn-sm btn-primary">${icon('globe',14,2)} 網頁</a>
              </div>
            </div>`;
        });

        html += `</div>`;
      });

      container.innerHTML = html;
    } catch(e) {}
  }

  return { render };
})();

/* DataModule */
const DataModule = (() => {
  function render() {
    // content is static HTML
  }
  return { render };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  try {
    App.init();
  } catch(e) {}
});
