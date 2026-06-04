/* budget.js — budget management module (Firestore-backed ES module) */

import {
  subscribeExpenses, subscribeBudgetLimit,
  createExpense, deleteExpense,
  saveBudgetLimit,
  getCachedExpenses, getCachedItems, getCachedBudgetLimit,
} from './storage.js';
import { getCurrentTripId } from './state.js';

export const BudgetModule = (() => {
  const CATEGORIES = [
    { id: 'flight',     label: '機票',     icon: () => icon('plane', 22)        },
    { id: 'hotel',      label: '住宿',     icon: () => icon('bed', 22)          },
    { id: 'transport',  label: '交通',     icon: () => icon('bus', 22)          },
    { id: 'food',       label: '餐飲',     icon: () => icon('utensils', 22)     },
    { id: 'attraction', label: '景點門票', icon: () => icon('tag', 22)          },
    { id: 'shopping',   label: '購物',     icon: () => icon('shoppingBag', 22)  },
    { id: 'other',      label: '其他',     icon: () => icon('archive', 22)      },
  ];

  const ITEM_TYPE_TO_CAT = {
    attraction: 'attraction', restaurant: 'food', hotel: 'hotel',
    transport: 'transport',   shopping: 'shopping', other: 'other',
  };

  let _subTripId   = null;
  let _unsubExp    = null;
  let _unsubLimit  = null;
  let chartInstance = null;

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── subscription management ─────────────────────────────────────────────────

  function subscribeToTrip(tripId) {
    if (_subTripId === tripId) return;
    if (_unsubExp)   { _unsubExp();   _unsubExp   = null; }
    if (_unsubLimit) { _unsubLimit(); _unsubLimit = null; }
    _subTripId = tripId;
    if (!tripId) return;

    _unsubExp = subscribeExpenses(tripId, () => {
      renderOverview(tripId);
      renderChart(tripId);
      renderExpenseList(tripId);
    });

    _unsubLimit = subscribeBudgetLimit(tripId, () => {
      renderOverview(tripId);
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  function calcTotals(tripId) {
    const expenses = getCachedExpenses(tripId);
    const items    = getCachedItems(tripId);
    const byCategory = {};
    CATEGORIES.forEach(c => { byCategory[c.id] = 0; });

    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0);
    });
    items.forEach(item => {
      if (item.actualCost != null) {
        const cat = ITEM_TYPE_TO_CAT[item.type] || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + (Number(item.actualCost) || 0);
      }
    });
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    return { byCategory, total };
  }

  // ── render sections ─────────────────────────────────────────────────────────

  function renderNoTrip() {
    try {
      const fb = document.getElementById('budget-content');
      if (fb) {
        fb.style.display = 'block';
        fb.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${icon('creditCard',56,1.25)}</div>
            <h3>請先選擇旅程</h3>
            <p>在 Trips 頁面選擇或建立旅程後再查看預算</p>
          </div>`;
      }
    } catch(e) {}
  }

  function renderOverview(tripId) {
    try {
      const { total } = calcTotals(tripId);
      const limit     = getCachedBudgetLimit(tripId);
      const remaining = limit > 0 ? limit - total : null;
      const pct       = limit > 0 ? Math.min(100, Math.round((total / limit) * 100)) : 0;
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
              <span class="budget-value ${remaining < 0 ? 'danger' : 'success'}">${formatMoney(Math.abs(remaining))}${remaining < 0 ? '（超支）' : ''}</span>
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
      const current = getCachedBudgetLimit(tripId);
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

      overlay.querySelector('#budget-save').addEventListener('click', async () => {
        try {
          const val = Number(overlay.querySelector('#budget-limit-input').value) || 0;
          overlay.remove();
          await saveBudgetLimit(tripId, val);
          showToast('預算已設定');
        } catch(e) { showToast('儲存失敗', 'error'); }
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
          labels.push(c.label);
          data.push(byCategory[c.id]);
          colors.push(palette[i % palette.length]);
        }
      });

      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

      if (!data.length) {
        canvas.parentElement.innerHTML = `<div class="empty-state" style="padding:24px 0"><div class="empty-icon">${icon('barChart',56,1.25)}</div><p>尚無支出記錄</p></div><canvas id="budget-chart" style="display:none"></canvas>`;
        return;
      }

      chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
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
      const expenses = getCachedExpenses(tripId);
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
            <span class="expense-icon">${cat.icon()}</span>
            <div class="expense-info">
              <span class="expense-desc">${escapeHtml(exp.description)}</span>
              <span class="expense-meta">${cat.label} · ${exp.date || ''}</span>
            </div>
            <span class="expense-amount">${formatMoney(exp.amount)}</span>
            <button class="icon-btn del-exp-btn" data-id="${exp.id}">${ICONS.trash}</button>
          </div>`;
      }).join('');

      el.querySelectorAll('.del-exp-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (await showConfirm('確定要刪除這筆支出嗎？')) {
            try {
              await deleteExpense(tripId, btn.dataset.id);
              showToast('已刪除');
            } catch(e) { showToast('刪除失敗', 'error'); }
          }
        });
      });
    } catch(e) {}
  }

  // ── public render ────────────────────────────────────────────────────────────

  function render(tripId) {
    try {
      const fallback = document.getElementById('budget-content');
      if (!tripId) {
        renderNoTrip();
        if (document.getElementById('budget-overview')) document.getElementById('budget-overview').innerHTML = '';
        if (document.getElementById('expense-list')) document.getElementById('expense-list').innerHTML = '';
        return;
      }
      if (fallback) { fallback.style.display = 'none'; fallback.innerHTML = ''; }
      subscribeToTrip(tripId);
      renderOverview(tripId);
      renderChart(tripId);
      renderExpenseList(tripId);
    } catch(e) {}
  }

  // ── expense form ─────────────────────────────────────────────────────────────

  async function handleExpenseSubmit(e) {
    try {
      e.preventDefault();
      const tripId = getCurrentTripId();
      if (!tripId) return;

      const cat     = document.getElementById('expense-cat').value;
      const desc    = document.getElementById('expense-desc').value.trim();
      const amount  = Number(document.getElementById('expense-amount').value);
      const date    = document.getElementById('expense-date').value;
      const paidBy  = document.getElementById('expense-paidby').value.trim();

      if (!desc || !amount) { showToast('請填寫說明和金額', 'error'); return; }

      await createExpense(tripId, { category: cat, description: desc, amount, date, paidBy });
      closeBottomSheet('expense-sheet');
      showToast('支出已新增');
    } catch(e) { showToast('新增失敗：' + (e.message || ''), 'error'); }
  }

  function handleSplitCalc() {
    try {
      const amount  = Number(document.getElementById('split-amount').value) || 0;
      const count   = Math.max(1, Number(document.getElementById('split-count').value) || 1);
      const paidBy  = document.getElementById('split-paidby').value.trim() || '付款人';
      const per     = Math.ceil(amount / count);
      const el = document.getElementById('split-result');
      if (el) el.innerHTML = `
        <div class="split-card">
          <p><strong>${escapeHtml(paidBy)}</strong> 付了 <strong>${formatMoney(amount)}</strong></p>
          <p>共 <strong>${count}</strong> 人，每人應付 <strong class="primary">${formatMoney(per)}</strong></p>
        </div>`;
    } catch(e) {}
  }

  function init() {
    try {
      const expForm = document.getElementById('expense-form');
      if (expForm) expForm.addEventListener('submit', handleExpenseSubmit);

      document.getElementById('add-expense-btn')?.addEventListener('click', () => {
        const tripId = getCurrentTripId();
        if (!tripId) { showToast('請先選擇旅程', 'error'); return; }
        const dateEl = document.getElementById('expense-date');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
        openBottomSheet('expense-sheet');
      });

      document.getElementById('expense-sheet-close')?.addEventListener('click', () => closeBottomSheet('expense-sheet'));
      document.getElementById('calc-split-btn')?.addEventListener('click', handleSplitCalc);
    } catch(e) {}
  }

  return { init, render, CATEGORIES };
})();
