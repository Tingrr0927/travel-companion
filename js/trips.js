/* trips.js — trip CRUD module */

const TripsModule = (() => {
  function getAll() {
    return Storage.get('trips', []);
  }

  function getById(id) {
    return getAll().find(t => t.id === id) || null;
  }

  function save(tripData) {
    try {
      const trips = getAll();
      const existing = trips.findIndex(t => t.id === tripData.id);
      if (existing >= 0) {
        trips[existing] = tripData;
      } else {
        trips.unshift(tripData);
      }
      Storage.set('trips', trips);
      return true;
    } catch(e) { return false; }
  }

  function remove(id) {
    try {
      const trips = getAll().filter(t => t.id !== id);
      Storage.set('trips', trips);
      // also remove related data
      Storage.remove('itinerary_' + id);
      Storage.remove('budget_' + id);
      Storage.remove('checklist_' + id);
      Storage.remove('info_' + id);
      Storage.remove('expenses_' + id);
      return true;
    } catch(e) { return false; }
  }

  function getProgress(tripId) {
    try {
      const items = Storage.get('itinerary_' + tripId, []);
      if (!items.length) return 0;
      const done = items.filter(i => i.completed).length;
      return Math.round((done / items.length) * 100);
    } catch(e) { return 0; }
  }

  function getTotalBudget(tripId) {
    try {
      const expenses = Storage.get('expenses_' + tripId, []);
      const items = Storage.get('itinerary_' + tripId, []);
      const expTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const itemTotal = items.reduce((s, i) => s + (Number(i.actualCost) || 0), 0);
      return expTotal + itemTotal;
    } catch(e) { return 0; }
  }

  function render() {
    try {
      const container = document.getElementById('trips-list');
      if (!container) return;
      const trips = getAll();

      if (!trips.length) {
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
        const spent = getTotalBudget(trip.id);
        const coverStyle = trip.coverImage
          ? `background-image: url('${trip.coverImage}'); background-size: cover; background-position: center;`
          : `background: ${getCountryGradient(trip.country || trip.name)};`;

        return `
          <div class="trip-card" data-id="${trip.id}">
            <div class="trip-cover" style="${coverStyle}">
              <div class="trip-cover-overlay">
                <h2 class="trip-name">${escapeHtml(trip.name)}</h2>
                <p class="trip-location">${escapeHtml(trip.country)} · ${escapeHtml(trip.city)}</p>
              </div>
            </div>
            <div class="trip-body">
              <div class="trip-meta">
                <span class="trip-dates">${icon('calendar',13,2)} ${formatDateShort(trip.startDate)} ~ ${formatDateShort(trip.endDate)} ${trip.startDate.split('-')[0]}</span>
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

      // bind card clicks
      container.querySelectorAll('.trip-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          App.setCurrentTrip(id);
          App.navigate('itinerary');
        });
      });
    } catch(e) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function openForm(tripId = null) {
    try {
      const form = document.getElementById('trip-form');
      const titleEl = document.getElementById('trip-form-title');
      if (!form) return;

      form.reset();
      document.getElementById('trip-form-id').value = '';
      if (tripId) {
        const trip = getById(tripId);
        if (!trip) return;
        titleEl.textContent = '編輯旅程';
        document.getElementById('trip-form-id').value = trip.id;
        document.getElementById('trip-name-input').value = trip.name || '';
        document.getElementById('trip-country-input').value = trip.country || '';
        document.getElementById('trip-city-input').value = trip.city || '';
        document.getElementById('trip-start-input').value = trip.startDate || '';
        document.getElementById('trip-end-input').value = trip.endDate || '';
        document.getElementById('trip-notes-input').value = trip.notes || '';
        document.getElementById('trip-cover-preview').style.display = trip.coverImage ? 'block' : 'none';
        if (trip.coverImage) document.getElementById('trip-cover-preview').src = trip.coverImage;
      } else {
        titleEl.textContent = '新增旅程';
        document.getElementById('trip-cover-preview').style.display = 'none';
      }
      openBottomSheet('trip-sheet');
    } catch(e) {}
  }

  function handleSubmit(e) {
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

      const tripData = {
        id: id || generateId(),
        name, country, city, startDate, endDate, notes,
        coverImage: document.getElementById('trip-cover-preview').style.display !== 'none'
          ? document.getElementById('trip-cover-preview').src
          : null,
        createdAt: id ? (getById(id)||{}).createdAt || new Date().toISOString() : new Date().toISOString(),
      };

      if (save(tripData)) {
        // init checklist for new trip
        if (!id) {
          ChecklistModule.initDefaults(tripData.id);
        }
        closeBottomSheet('trip-sheet');
        render();
        showToast(id ? '旅程已更新' : '旅程已建立');
      } else {
        showToast('儲存失敗', 'error');
      }
    } catch(e) { showToast('發生錯誤', 'error'); }
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
    } catch(e) {}
  }

  return { init, render, getAll, getById, save, remove, openForm, getProgress, getTotalBudget };
})();
