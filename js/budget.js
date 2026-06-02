/* budget.js — budget management module */

const BudgetModule = (() => {
  const CATEGORIES = [
    { id: 'flight',     label: '機票',     icon: '✈️' },
    { id: 'hotel',      label: '住宿',     icon: '🏨' },
    { id: 'transport',  label: '交通',     icon: '🚌' },
    { id: 'food',       label: '餐飲',     icon: '🍽️' },
    { id: 'attraction', label: '景點門票', icon: '🎫' },
    { id: 'shopping',   label: '購物',     icon: '🛍️' },
    { id: 'other',      label: '其他',     icon: '📦' },
  ];

  const ITEM_TYPE_TO_CAT = {
    attraction: 'attraction', restaurant: 'food', hotel: 'hotel',
    transport: 'transport', shopping: 'shopping', other: 'other',
  };

  let chartInstance = null;

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getExpenses(tripId) {
    return Storage.get('expenses_' + tripId, []);
  }

  function saveExpenses(tripId, expenses) {
    Storage.set('expenses_' + tripId, expenses);
  }

  function getBudgetLimit(tripId) {
    return Storage.get('budget_limit_' + tripId, 0);
  }

  function setBudgetLimit(tripId, amount) {
    Storage.set('budget_limit_' + tripId, amount);
  }

  function calcTotals(tripId) {
    const expenses = getExpenses(tripId);
    const itineraryItems = Storage.get('itinerary_' + tripId, []);

    const byCategory = {};
    CATEGORIES.forEach(c => { byCategory[c.id] = 0; });

    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0);
    });

    itineraryItems.forEach(item => {
      if (item.actualCost != null) {
        const cat = ITEM_TYPE_TO_CAT[item.type] || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + (Number(item.actualCost) || 0);
      }
    });

    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    return { byCategory, total };
  }

  function render() {
    try {
      const tripId = App.getCurrentTripId();
      const fallback = document.getElementById('budget-content');
      if (!tripId) {
        renderNoTrip();
        // hide proper sections
        document.getElementById('budget-overview') && (document.getElementById('budget-overview').innerHTML = '');
        document.getElementById('expense-list') && (document.getElementById('expense-list').innerHTML = '');
        document.querySelector('.chart-card canvas') && (document.getElementById('budget-chart').parentElement.innerHTML = '<canvas id="budget-chart"></canvas>');
        if (fallback) fallback.style.display = 'block';
        return;
      }
      if (fallback) { fallback.style.display = 'none'; fallback.innerHTML = ''; }
      renderOverview(tripId);
      renderChart(tripId);
      renderExpenseList(tripId);
      renderSplitCalc();
    } catch(e) {}
  }

  function renderNoTrip() {
    try {
      const el = document.getElementById('budget-content');
      if (el) el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <h3>請先選擇旅程</h3>
          <p>在 Trips 頁面選擇或建立旅程後再查看預算</p>
        </div>`;
    } catch(e) {}
  }

  function renderOverview(tripId) {
    try {
      const { total } = calcTotals(tripId);
      const limit = getBudgetLimit(tripId);
      const remaining = limit > 0 ? limit - total : null;
      const pct = limit > 0 ? Math.min(100, Math.round((total / limit) * 100)) : 0;

      const el = document.getElementById('budget-overview');
      if (!el) return;
      el.innerHTML = `
        <div class="budget-card">
          <div class="budget-row">
            <div class="budget-stat">
              <span class="budget-label">總預算</span>
              <span class="budget-value primary">
                ${limit > 0 ? formatMoney(limit) : '<span style="color:var(--text-secondary)">未設定</span>'}
              </span>
            </div>
            <button class="btn btn-sm btn-outline" id="set-budget-btn">設定</button>
          </div>
          <div class="budget-row">
            <div class="budget-stat">
              <span class="budget-label">已花費</span>
              <span class="budget-value danger">${formatMoney(total)}</span>
            </div>
            ${remaining !== null ? `
            <div class="budget-stat">
              <span class="budget-label">剩餘</span>
              <span class="budget-value ${remaining < 0 ? 'danger' : 'success'}">${formatMoney(Math.abs(remaining))}${remaining < 0 ? ' (超支)' : ''}</span>
            </div>` : ''}
          </div>
          ${limit > 0 ? `
          <div class="budget-progress-wrap">
            <div class="budget-progress-bar ${pct >= 100 ? 'over' : pct >= 80 ? 'warn' : ''}" style="width:${pct}%"></div>
          </div>
          <div class="budget-pct">${pct}%</div>` : ''}
        </div>`;

      document.getElementById('set-budget-btn')?.addEventListener('click', () => openSetBudget(tripId));
    } catch(e) {}
  }

  function openSetBudget(tripId) {
    try {
      const current = getBudgetLimit(tripId);
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>設定旅程總預算</p>
          <input type="number" id="budget-limit-input" class="form-input" style="margin:12px 0"
            placeholder="輸入預算金額（TWD）" value="${current || ''}">
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="budget-cancel">取消</button>
            <button class="btn btn-primary" id="budget-save">儲存</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#budget-save').addEventListener('click', () => {
        const val = Number(overlay.querySelector('#budget-limit-input').value) || 0;
        setBudgetLimit(tripId, val);
        overlay.remove();
        render();
        showToast('預算已設定');
      });
      overlay.querySelector('#budget-cancel').addEventListener('click', () => overlay.remove());
    } catch(e) {}
  }

  function renderChart(tripId) {
    try {
      const { byCategory, total } = calcTotals(tripId);
      const canvas = document.getElementById('budget-chart');
      if (!canvas || typeof Chart === 'undefined') return;

      const labels = [], data = [], colors = [];
      const palette = ['#4F7EFF','#FF7043','#8B5CF6','#06B6D4','#22C55E','#F59E0B','#EC4899'];
      CATEGORIES.forEach((c, i) => {
        if (byCategory[c.id] > 0) {
          labels.push(`${c.icon} ${c.label}`);
          data.push(byCategory[c.id]);
          colors.push(palette[i % palette.length]);
        }
      });

      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

      if (!data.length) {
        canvas.parentElement.innerHTML = `<div class="empty-state" style="padding:24px 0"><div class="empty-icon">📊</div><p>尚無支出記錄</p></div>`;
        return;
      }

      chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ${formatMoney(ctx.parsed)} (${Math.round(ctx.parsed/total*100)}%)`,
              },
            },
          },
        },
      });
    } catch(e) {}
  }

  function renderExpenseList(tripId) {
    try {
      const expenses = getExpenses(tripId);
      const el = document.getElementById('expense-list');
      if (!el) return;

      if (!expenses.length) {
        el.innerHTML = `<p class="empty-hint">尚無手動支出記錄</p>`;
        return;
      }

      el.innerHTML = expenses.map(exp => {
        const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[6];
        return `
          <div class="expense-item">
            <span class="expense-icon">${cat.icon}</span>
            <div class="expense-info">
              <span class="expense-desc">${escapeHtml(exp.description)}</span>
              <span class="expense-meta">${cat.label} · ${exp.date || ''}</span>
            </div>
            <span class="expense-amount">${formatMoney(exp.amount)}</span>
            <button class="icon-btn del-exp-btn" data-id="${exp.id}">🗑️</button>
          </div>`;
      }).join('');

      el.querySelectorAll('.del-exp-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (await showConfirm('確定要刪除這筆支出嗎？')) {
            const updated = getExpenses(tripId).filter(x => x.id !== btn.dataset.id);
            saveExpenses(tripId, updated);
            render();
            showToast('已刪除');
          }
        });
      });
    } catch(e) {}
  }

  function renderSplitCalc() {
    try {
      const el = document.getElementById('split-result');
      if (el) el.innerHTML = '';
    } catch(e) {}
  }

  function openExpenseForm(tripId) {
    try {
      const form = document.getElementById('expense-form');
      if (!form) return;
      form.reset();
      openBottomSheet('expense-sheet');
    } catch(e) {}
  }

  function handleExpenseSubmit(e) {
    try {
      e.preventDefault();
      const tripId = App.getCurrentTripId();
      if (!tripId) return;

      const cat = document.getElementById('expense-cat').value;
      const desc = document.getElementById('expense-desc').value.trim();
      const amount = Number(document.getElementById('expense-amount').value);
      const date = document.getElementById('expense-date').value;
      const paidBy = document.getElementById('expense-paidby').value.trim();

      if (!desc || !amount) { showToast('請填寫說明和金額', 'error'); return; }

      const expense = { id: generateId(), tripId, category: cat, description: desc, amount, date, paidBy, createdAt: new Date().toISOString() };
      const expenses = getExpenses(tripId);
      expenses.unshift(expense);
      saveExpenses(tripId, expenses);
      closeBottomSheet('expense-sheet');
      render();
      showToast('支出已新增');
    } catch(e) { showToast('發生錯誤', 'error'); }
  }

  function handleSplitCalc() {
    try {
      const amount = Number(document.getElementById('split-amount').value) || 0;
      const count = Number(document.getElementById('split-count').value) || 1;
      const paidBy = document.getElementById('split-paidby').value.trim() || '付款人';
      const per = Math.ceil(amount / count);
      const el = document.getElementById('split-result');
      if (el) el.innerHTML = `
        <div class="split-card">
          <p><strong>${paidBy}</strong> 付了 <strong>${formatMoney(amount)}</strong></p>
          <p>共 <strong>${count}</strong> 人，每人應付 <strong class="primary">${formatMoney(per)}</strong></p>
        </div>`;
    } catch(e) {}
  }

  function init() {
    try {
      const expForm = document.getElementById('expense-form');
      if (expForm) expForm.addEventListener('submit', handleExpenseSubmit);
      document.getElementById('add-expense-btn')?.addEventListener('click', () => {
        const tripId = App.getCurrentTripId();
        if (!tripId) { showToast('請先選擇旅程', 'error'); return; }
        // set default date to today
        const today = new Date().toISOString().split('T')[0];
        const dateEl = document.getElementById('expense-date');
        if (dateEl) dateEl.value = today;
        openExpenseForm(tripId);
      });
      document.getElementById('expense-sheet-close')?.addEventListener('click', () => closeBottomSheet('expense-sheet'));
      document.getElementById('calc-split-btn')?.addEventListener('click', handleSplitCalc);
    } catch(e) {}
  }

  return { init, render, CATEGORIES };
})();
