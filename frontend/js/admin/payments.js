/* ============================================================
   admin/payments.js — Pagos de la Administradora del Bar
   ============================================================ */

function barPayments(el) {
  const orders = Store.orders;
  const review = orders.filter((o) => o.paymentStatus === 'review');
  const filters = [
    ['all', 'Todos'], ['pending', 'Pendientes'], ['review', 'En revisión'],
    ['approved', 'Aprobados'], ['paid', 'Pagados'], ['rejected', 'Rechazados'], ['refunded', 'Reembolsados'],
  ];
  let selectedFilter = 'all';

  const today = new Date().toISOString().slice(0, 10);
  const validToday = orders.filter((o) => o.date === today && isValidSale(o));
  const totalToday = validToday.reduce((s, o) => s + o.total, 0);
  const byMethod = { efectivo: 0, deuna: 0, transferencia: 0 };
  validToday.forEach((o) => { if (byMethod.hasOwnProperty(o.payment)) byMethod[o.payment] += o.total; });
  const pct = (v) => totalToday ? Math.round((v / totalToday) * 100) : 0;

  const lastTx = [...orders].sort((a,b)=> (b.date+b.time||'').localeCompare(a.date+a.time||'')).slice(0,6);

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-credit-card"></span> Pagos</h1></div>
    ${review.length ? `<div class="status-banner info"><span class="ico"><i class="bx bx-info-circle"></i></span><div><b>${review.length} pago(s) en revisión.</b> Revisa los comprobantes de transferencia.</div></div>` : ''}
    <div class="card" style="margin-bottom:16px;background:var(--primary);color:#fff;position:relative;overflow:hidden;padding:20px 18px;border:none">
      <div style="position:absolute;right:-10px;top:50%;transform:translateY(-50%);font-size:5.5rem;opacity:0.14;color:#fff;pointer-events:none"><i class="bx bx-wallet"></i></div>
      <div style="position:relative;z-index:1">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;font-weight:600">Total recaudado</div>
        <div style="font-size:2.6rem;font-weight:800;line-height:1;margin:6px 0 4px">${money(totalToday)}</div>
        <div style="font-size:13px;opacity:0.9">en ${validToday.length} transacciones · hoy ${today}</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:14px">Métodos de pago</div>
      ${[
        { key: 'deuna', label: 'DEUNA', icon: 'bx-mobile-alt', color: 'var(--primary)' },
        { key: 'transferencia', label: 'Transferencia', icon: 'bx-transfer-alt', color: 'var(--info)' },
        { key: 'efectivo', label: 'Efectivo', icon: 'bx-money', color: 'var(--success)' },
      ].map((m) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-soft);color:${m.color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0"><i class="bx ${m.icon}"></i></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">${m.label}</div>
            <div style="height:4px;background:var(--surface-3);border-radius:999px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${pct(byMethod[m.key])}%;background:${m.color};border-radius:999px"></div></div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;font-size:14px">${money(byMethod[m.key])}</div>
            <div style="font-size:12px;color:var(--text-2)">${pct(byMethod[m.key])}%</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:12px">Últimas transacciones</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${lastTx.length ? lastTx.map((o) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span class="tiny muted" style="min-width:42px">${o.time || '--:--'}</span>
            <span class="bold" style="min-width:70px">#${o.id}</span>
            <span class="badge badge-primary" style="font-size:11px">${paymentMethodLabel(o.payment)}</span>
            <span class="bold tabular-nums" style="margin-left:auto">${money(o.total)}</span>
          </div>
        `).join('') : '<div class="tiny muted">Sin transacciones aún</div>'}
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:12px">Otras acciones</div>
      <a href="#" data-quick="history" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--r-md);transition:background var(--t-fast)">
        <span style="width:36px;height:36px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center"><i class="bx bx-history"></i></span>
        <span style="flex:1;font-weight:600">Historial de pagos</span>
        <span style="color:var(--text-3)">›</span>
      </a>
    </div>
    <div class="adv-tabs" style="display:none">
      ${filters.map(([value, label]) => `<button class="category-chip${value === selectedFilter ? ' active' : ''}" data-payment-filter="${value}">${label}</button>`).join('')}
    </div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Pedido</th><th>Usuario</th><th>Método</th><th>Total</th><th>Estado pago</th><th>Fecha</th><th></th></tr></thead>
      <tbody id="paymentRows"></tbody>
    </table></div>`;

  const setPay = (id, status) => {
    const order = orders.find((o) => o.id === id);
    order.paymentStatus = status;
    saveOrders();
    logAudit('Actualizó pago', `${order.id} → ${status}`);
    toast('Pago #' + order.id + ' ' + (status === 'approved' ? 'aprobado.' : 'rechazado.'), status === 'approved' ? 'success' : 'error');
    renderBarAdmin('payments');
  };

  const renderSkeletonRows = (count = 5) => {
    const tbody = $('#paymentRows', el);
    tbody.innerHTML = Array.from({ length: count }, () => `
      <tr>
        <td><div class="skeleton" style="width:60px;height:16px"></div></td>
        <td><div class="skeleton" style="width:100px;height:16px"></div></td>
        <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
        <td><div class="skeleton" style="width:70px;height:16px"></div></td>
        <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
        <td><div class="skeleton" style="width:90px;height:14px"></div></td>
        <td><div class="skeleton" style="width:60px;height:28px;border-radius:var(--r-sm)"></div></td>
      </tr>
    `).join('');
  };

  const renderRows = () => {
    const visibleOrders = selectedFilter === 'all' ? orders : selectedFilter === 'pending' ? getPendingPayments(orders) : orders.filter((o) => o.paymentStatus === selectedFilter);
    $('#paymentRows', el).innerHTML = visibleOrders.length ? visibleOrders.map((o) => {
        const sInfo = paymentStatusLabels[o.paymentStatus];
        const badgeCls = sInfo ? sInfo.cls : 'badge-warning';
        const isVisited = lastVisitedPaymentId === o.id;
        return `
        <tr class="${isVisited ? 'visited-row' : ''}" data-order-id="${o.id}">
          <td data-label="Pedido"><span class="bold">#${o.id}</span></td>
          <td data-label="Usuario"><span>${esc(o.userName)}</span></td>
          <td data-label="Método"><span class="badge badge-primary">${paymentMethodLabel(o.payment)}</span></td>
          <td data-label="Total"><span class="bold tabular-nums">${money(o.total)}</span></td>
          <td data-label="Estado"><span class="badge ${badgeCls}">${sInfo ? sInfo.label : 'Pendiente'}</span></td>
          <td data-label="Fecha"><span class="small muted">${o.date} ${o.time || '—'}</span></td>
          <td data-label="Acciones">
            ${o.paymentStatus === 'review' ? `<button class="btn btn-success btn-sm" data-ap="${o.id}">Aprobar</button> <button class="btn btn-danger-outline btn-sm" data-rj="${o.id}">Rechazar</button>` : ''}
            ${o.paymentStatus === 'pending' && o.payment === 'deuna' ? `<button class="btn btn-success btn-sm" data-ap="${o.id}">Aprobar</button>` : ''}
            ${['transferencia', 'deuna'].includes(o.payment) ? `<button class="btn btn-outline btn-sm" data-voucher="${o.id}" title="Ver comprobante" aria-label="Ver comprobante"><i class="bx bx-receipt"></i></button>` : ''}
            ${o.paymentStatus === 'refunded' ? '<span class="badge badge-info">Reembolso aplicado</span>' : ''}
          </td>
        </tr>
        `;
      }).join('') : `<tr><td colspan="7" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx ${selectedFilter==='pending' ? 'bx-happy-heart-eyes' : 'bx-search-alt'}"></i></div><div style="font-weight:600">${selectedFilter==='pending' ? '¡Todo al día! No hay pagos pendientes' : 'No encontramos pagos en este estado'}</div><div class="tiny muted" style="margin-top:4px">${selectedFilter==='pending' ? 'Respira tranquilo, por ahora no debes cobrar nada' : 'Prueba con otro filtro'}</div></td></tr>`;
    $$('[data-voucher]', el).forEach((b) => b.onclick = () => showVoucherModal(b.dataset.voucher));
    $$('[data-ap]', el).forEach((b) => b.onclick = () => setPay(b.dataset.ap, 'approved'));
    $$('[data-rj]', el).forEach((b) => b.onclick = () => setPay(b.dataset.rj, 'rejected'));

    if (lastVisitedPaymentId) {
      const visitedRow = $('#paymentRows', el).querySelector('.visited-row');
      if (visitedRow) {
        visitedRow.classList.add('highlight');
        setTimeout(() => visitedRow.classList.remove('highlight'), 1500);
      }
    }
  };

  renderSkeletonRows();
  setTimeout(renderRows, 350);

  $$('[data-payment-filter]', el).forEach((button) => button.onclick = () => {
    selectedFilter = button.dataset.paymentFilter;
    $$('[data-payment-filter]', el).forEach((item) => item.classList.toggle('active', item === button));
    renderSkeletonRows();
    setTimeout(renderRows, 350);
  });
  $$('[data-quick]', el).forEach((btn) => btn.onclick = () => {
    const q = btn.dataset.quick;
    if (q === 'history') {
      selectedFilter = 'all';
      $$('[data-payment-filter]', el).forEach((item) => item.classList.toggle('active', item.dataset.paymentFilter === 'all'));
      renderSkeletonRows(); setTimeout(renderRows, 350);
      toast('Historial completo de pagos', 'info');
    } else if (q === 'refunded') {
      selectedFilter = 'refunded';
      $$('[data-payment-filter]', el).forEach((item) => item.classList.toggle('active', item.dataset.paymentFilter === 'refunded'));
      renderSkeletonRows(); setTimeout(renderRows, 350);
      if (!orders.some((o) => o.paymentStatus === 'refunded')) toast('No hay reembolsos registrados', 'info');
    }
  });
}

function showVoucherModal(orderId) {
  const order = Store.orders.find((o) => o.id === orderId);
  if (!order) return;
  lastVisitedPaymentId = orderId;
  const status = paymentStatusLabels[order.paymentStatus];
  const overlay = modal(`
    <div style="text-align:center">
      <div style="font-size:3rem"><i class="bx bx-receipt"></i></div>
      <div class="tiny muted">Comprobante de transferencia simulado</div>
      <div class="bold" style="margin-top:8px">${money(order.total)}</div>
      <div class="muted small" style="margin-top:12px">Imagen del comprobante cargada por el usuario (simulada).</div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px;text-align:left">
        <div><span class="bold">Pedido:</span> #${order.id}</div>
        <div><span class="bold">Usuario:</span> ${esc(order.userName)}</div>
        <div><span class="bold">Fecha:</span> ${order.date} ${order.time || '—'}</div>
        <div><span class="bold">Método:</span> ${paymentMethodLabel(order.payment)}</div>
        <div><span class="bold">Estado:</span> <span class="badge ${status?.cls || 'badge-warning'}">${status?.label || 'Pendiente'}</span></div>
        ${order.paymentStatus === 'review' ? `<div class="alert warning" style="margin-top:12px"><span class="a-ico"><i class="bx bx-error"></i></span><div>Este pago está en revisión. Verifica el comprobante antes de aprobar.</div></div>` : ''}
      </div>
    </div>
    <div class="modal-footer" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
      <button class="btn btn-primary" id="voucherCloseBtn">Cerrar</button>
    </div>`, { wide: true, title: 'Comprobante de pago', sub: `Pedido #${order.id} · ${esc(order.userName)}` });

  $('#voucherCloseBtn', overlay).onclick = () => overlay.remove();

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  const originalClose = overlay.remove.bind(overlay);
  overlay.remove = () => {
    document.removeEventListener('keydown', handleEscape);
    originalClose();
  };
}

function barPaymentDetail(el, id) {
  const order = Store.orders.find((o) => o.id === id);
  if (!order) {
    el.innerHTML = emptyState('<i class="bx bx-credit-card"></i>', 'No encontramos ese pago', 'Parece que el pedido que buscas no existe o fue movido. ¡Revisa el listado!');
    return;
  }
  lastVisitedPaymentId = id;
  const status = paymentStatusLabels[order.paymentStatus];
  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-receipt"></span> Detalle de pago</h1></div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">Pedido #${order.id}</div><div class="card-sub">${esc(order.userName)} · ${order.date} ${order.time || ''}</div></div><span class="badge ${status?.cls || 'badge-warning'}">${status?.label || 'Pendiente'}</span></div>
      <div class="card-body" style="text-align:center">
        <div style="font-size:3rem"><i class="bx bx-receipt"></i></div>
        <div class="tiny muted">Comprobante de transferencia simulado</div>
        <div class="bold" style="margin-top:8px">${money(order.total)}</div>
        <div class="muted small" style="margin-top:12px">Imagen del comprobante cargada por el usuario (simulada).</div>
        <button class="btn btn-outline" style="margin-top:20px" id="backToPayments">Volver a pagos</button>
      </div>
    </div>`;
  $('#backToPayments', el).onclick = () => setRoute('adminbar/payments');
}
