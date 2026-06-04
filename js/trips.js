/* trips.js — trip CRUD module (Firestore-backed ES module) */

import { subscribeTrips, createTrip, updateTrip, deleteTrip, getCachedTrips, getCachedTrip, getCachedItems, getCachedExpenses, LocalStorage } from './storage.js';
import { getCurrentUser, getDisplayName } from './auth.js';
import { setCurrentTripId, navigate } from './state.js';
import { ChecklistModule } from './checklist.js';

export const TripsModule = (() => {
  let _unsubTrips = null;
  let _shareCurrentTripId = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getById(id) {
    return getCachedTrip(id);
  }

  function getProgress(tripId) {
    try {
      const items = getCachedItems(tripId) || [];
      if (!items.length) return 0;
      const done = items.filter(i => i.completed).length;
      return Math.round((done / items.length) * 100);
    } catch(e) { return 0; }
  }

  function getTotalSpent(tripId) {
    try {
      const expenses = getCachedExpenses(tripId) || [];
      const items = getCachedItems(tripId) || [];
      const expTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const itemTotal = items.reduce((s, i) => s + (Number(i.actualCost) || 0), 0);
      return expTotal + itemTotal;
    } catch(e) { return 0; }
  }

  function renderTripCards(trips) {
    try {
      const container = document.getElementById('trips-list');
      if (!container) return;

      if (!trips || !trips.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${icon('suitcase',56,1.25)}</div>
            <h3>還沒有旅程</h3>
            <p>點擊右下角按鈕開始規劃你的第一次旅行</p>
          </div>`;
        return;
      }

      container.innerHTML = trips.map(trip => {
        const days = calcDays(trip.startDate, trip.endDate);
        const progress = getProgress(trip.id);
        const spent = getTotalSpent(trip.id);
        const coverImg = LocalStorage.getCover(trip.id);
        const coverStyle = coverImg
          ? `background-image: url('${coverImg}'); background-size: cover; background-position: center;`
          : `background: ${getCountryGradient(trip.country || trip.name)};`;

        const members = trip.members || [];
        const memberBadge = members.length > 1
          ? `<div class="trip-member-badge">${icon('users',12,2)} ${members.length}</div>`
          : '';

        return `
          <div class="trip-card" data-id="${trip.id}">
            <div class="trip-cover" style="${coverStyle}">
              ${memberBadge}
              <button class="trip-share-btn icon-btn" data-id="${trip.id}" title="分享">${icon('share',16,2)}</button>
              <div class="trip-cover-overlay">
                <h2 class="trip-name">${escapeHtml(trip.name)}</h2>
                <p class="trip-location">${escapeHtml(trip.country)} · ${escapeHtml(trip.city)}</p>
              </div>
            </div>
            <div class="trip-body">
              <div class="trip-meta">
                <span class="trip-dates">${icon('calendar',13,2)} ${formatDateShort(trip.startDate)} ~ ${formatDateShort(trip.endDate)} ${(trip.startDate||'').split('-')[0]}</span>
                <span class="trip-days">${days} 天</span>
              </div>
              <div class="trip-stats">
                <span class="trip-spent">${icon('creditCard',13,2)} ${formatMoney(spent)}</span>
                <div class="trip-progress-wrap">
                  <div class="trip-progress-bar" style="width:${progress}%"></div>
                </div>
                <span class="trip-progress-label">${progress}%</span>
              </div>
            </div>
          </div>`;
      }).join('');

      // bind card clicks (not share btn)
      container.querySelectorAll('.trip-card').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.closest('.trip-share-btn')) return;
          const id = card.dataset.id;
          setCurrentTripId(id);
          navigate('itinerary');
        });
      });

      // bind share buttons
      container.querySelectorAll('.trip-share-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openShareSheet(btn.dataset.id);
        });
      });
    } catch(e) {}
  }

  function render() {
    try {
      const container = document.getElementById('trips-list');
      if (!container) return;

      // Show skeleton if no data yet
      const cached = getCachedTrips();
      if (!cached) {
        container.innerHTML = `
          <div class="skeleton-list">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>`;
      } else {
        renderTripCards(cached);
      }

      // Start subscription if not yet started
      if (!_unsubTrips) {
        _unsubTrips = subscribeTrips(trips => {
          renderTripCards(trips);
        });
      }
    } catch(e) {}
  }

  function openShareSheet(tripId) {
    try {
      const trip = getCachedTrip(tripId);
      if (!trip) return;
      _shareCurrentTripId = tripId;

      const codeEl = document.getElementById('invite-code-text');
      if (codeEl) codeEl.textContent = trip.inviteCode || '—';

      const membersEl = document.getElementById('share-members-list');
      if (membersEl) {
        const members     = trip.members || [];
        const memberNames = trip.memberNames || {};
        const currentUid  = getCurrentUser()?.uid;
        membersEl.innerHTML = members.length
          ? members.map(uid => {
              const name = memberNames[uid] || '旅伴';
              const isMe = uid === currentUid ? '（你）' : '';
              return `<span class="share-member-chip">${icon('user',14,2)} ${escapeHtml(name)}${isMe}</span>`;
            }).join('')
          : '<span style="color:var(--text-secondary)">僅你一人</span>';
      }

      openBottomSheet('share-sheet');
    } catch(e) {}
  }

  function openForm(tripId = null) {
    try {
      const form = document.getElementById('trip-form');
      const titleEl = document.getElementById('trip-form-title');
      if (!form) return;

      form.reset();
      document.getElementById('trip-form-id').value = '';
      const preview = document.getElementById('trip-cover-preview');

      if (tripId) {
        const trip = getCachedTrip(tripId);
        if (!trip) return;
        titleEl.textContent = '編輯旅程';
        document.getElementById('trip-form-id').value = trip.id;
        document.getElementById('trip-name-input').value = trip.name || '';
        document.getElementById('trip-country-input').value = trip.country || '';
        document.getElementById('trip-city-input').value = trip.city || '';
        document.getElementById('trip-start-input').value = trip.startDate || '';
        document.getElementById('trip-end-input').value = trip.endDate || '';
        document.getElementById('trip-notes-input').value = trip.notes || '';
        const cover = LocalStorage.getCover(trip.id);
        if (cover && preview) {
          preview.src = cover;
          preview.style.display = 'block';
        } else if (preview) {
          preview.style.display = 'none';
        }
      } else {
        titleEl.textContent = '新增旅程';
        if (preview) preview.style.display = 'none';
      }
      openBottomSheet('trip-sheet');
    } catch(e) {}
  }

  async function handleSubmit(e) {
    try {
      e.preventDefault();
      const id = document.getElementById('trip-form-id').value;
      const name = document.getElementById('trip-name-input').value.trim();
      const country = document.getElementById('trip-country-input').value.trim();
      const city = document.getElementById('trip-city-input').value.trim();
      const startDate = document.getElementById('trip-start-input').value;
      const endDate = document.getElementById('trip-end-input').value;
      const notes = document.getElementById('trip-notes-input').value.trim();

      if (!name) { showToast('請輸入旅程名稱', 'error'); return; }
      if (!startDate || !endDate) { showToast('請選擇日期', 'error'); return; }
      if (endDate < startDate) { showToast('回程日期不能早於出發日期', 'error'); return; }

      const preview = document.getElementById('trip-cover-preview');
      const hasCover = preview && preview.style.display !== 'none' && preview.src;

      const tripData = {
        name, country, city, startDate, endDate, notes,
      };

      if (id) {
        // editing existing
        await updateTrip(id, tripData);
        if (hasCover) LocalStorage.setCover(id, preview.src);
        closeBottomSheet('trip-sheet');
        showToast('旅程已更新');
      } else {
        // create new
        const newId = await createTrip(tripData);
        if (hasCover) LocalStorage.setCover(newId, preview.src);
        // init checklist defaults for new trip
        await ChecklistModule.initDefaults(newId);
        closeBottomSheet('trip-sheet');
        showToast('旅程已建立');
      }
    } catch(err) {
      showToast('儲存失敗：' + (err.message || '發生錯誤'), 'error');
    }
  }

  function init() {
    try {
      // cover image preview
      const coverInput = document.getElementById('trip-cover-input');
      if (coverInput) {
        coverInput.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { showToast('圖片過大，請選擇 5MB 以下的圖片', 'error'); return; }
          try {
            const b64 = await resizeBase64Image(file, 500);
            const preview = document.getElementById('trip-cover-preview');
            preview.src = b64;
            preview.style.display = 'block';
          } catch(err) { showToast(err.message || '圖片處理失敗', 'error'); }
        });
      }

      const form = document.getElementById('trip-form');
      if (form) form.addEventListener('submit', handleSubmit);

      document.getElementById('add-trip-btn')?.addEventListener('click', () => openForm());
      document.getElementById('trip-sheet-close')?.addEventListener('click', () => closeBottomSheet('trip-sheet'));

      // share sheet close
      document.getElementById('share-sheet-close')?.addEventListener('click', () => closeBottomSheet('share-sheet'));
    } catch(e) {}
  }

  // Expose _shareCurrentTripId for app.js share sheet wiring
  const publicAPI = { init, render, getById, getProgress, getTotalSpent, openForm, openShareSheet };
  Object.defineProperty(publicAPI, '_shareCurrentTripId', { get: () => _shareCurrentTripId });
  return publicAPI;
})();
