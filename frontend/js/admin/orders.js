/* ============================================================
   admin/orders.js — Pedidos de la Administradora del Bar
   ============================================================ */

function barOrders(el) {
  const orders = Store.orders;
  const actives = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const queue = orders.filter((o) => o.status === 'queue');
  const prep = orders.filter((o) => o.status === 'prep');
  const ready = orders.filter((o) => o.status === 'ready');
  const delivered = orders.filter((o) => o.status === 'delivered');
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today);
  const queueToday = todayOrders.filter((o) => o.status === 'queue').length;
  const confirmedToday = todayOrders.filter((o) => o.status === 'confirmed').length;
  const prepToday = todayOrders.filter((o) => o.status === 'prep').length;
  const readyToday = todayOrders.filter((o) => o.status === 'ready').length;
  const deliveredToday = todayOrders.filter((o) => o.status === 'delivered').length;
  const cancelledToday = todayOrders.filter((o) => o.status === 'cancelled' || o.paymentStatus === 'rejected' || o.status === 'refunded').length;

  el.innerHTML = `
    <div class="page-title"><h1>Pedidos</h1><span class="badge badge-primary">${actives.length} activos</span></div>
    <div style="display:flex;justify-content:flex-end;margin:12px 0">
      <button class="btn btn-primary btn-sm" id="btnConfirmAllReady" ${ready.length ? '' : 'disabled style="opacity:0.6;pointer-events:none"'}><i class="bx bx-check-double" style="margin-right:6px"></i>Confirmar todos los pedidos listos${ready.length ? ` (${ready.length})` : ''}</button>
    </div>
    <div class="card" style="margin-bottom:16px; padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-weight:700; font-size:var(--fs-sm); color:var(--text-2); text-transform:uppercase; letter-spacing:0.04em">Resumen de hoy — ${today}</div>
        <span class="badge badge-neutral">${todayOrders.length} pedidos hoy</span>
      </div>
      <div class="grid grid-3" style="gap:10px">
        <div class="stat-card" style="padding:12px;text-align:center;position:relative;overflow:hidden"><span class="stat-ico bx bx-time muted" style="font-size:2.6rem"></span><div class="st-label"><i class="bx bx-time" style="margin-right:4px"></i>En cola</div><div class="st-value" style="font-size:1.5rem">${queueToday}</div></div>
        <div class="stat-card" style="padding:12px;text-align:center;position:relative;overflow:hidden"><span class="stat-ico bx bx-check primary" style="font-size:2.6rem"></span><div class="st-label"><i class="bx bx-check" style="margin-right:4px"></i>Confirmados</div><div class="st-value primary" style="font-size:1.5rem">${confirmedToday}</div></div>
        <div class="stat-card" style="padding:12px;text-align:center;position:relative;overflow:hidden"><span class="stat-ico bx bx-restaurant warning" style="font-size:2.6rem"></span><div class="st-label"><i class="bx bx-restaurant" style="margin-right:4px"></i>En preparación</div><div class="st-value warning" style="font-size:1.5rem">${prepToday}</div></div>
        <div class="stat-card" style="padding:12px;text-align:center;position:relative;overflow:hidden"><span class="stat-ico bx bx-check-double success" style="font-size:2.6rem"></span><div class="st-label"><i class="bx bx-check-double" style="margin-right:4px"></i>Listos</div><div class="st-value" style="font-size:1.5rem;color:var(--success)">${readyToday}</div></div>
        <div class="stat-card" style="padding:12px;text-align:center;position:relative;overflow:hidden"><span class="stat-ico bx bx-package success" style="font-size:2.6rem"></span><div class="st-label"><i class="bx bx-package" style="margin-right:4px"></i>Entregados</div><div class="st-value success" style="font-size:1.5rem">${deliveredToday}</div></div>
        <div class="stat-card" style="padding:12px;text-align:center;position:relative;overflow:hidden"><span class="stat-ico bx bx-x-circle danger" style="font-size:2.6rem"></span><div class="st-label"><i class="bx bx-x-circle" style="margin-right:4px"></i>Cancelados</div><div class="st-value danger" style="font-size:1.5rem">${cancelledToday}</div></div>
      </div>
    </div>
    <div class="adv-tabs">
      <button class="category-chip active" data-tab="queue">En cola (${queue.length})</button>
      <button class="category-chip" data-tab="prep">En preparación (${prep.length})</button>
      <button class="category-chip" data-tab="ready">Listos (${ready.length})</button>
      <button class="category-chip" data-tab="delivered">Entregados (${delivered.length})</button>
    </div>
    <div id="queueArea"></div>`;

  let tab = 'queue';
  const render = () => {
    const area = $('#queueArea');
    const list = tab === 'queue' ? queue : tab === 'prep' ? prep : tab === 'ready' ? ready : delivered;
    if (!list.length) { area.innerHTML = emptyState('🧾', 'Sin pedidos', 'No hay pedidos en esta sección.'); return; }
    area.innerHTML = `<div class="order-queue">${list.map((o) => queueOrderCard(o, tab)).join('')}</div>`;
    bindQueueActions(area);
  };

  $$('[data-tab]', el).forEach((t) => {
    t.onclick = () => {
      $$('[data-tab]', el).forEach((x) => x.classList.remove('active'));
      t.classList.add('active'); tab = t.dataset.tab; render();
    };
  });
  $('#btnConfirmAllReady', el)?.addEventListener('click', () => {
    const readyOrders = Store.orders.filter((o) => o.status === 'ready');
    if (!readyOrders.length) return;
    confirmDialog('Confirmar entrega en lote', `¿Confirmar que se entregaron los ${readyOrders.length} pedidos listos?`, `Confirmar ${readyOrders.length} entregas`).then((ok) => {
      if (!ok) return;
      readyOrders.forEach((order) => {
        order.status = 'delivered';
        order.eta = 'Entregado';
        if (order.paymentStatus === 'pending') order.paymentStatus = 'paid';
        if (order.delivery === 'delivery') logAudit('Entregó pedido', order.id);
      });
      saveOrders();
      logAudit('Entrega en lote', `${readyOrders.length} pedidos marcados como entregados`);
      toast(`${readyOrders.length} pedidos marcados como entregados`, 'success');
      renderBarAdmin('orders');
    });
  });
  render();
}

function queueOrderCard(o, tab) {
  const isDelivery = o.delivery === 'delivery';
  const needsPayment = o.paymentStatus === 'pending' || o.paymentStatus === 'review';
  let extraCls = '';
  let priTag = '';
  if (o.priority === 'urgent') { extraCls += ' pri-urgent'; priTag = `<span class="priority-tag urgent">⚡ Urgente</span>`; }
  else if (o.priority === 'priority') { extraCls += ' pri-priority'; priTag = `<span class="priority-tag priority">⭐ Prioridad</span>`; }
  else { extraCls += ' pri-normal'; }
  if (o.status === 'ready') extraCls += ' state-ready';
  if (o.status === 'prep') extraCls += ' state-prep';
  if (o.status === 'queue' && (needsPayment || isDelivery)) extraCls += ' priority';

  let actionBtns = '';
  if (o.status === 'queue') actionBtns = `<button class="btn btn-success btn-sm" data-act="confirm">Confirmar</button>`;
  else if (o.status === 'confirmed') actionBtns = `<button class="btn btn-warning btn-sm" data-act="prep">Iniciar preparación</button>`;
  else if (o.status === 'prep') actionBtns = `<button class="btn btn-success btn-sm" data-act="ready">Marcar listo</button>`;
  else if (o.status === 'ready') actionBtns = `<button class="btn btn-success btn-sm" data-act="delivered">Entregar</button>`;
  if (['queue', 'confirmed'].includes(o.status)) actionBtns += `<button class="btn btn-danger-outline btn-sm" data-act="cancel">Cancelar</button>`;

  return `
    <div class="queue-order${extraCls}" data-id="${o.id}">
      <div class="queue-head">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="bold" style="color:var(--primary-strong)">#${o.id}</span>
          <span class="tiny muted">${o.time}</span>
          ${priTag}
          ${statusMeta(o.status)}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${isDelivery ? `<span class="badge badge-info">🛵 Delivery · P${o.deliveryInfo?.piso} ${o.deliveryInfo?.aula}</span>` : `<span class="badge badge-neutral">🏪 Retiro</span>`}
          <span class="small bold">${money(o.total)}</span>
        </div>
      </div>
      <div class="queue-items">
        ${o.items.map((i) => `<div><span>${esc(i.name)}</span><span class="muted">× ${i.qty}</span></div>`).join('')}
      </div>
      <div class="tiny muted" style="color:var(--text-2)"><b>Cliente:</b> ${esc(o.userName)} · <b>Entrega:</b> ${o.delivery === 'delivery' ? 'Delivery' : 'Retiro'} · <b>Tiempo est.:</b> ${o.prepMin} min${o.note ? ` · <b>Nota:</b> ${esc(o.note)}` : ''}</div>
      ${needsPayment ? `<div class="alert warning" style="margin-top:10px;padding:8px 12px"><span class="a-ico"><i class="bx bx-credit-card"></i></span><div>Pago ${paymentMethodLabel(o.payment)}: ${o.paymentStatus === 'review' ? 'en revisión' : 'pendiente'} ${paymentMeta(o.paymentStatus)}</div></div>` : ''}
      <div class="queue-actions">${actionBtns}</div>
    </div>`;
}

function bindQueueActions(area) {
  $$('[data-act]', area).forEach((btn) => {
    btn.onclick = () => {
      const card = btn.closest('.queue-order');
      const order = Store.orders.find((o) => o.id === card.dataset.id);
      const act = btn.dataset.act;
      if (act === 'cancel') {
        confirmDialog('Cancelar pedido', `¿Cancelar el pedido #${order.id}?`, 'Cancelar pedido', true).then((ok) => {
          if (!ok) return;
          order.status = 'cancelled'; order.eta = 'Cancelado';
          order.paymentStatus = order.payment !== 'efectivo' ? 'refunded' : order.paymentStatus;
          saveOrders(); logAudit('Canceló pedido', order.id); toast('Pedido cancelado.', 'success');
          renderBarAdmin('orders');
        });
        return;
      }
      const next = { confirm: 'confirmed', prep: 'prep', ready: 'ready', delivered: 'delivered' }[act];
      order.status = next;
      order.eta = { confirmed: 'Confirmado', prep: 'En preparación', ready: 'Listo', delivered: 'Entregado' }[next];
      order.paymentStatus = act === 'delivered' && order.paymentStatus === 'pending' ? 'paid' : order.paymentStatus;
      if (act === 'delivered' && order.delivery === 'delivery') logAudit('Entregó pedido', order.id);
      saveOrders(); logAudit('Cambió estado de pedido', `${order.id} → ${order.eta}`);
      const label = { confirm: 'Confirmado', prep: 'En preparación', ready: 'Marcado listo', delivered: 'Entregado' }[act];
      toast('# ' + order.id + ' ' + label + '.', 'success');
      renderBarAdmin('orders');
    };
  });
}
