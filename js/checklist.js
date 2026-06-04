/* checklist.js — packing checklist module */

const ChecklistModule = (() => {
  const DEFAULTS = [
    { group: '出國必帶', items: ['護照','機票（電子機票截圖）','信用卡','現金（換好外幣）','網卡 / eSIM','充電器','行動電源','轉接頭','保險卡'] },
    { group: '個人用品', items: ['換洗衣物','盥洗用品','藥品','太陽眼鏡','雨傘'] },
  ];

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getData(tripId) {
    return Storage.get('checklist_' + tripId, null);
  }

  function saveData(tripId, data) {
    Storage.set('checklist_' + tripId, data);
  }

  function initDefaults(tripId) {
    try {
      if (getData(tripId)) return;
      const data = DEFAULTS.map(g => ({
        group: g.group,
        items: g.items.map(name => ({ id: generateId(), name, checked: false })),
      }));
      saveData(tripId, data);
    } catch(e) {}
  }

  function render() {
    try {
      const tripId = App.getCurrentTripId();
      const el = document.getElementById('checklist-content');
      if (!el) return;

      if (!tripId) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">☑️</div><h3>請先選擇旅程</h3><p>在 Trips 頁面選擇旅程</p></div>`;
        return;
      }

      const data = getData(tripId) || [];
      if (!data.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">☑️</div><h3>清單是空的</h3><p>點擊右下角新增項目</p></div>`;
        return;
      }

      const total = data.reduce((s, g) => s + g.items.length, 0);
      const done = data.reduce((s, g) => s + g.items.filter(i => i.checked).length, 0);

      el.innerHTML = `
        <div class="checklist-header-bar">
          <span>已完成 <strong>${done}</strong> / 總計 <strong>${total}</strong></span>
          <div class="checklist-header-progress">
            <div style="width:${total ? Math.round(done/total*100) : 0}%"></div>
          </div>
        </div>
        ${data.map((group, gi) => `
          <div class="check-group" data-gi="${gi}">
            <div class="check-group-header">
              <span>${escapeHtml(group.group)}</span>
              <button class="btn-link add-group-item" data-gi="${gi}">+ 新增</button>
            </div>
            <ul class="check-list">
              ${group.items.map((item, ii) => `
                <li class="check-item ${item.checked ? 'checked' : ''}" data-gi="${gi}" data-ii="${ii}">
                  <label class="check-label">
                    <input type="checkbox" class="check-cb" data-gi="${gi}" data-ii="${ii}" ${item.checked ? 'checked' : ''}>
                    <span class="check-name">${escapeHtml(item.name)}</span>
                  </label>
                  <button class="icon-btn del-check-btn" data-gi="${gi}" data-ii="${ii}">${ICONS.trash}</button>
                </li>`).join('')}
            </ul>
          </div>`).join('')}`;

      el.querySelectorAll('.check-cb').forEach(cb => {
        cb.addEventListener('change', e => {
          const gi = Number(e.target.dataset.gi), ii = Number(e.target.dataset.ii);
          data[gi].items[ii].checked = e.target.checked;
          saveData(tripId, data);
          render();
        });
      });

      el.querySelectorAll('.del-check-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (await showConfirm('確定要刪除這個項目嗎？')) {
            const gi = Number(btn.dataset.gi), ii = Number(btn.dataset.ii);
            data[gi].items.splice(ii, 1);
            saveData(tripId, data);
            render();
          }
        });
      });

      el.querySelectorAll('.add-group-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const gi = Number(btn.dataset.gi);
          openAddItem(tripId, data, gi);
        });
      });
    } catch(e) {}
  }

  function openAddItem(tripId, data, gi) {
    try {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>新增項目到「${escapeHtml(data[gi].group)}」</p>
          <input type="text" id="new-check-item" class="form-input" style="margin:12px 0" placeholder="項目名稱">
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="ci-cancel">取消</button>
            <button class="btn btn-primary" id="ci-ok">新增</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#new-check-item');
      input.focus();
      overlay.querySelector('#ci-ok').addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) { showToast('請輸入項目名稱', 'error'); return; }
        data[gi].items.push({ id: generateId(), name, checked: false });
        saveData(tripId, data);
        overlay.remove();
        render();
        showToast('已新增');
      });
      overlay.querySelector('#ci-cancel').addEventListener('click', () => overlay.remove());
      input.addEventListener('keydown', e => { if (e.key === 'Enter') overlay.querySelector('#ci-ok').click(); });
    } catch(e) {}
  }

  function addItemFromInput(tripId) {
    try {
      const input = document.getElementById('checklist-add-input');
      const name = input?.value.trim();
      if (!name) { showToast('請輸入項目名稱', 'error'); return; }

      let data = getData(tripId) || [];
      if (!data.length) {
        data = [{ group: '自訂清單', items: [] }];
      }
      data[data.length - 1].items.push({ id: generateId(), name, checked: false });
      saveData(tripId, data);
      if (input) input.value = '';
      render();
      showToast('已新增');
    } catch(e) {}
  }

  function init() {
    try {
      document.getElementById('checklist-add-btn')?.addEventListener('click', () => {
        const tripId = App.getCurrentTripId();
        if (!tripId) { showToast('請先選擇旅程', 'error'); return; }
        addItemFromInput(tripId);
      });
      document.getElementById('checklist-add-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const tripId = App.getCurrentTripId();
          if (tripId) addItemFromInput(tripId);
        }
      });
    } catch(e) {}
  }

  return { init, render, initDefaults };
})();
