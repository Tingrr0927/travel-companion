/* info.js — important info center module */

const InfoModule = (() => {
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getData(tripId) {
    return Storage.get('info_' + tripId, { flight: {}, hotels: [], emergency: {} });
  }

  function saveData(tripId, data) {
    Storage.set('info_' + tripId, data);
  }

  function render() {
    try {
      const tripId = App.getCurrentTripId();
      const container = document.getElementById('info-content');
      if (!container) return;

      if (!tripId) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>請先選擇旅程</h3></div>`;
        return;
      }

      const data = getData(tripId);

      container.innerHTML = `
        <div class="accordion">
          <div class="accordion-item" id="acc-flight">
            <button class="accordion-header" data-target="acc-flight-body">
              <span>✈️ 航班資訊</span><span class="acc-arrow">▼</span>
            </button>
            <div class="accordion-body" id="acc-flight-body">
              <form id="flight-form" class="info-form">
                <div class="form-row">
                  <label class="form-label">航空公司</label>
                  <input class="form-input" name="airline" value="${escapeHtml(data.flight.airline||'')}" placeholder="例：中華航空">
                </div>
                <div class="form-row">
                  <label class="form-label">航班號碼</label>
                  <input class="form-input" name="flightNo" value="${escapeHtml(data.flight.flightNo||'')}" placeholder="例：CI-668">
                </div>
                <div class="form-row-2">
                  <div class="form-row">
                    <label class="form-label">起飛機場</label>
                    <input class="form-input" name="depAirport" value="${escapeHtml(data.flight.depAirport||'')}" placeholder="TPE">
                  </div>
                  <div class="form-row">
                    <label class="form-label">抵達機場</label>
                    <input class="form-input" name="arrAirport" value="${escapeHtml(data.flight.arrAirport||'')}" placeholder="NRT">
                  </div>
                </div>
                <div class="form-row-2">
                  <div class="form-row">
                    <label class="form-label">起飛時間</label>
                    <input class="form-input" type="datetime-local" name="depTime" value="${data.flight.depTime||''}">
                  </div>
                  <div class="form-row">
                    <label class="form-label">抵達時間</label>
                    <input class="form-input" type="datetime-local" name="arrTime" value="${data.flight.arrTime||''}">
                  </div>
                </div>
                <div class="form-row">
                  <label class="form-label">備註</label>
                  <textarea class="form-input" name="notes" rows="2">${escapeHtml(data.flight.notes||'')}</textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-full">儲存航班資訊</button>
              </form>
            </div>
          </div>

          <div class="accordion-item" id="acc-hotel">
            <button class="accordion-header" data-target="acc-hotel-body">
              <span>🏨 住宿資訊</span><span class="acc-arrow">▼</span>
            </button>
            <div class="accordion-body" id="acc-hotel-body">
              <div id="hotels-list">
                ${data.hotels.map((h, i) => renderHotelCard(h, i)).join('')}
              </div>
              <button class="btn btn-outline btn-full" id="add-hotel-btn">+ 新增住宿</button>
            </div>
          </div>

          <div class="accordion-item" id="acc-emergency">
            <button class="accordion-header" data-target="acc-emergency-body">
              <span>🆘 緊急資訊</span><span class="acc-arrow">▼</span>
            </button>
            <div class="accordion-body" id="acc-emergency-body">
              <form id="emergency-form" class="info-form">
                <div class="form-row">
                  <label class="form-label">保險公司</label>
                  <input class="form-input" name="insurer" value="${escapeHtml(data.emergency.insurer||'')}">
                </div>
                <div class="form-row">
                  <label class="form-label">保單號碼</label>
                  <input class="form-input" name="policyNo" value="${escapeHtml(data.emergency.policyNo||'')}">
                </div>
                <div class="form-row">
                  <label class="form-label">緊急電話</label>
                  <input class="form-input" type="tel" name="emergencyTel" value="${escapeHtml(data.emergency.emergencyTel||'')}">
                </div>
                <div class="form-row">
                  <label class="form-label">當地緊急電話</label>
                  <input class="form-input" type="tel" name="localEmergency" value="${escapeHtml(data.emergency.localEmergency||'')}" placeholder="例：110, 119">
                </div>
                <div class="form-row">
                  <label class="form-label">台灣外交部緊急</label>
                  <input class="form-input" type="tel" name="twMofa" value="${escapeHtml(data.emergency.twMofa||'+886-800-085-095')}">
                </div>
                <div class="form-row">
                  <label class="form-label">當地領事館電話</label>
                  <input class="form-input" type="tel" name="consulateTel" value="${escapeHtml(data.emergency.consulateTel||'')}">
                </div>
                <div class="form-row">
                  <label class="form-label">領事館地址</label>
                  <input class="form-input" name="consulateAddr" value="${escapeHtml(data.emergency.consulateAddr||'')}">
                </div>
                <div class="form-row">
                  <label class="form-label">備註</label>
                  <textarea class="form-input" name="notes" rows="2">${escapeHtml(data.emergency.notes||'')}</textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-full">儲存緊急資訊</button>
              </form>
            </div>
          </div>
        </div>`;

      // accordion toggle
      container.querySelectorAll('.accordion-header').forEach(btn => {
        btn.addEventListener('click', () => {
          const bodyId = btn.dataset.target;
          const body = document.getElementById(bodyId);
          const arrow = btn.querySelector('.acc-arrow');
          if (!body) return;
          const isOpen = body.classList.toggle('open');
          if (arrow) arrow.textContent = isOpen ? '▲' : '▼';
        });
      });

      // open first accordion by default
      const firstBody = container.querySelector('.accordion-body');
      const firstArrow = container.querySelector('.acc-arrow');
      if (firstBody) { firstBody.classList.add('open'); if (firstArrow) firstArrow.textContent = '▲'; }

      // flight form
      container.querySelector('#flight-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        data.flight = Object.fromEntries(fd.entries());
        saveData(tripId, data);
        showToast('航班資訊已儲存');
      });

      // emergency form
      container.querySelector('#emergency-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        data.emergency = Object.fromEntries(fd.entries());
        saveData(tripId, data);
        showToast('緊急資訊已儲存');
      });

      // add hotel
      container.querySelector('#add-hotel-btn')?.addEventListener('click', () => {
        data.hotels.push({ id: generateId(), name:'', address:'', checkin:'', checkout:'', confirmNo:'', phone:'', notes:'' });
        saveData(tripId, data);
        render();
        // open hotel accordion
        const body = document.getElementById('acc-hotel-body');
        if (body) body.classList.add('open');
      });

      // hotel forms
      container.querySelectorAll('.hotel-form').forEach(form => {
        form.addEventListener('submit', e => {
          e.preventDefault();
          const idx = Number(form.dataset.idx);
          const fd = new FormData(e.target);
          data.hotels[idx] = { ...data.hotels[idx], ...Object.fromEntries(fd.entries()) };
          saveData(tripId, data);
          showToast('住宿資訊已儲存');
        });
      });

      // hotel delete
      container.querySelectorAll('.del-hotel-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (await showConfirm('確定刪除這筆住宿資訊嗎？')) {
            data.hotels.splice(Number(btn.dataset.idx), 1);
            saveData(tripId, data);
            render();
          }
        });
      });

      // map links in hotel
      container.querySelectorAll('.hotel-map-link').forEach(link => {
        link.addEventListener('click', () => {
          const addr = link.dataset.addr;
          if (addr) window.open(`https://www.google.com/maps/search/${encodeURIComponent(addr)}`, '_blank');
        });
      });
    } catch(e) {}
  }

  function renderHotelCard(h, i) {
    return `
      <div class="hotel-card">
        <div class="hotel-card-header">
          <span>住宿 ${i + 1}${h.name ? '：' + escapeHtml(h.name) : ''}</span>
          <button class="icon-btn del-hotel-btn" data-idx="${i}">🗑️</button>
        </div>
        <form class="hotel-form info-form" data-idx="${i}">
          <div class="form-row">
            <label class="form-label">飯店名稱</label>
            <input class="form-input" name="name" value="${escapeHtml(h.name||'')}">
          </div>
          <div class="form-row">
            <label class="form-label">地址 <span class="hotel-map-link clickable" data-addr="${escapeHtml(h.address||'')}" style="${h.address?'':'display:none'}">📍開啟地圖</span></label>
            <input class="form-input" name="address" value="${escapeHtml(h.address||'')}" placeholder="飯店地址">
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label class="form-label">Check-in</label>
              <input class="form-input" type="time" name="checkin" value="${h.checkin||''}">
            </div>
            <div class="form-row">
              <label class="form-label">Check-out</label>
              <input class="form-input" type="time" name="checkout" value="${h.checkout||''}">
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">訂房確認號碼</label>
            <input class="form-input" name="confirmNo" value="${escapeHtml(h.confirmNo||'')}">
          </div>
          <div class="form-row">
            <label class="form-label">電話</label>
            <input class="form-input" type="tel" name="phone" value="${escapeHtml(h.phone||'')}">
          </div>
          <div class="form-row">
            <label class="form-label">備註</label>
            <textarea class="form-input" name="notes" rows="2">${escapeHtml(h.notes||'')}</textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-full">儲存此住宿</button>
        </form>
      </div>`;
  }

  function init() {}

  return { init, render };
})();
