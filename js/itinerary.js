/* itinerary.js — daily itinerary module */

const ItineraryModule = (() => {
  const TYPE_META = {
    attraction: { label: '景點', icon: '🏛️', color: '#4F7EFF' },
    restaurant:  { label: '餐廳', icon: '🍜', color: '#FF7043' },
    hotel:       { label: '住宿', icon: '🏨', color: '#8B5CF6' },
    transport:   { label: '交通', icon: '🚗', color: '#06B6D4' },
    shopping:    { label: '購物', icon: '🛍️', color: '#EC4899' },
    other:       { label: '備用', icon: '🔄', color: '#6B7280' },
  };

  let currentDay = null;
  let sortableInstances = [];
  let longPressTimer = null;

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getItems(tripId) {
    return Storage.get('itinerary_' + tripId, []);
  }

  function saveItems(tripId, items) {
    return Storage.set('itinerary_' + tripId, items);
  }

  function getItemsByDay(tripId, date) {
    return getItems(tripId)
      .filter(i => i.date === date)
      .sort((a, b) => {
        const ta = timeToMinutes(a.startTime), tb = timeToMinutes(b.startTime);
        if (ta !== tb) return ta - tb;
        return (a.order || 0) - (b.order || 0);
      });
  }

  function detectConflicts(items) {
    const conflicts = {};
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (timesOverlap(items[i].startTime, items[i].endTime, items[j].startTime, items[j].endTime)) {
          conflicts[items[i].id] = items[j].name;
          conflicts[items[j].id] = items[i].name;
        }
      }
    }
    return conflicts;
  }

  function renderDayTabs() {
    try {
      const tripId = App.getCurrentTripId();
      if (!tripId) return;
      const trip = TripsModule.getById(tripId);
      if (!trip) return;

      const dates = getDatesInRange(trip.startDate, trip.endDate);
      const tabsEl = document.getElementById('day-tabs');
      if (!tabsEl) return;

      if (!currentDay || !dates.includes(currentDay)) {
        currentDay = dates[0];
      }

      tabsEl.innerHTML = dates.map((d, i) => `
        <button class="day-tab ${d === currentDay ? 'active' : ''}" data-date="${d}">
          <span class="day-tab-num">Day ${i + 1}</span>
          <span class="day-tab-date">${formatDateShort(d)}</span>
        </button>`).join('');

      tabsEl.querySelectorAll('.day-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          currentDay = btn.dataset.date;
          renderDayTabs();
          renderItems();
        });
      });

      // scroll active tab into view
      const active = tabsEl.querySelector('.day-tab.active');
      if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } catch(e) {}
  }

  function renderItems() {
    try {
      const tripId = App.getCurrentTripId();
      if (!tripId || !currentDay) return;

      const container = document.getElementById('itinerary-items');
      if (!container) return;

      // destroy old sortable
      sortableInstances.forEach(s => { try { s.destroy(); } catch(e) {} });
      sortableInstances = [];

      const items = getItemsByDay(tripId, currentDay);
      const conflicts = detectConflicts(items);

      if (!items.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🗓️</div>
            <h3>今天還沒有行程</h3>
            <p>點擊右下角按鈕新增第一個行程</p>
          </div>`;
        return;
      }

      container.innerHTML = `<ul class="item-list" id="sortable-list"></ul>`;
      const list = container.querySelector('#sortable-list');

      items.forEach(item => {
        const meta = TYPE_META[item.type] || TYPE_META.other;
        const conflict = conflicts[item.id];
        const li = document.createElement('li');
        li.className = 'item-card';
        li.dataset.id = item.id;
        li.innerHTML = `
          ${conflict ? `<div class="conflict-bar">⚠️ 時間可能與「${escapeHtml(conflict)}」衝突</div>` : ''}
          <div class="item-left-bar" style="background:${meta.color}"></div>
          <div class="item-body">
            <div class="item-header">
              <span class="item-type-icon">${meta.icon}</span>
              <span class="item-name ${item.completed ? 'completed' : ''}">${escapeHtml(item.name)}</span>
              <label class="item-check">
                <input type="checkbox" class="item-done-cb" ${item.completed ? 'checked' : ''} data-id="${item.id}">
              </label>
            </div>
            ${item.startTime ? `<div class="item-time">⏰ ${item.startTime}${item.endTime ? ' ~ ' + item.endTime : ''}</div>` : ''}
            ${item.address ? `<div class="item-addr clickable" data-addr="${escapeHtml(item.address)}" data-maps="${escapeHtml(item.mapsUrl||'')}">📍 ${escapeHtml(item.address)}</div>` : ''}
            ${item.estimatedCost ? `<div class="item-cost">預估：${formatMoney(item.estimatedCost)}${item.actualCost != null ? '　實際：' + formatMoney(item.actualCost) : ''}</div>` : ''}
            ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ''}
          </div>
          <div class="item-actions">
            <button class="icon-btn edit-item-btn" data-id="${item.id}" title="編輯">${ICONS.edit}</button>
            <button class="icon-btn delete-item-btn" data-id="${item.id}" title="刪除">${ICONS.trash}</button>
          </div>
          <div class="swipe-delete-btn" data-id="${item.id}">刪除</div>`;
        list.appendChild(li);
      });

      // bind events
      container.querySelectorAll('.item-done-cb').forEach(cb => {
        cb.addEventListener('change', e => {
          const id = e.target.dataset.id;
          toggleComplete(tripId, id, e.target.checked);
        });
      });

      container.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); openForm(tripId, btn.dataset.id); });
      });

      container.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (await showConfirm('確定要刪除這個行程嗎？')) {
            deleteItem(tripId, btn.dataset.id);
          }
        });
      });

      container.querySelectorAll('.item-addr.clickable').forEach(el => {
        el.addEventListener('click', () => {
          const maps = el.dataset.maps || '';
          const addr = el.dataset.addr || '';
          const url = maps || `https://www.google.com/maps/search/${encodeURIComponent(addr)}`;
          window.open(url, '_blank');
        });
      });

      container.querySelectorAll('.swipe-delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (await showConfirm('確定要刪除這個行程嗎？')) {
            deleteItem(tripId, btn.dataset.id);
          }
        });
      });

      // swipe-to-reveal delete
      initSwipeToDelete(list);

      // long press menu
      container.querySelectorAll('.item-card').forEach(card => initLongPress(card, tripId));

      // sortable
      if (typeof Sortable !== 'undefined') {
        const s = Sortable.create(list, {
          delay: 150, delayOnTouchOnly: true, animation: 150,
          ghostClass: 'sortable-ghost',
          onEnd: () => updateOrder(tripId),
        });
        sortableInstances.push(s);
      }
    } catch(e) {}
  }

  function initSwipeToDelete(list) {
    try {
      list.querySelectorAll('.item-card').forEach(card => {
        let startX = 0, isDragging = false;
        card.addEventListener('touchstart', e => {
          startX = e.touches[0].clientX;
          isDragging = false;
        }, { passive: true });
        card.addEventListener('touchmove', e => {
          const dx = e.touches[0].clientX - startX;
          if (Math.abs(dx) > 10) isDragging = true;
          if (dx < -60) card.classList.add('swiped');
          else if (dx > 10) card.classList.remove('swiped');
        }, { passive: true });
        card.addEventListener('touchend', () => { if (!isDragging) card.classList.remove('swiped'); });
      });
    } catch(e) {}
  }

  function initLongPress(card, tripId) {
    try {
      card.addEventListener('touchstart', e => {
        longPressTimer = setTimeout(() => {
          showContextMenu(card, tripId);
        }, 600);
      }, { passive: true });
      card.addEventListener('touchend', () => clearTimeout(longPressTimer));
      card.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    } catch(e) {}
  }

  function showContextMenu(card, tripId) {
    try {
      const existing = document.querySelector('.context-menu');
      if (existing) existing.remove();

      const itemId = card.dataset.id;
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <button class="ctx-btn" data-action="edit">${ICONS.edit} 編輯</button>
        <button class="ctx-btn" data-action="move">📋 移到其他日期</button>
        <button class="ctx-btn danger" data-action="delete">${ICONS.trash} 刪除</button>`;
      document.body.appendChild(menu);

      menu.querySelector('[data-action=edit]').addEventListener('click', () => {
        menu.remove();
        openForm(tripId, itemId);
      });
      menu.querySelector('[data-action=move]').addEventListener('click', () => {
        menu.remove();
        openMoveDialog(tripId, itemId);
      });
      menu.querySelector('[data-action=delete]').addEventListener('click', async () => {
        menu.remove();
        if (await showConfirm('確定要刪除這個行程嗎？')) deleteItem(tripId, itemId);
      });

      setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
      }, 100);
    } catch(e) {}
  }

  function openMoveDialog(tripId, itemId) {
    try {
      const trip = TripsModule.getById(tripId);
      if (!trip) return;
      const dates = getDatesInRange(trip.startDate, trip.endDate);
      const opts = dates.map((d, i) => `<option value="${d}" ${d === currentDay ? 'selected' : ''}>Day ${i+1} (${formatDateShort(d)})</option>`).join('');

      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>選擇移動到的日期</p>
          <select id="move-date-select" class="form-input" style="margin:12px 0">${opts}</select>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="move-cancel">取消</button>
            <button class="btn btn-primary" id="move-ok">移動</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#move-ok').addEventListener('click', () => {
        const newDate = overlay.querySelector('#move-date-select').value;
        overlay.remove();
        const items = getItems(tripId);
        const idx = items.findIndex(i => i.id === itemId);
        if (idx >= 0) {
          items[idx].date = newDate;
          saveItems(tripId, items);
          renderItems();
          showToast('行程已移動');
        }
      });
      overlay.querySelector('#move-cancel').addEventListener('click', () => overlay.remove());
    } catch(e) {}
  }

  function toggleComplete(tripId, itemId, done) {
    try {
      const items = getItems(tripId);
      const idx = items.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        items[idx].completed = done;
        saveItems(tripId, items);
        renderItems();
      }
    } catch(e) {}
  }

  function deleteItem(tripId, itemId) {
    try {
      const items = getItems(tripId).filter(i => i.id !== itemId);
      saveItems(tripId, items);
      renderItems();
      showToast('行程已刪除');
    } catch(e) {}
  }

  function updateOrder(tripId) {
    try {
      const list = document.getElementById('sortable-list');
      if (!list) return;
      const ids = [...list.querySelectorAll('.item-card')].map(c => c.dataset.id);
      const items = getItems(tripId);
      ids.forEach((id, idx) => {
        const item = items.find(i => i.id === id);
        if (item) item.order = idx;
      });
      saveItems(tripId, items);
    } catch(e) {}
  }

  function openForm(tripId, itemId = null) {
    try {
      const form = document.getElementById('item-form');
      if (!form) return;
      form.reset();
      document.getElementById('item-form-id').value = '';
      document.getElementById('item-form-title').textContent = '新增行程';

      if (itemId) {
        const items = getItems(tripId);
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        document.getElementById('item-form-title').textContent = '編輯行程';
        document.getElementById('item-form-id').value = item.id;
        document.getElementById('item-name-input').value = item.name || '';
        document.getElementById('item-type-input').value = item.type || 'attraction';
        document.getElementById('item-start-time').value = item.startTime || '';
        document.getElementById('item-end-time').value = item.endTime || '';
        document.getElementById('item-address-input').value = item.address || '';
        document.getElementById('item-maps-input').value = item.mapsUrl || '';
        document.getElementById('item-notes-input').value = item.notes || '';
        document.getElementById('item-est-cost').value = item.estimatedCost || '';
        document.getElementById('item-actual-cost').value = item.actualCost || '';
        document.getElementById('item-planb-input').value = item.planB || '';
        document.getElementById('item-completed-cb').checked = item.completed || false;
      }
      openBottomSheet('item-sheet');
    } catch(e) {}
  }

  function handleSubmit(e) {
    try {
      e.preventDefault();
      const tripId = App.getCurrentTripId();
      if (!tripId) return;

      const id = document.getElementById('item-form-id').value;
      const name = document.getElementById('item-name-input').value.trim();
      if (!name) { showToast('請輸入行程名稱', 'error'); return; }

      const itemData = {
        id: id || generateId(),
        tripId,
        date: currentDay,
        type: document.getElementById('item-type-input').value,
        name,
        startTime: document.getElementById('item-start-time').value,
        endTime: document.getElementById('item-end-time').value,
        address: document.getElementById('item-address-input').value.trim(),
        mapsUrl: document.getElementById('item-maps-input').value.trim(),
        notes: document.getElementById('item-notes-input').value.trim(),
        estimatedCost: Number(document.getElementById('item-est-cost').value) || null,
        actualCost: document.getElementById('item-actual-cost').value !== ''
          ? Number(document.getElementById('item-actual-cost').value) : null,
        planB: document.getElementById('item-planb-input').value.trim(),
        completed: document.getElementById('item-completed-cb').checked,
        order: 0,
        createdAt: new Date().toISOString(),
      };

      const items = getItems(tripId);
      const existing = items.findIndex(i => i.id === itemData.id);
      if (existing >= 0) {
        itemData.order = items[existing].order;
        items[existing] = itemData;
      } else {
        const dayItems = items.filter(i => i.date === currentDay);
        itemData.order = dayItems.length;
        items.push(itemData);
      }

      saveItems(tripId, items);
      closeBottomSheet('item-sheet');
      renderItems();
      showToast(id ? '行程已更新' : '行程已新增');
    } catch(e) { showToast('發生錯誤', 'error'); }
  }

  function render() {
    try {
      const tripId = App.getCurrentTripId();
      const noTrip = document.getElementById('itinerary-no-trip');
      const dayTabsWrap = document.getElementById('day-tabs-wrap');
      const itemsEl = document.getElementById('itinerary-items');
      const fabEl = document.getElementById('add-item-btn');

      if (!tripId) {
        if (noTrip) noTrip.style.display = 'flex';
        if (dayTabsWrap) dayTabsWrap.style.display = 'none';
        if (itemsEl) itemsEl.innerHTML = '';
        if (fabEl) fabEl.style.display = 'none';
        return;
      }
      if (noTrip) noTrip.style.display = 'none';
      if (dayTabsWrap) dayTabsWrap.style.display = 'block';
      if (fabEl) fabEl.style.display = 'flex';
      renderDayTabs();
      renderItems();
    } catch(e) {}
  }

  function init() {
    try {
      const form = document.getElementById('item-form');
      if (form) form.addEventListener('submit', handleSubmit);
      document.getElementById('add-item-btn')?.addEventListener('click', () => {
        const tripId = App.getCurrentTripId();
        if (!tripId) { showToast('請先選擇或建立旅程', 'error'); return; }
        openForm(tripId);
      });
      document.getElementById('item-sheet-close')?.addEventListener('click', () => closeBottomSheet('item-sheet'));
    } catch(e) {}
  }

  return { init, render, getItems, openForm };
})();
