/* ============================================================
   admin/dashboard.js — Dashboard de la Administradora del Bar
   ============================================================ */

function renderCafePill(el) {
  const cfg = Store.config;
  el.innerHTML = `<span class="badge ${cfg.cafeOpen ? 'badge-success' : 'badge-danger'}"><span class="ico">${cfg.cafeOpen ? '🟢' : '🔴'}</span> ${cfg.cafeOpen ? 'ABIERTA' : 'CERRADA'}</span>`;
}

function barDashboard(el) {
  const orders = Store.orders;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today);
  const queue = orders.filter((o) => o.status === 'queue');
  const prep = orders.filter((o) => o.status === 'prep');
  const ready = orders.filter((o) => o.status === 'ready');
  const cap = capacityInfo();
  const payPending = getPendingPayments(orders).length;
  const deliveries = orders.filter((o) => o.delivery === 'delivery' && ['queue', 'confirmed', 'prep', 'ready'].includes(o.status));
  const salesToday = todayOrders.filter(isValidSale).reduce((s, o) => s + o.total, 0);

  const lowStock = Store.products.filter((p) => p.available && p.stock <= p.minStock && p.stock > 0);
  const outStock = Store.products.filter((p) => p.stock === 0);
  const validSalesDash = orders.filter(isValidSale);
  const prodSalesDash = {};
  validSalesDash.forEach((o) => o.items.forEach((i) => { prodSalesDash[i.productId] = (prodSalesDash[i.productId] || 0) + i.qty; }));
  const topProductsDash = Object.entries(prodSalesDash).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,qty])=> ({ product: Store.products.find((p)=>p.id===id), qty})).filter(x=>x.product);

  const priorityOrders = orders
    .filter((o) => ['queue', 'confirmed', 'prep'].includes(o.status))
    .map((o) => {
      let w = 0;
      if (o.priority === 'urgent') w += 4;
      else if (o.priority === 'priority') w += 3;
      if (o.delivery === 'delivery') w += 2;
      if (o.paymentStatus === 'review') w += 1;
      if (o.paymentStatus === 'pending') w += 0.5;
      return { o, w };
    })
    .filter((x) => x.w >= 2)
    .sort((a, b) => b.w - a.w)
    .map((x) => x.o);
  const hasPriority = priorityOrders.length > 0;

  el.innerHTML = `
    <div class="page-title"><h1>Panel de la cafetería</h1><span class="muted small">${today}</span></div>
    <p class="page-sub">Visión rápida para preparar pedidos durante el receso 10:00 - 10:15.</p>

    <div class="status-banners-wrap">
      ${outStock.length ? `<div class="status-banner danger"><span class="ico">⛔</span><div><b>Productos agotados:</b> ${outStock.map((p) => p.name).join(', ')}</div></div>` : ''}
      ${lowStock.length ? `<div class="status-banner warning"><span class="ico">⚠️</span><div><b>Stock bajo:</b> ${lowStock.map((p) => p.name).join(', ')}</div></div>` : ''}
    </div>

    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="stat-card ${queue.length >= 5 ? 'danger-card' : ''}"><span class="stat-ico bx bx-time ${queue.length >= 5 ? 'danger' : 'primary'}"></span><div class="st-label">Pedidos en cola</div><div class="st-value ${queue.length >= 5 ? 'danger' : 'primary'}">${queue.length}</div><div class="st-sub">esperando confirmación</div></div>
      <div class="stat-card"><span class="stat-ico bx bx-restaurant warning"></span><div class="st-label">En preparación</div><div class="st-value warning">${prep.length}</div><div class="st-sub">preparándose ahora</div></div>
      <div class="stat-card success-card"><span class="stat-ico bx bx-check-double success"></span><div class="st-label">Listos</div><div class="st-value">${ready.length}</div><div class="st-sub">listos para retirar</div></div>
      <div class="stat-card ${cap.stateCls === 'danger' ? 'danger-card' : cap.stateCls === 'warning' ? 'alert' : ''}"><span class="stat-ico bx bx-gauge ${cap.stateCls === 'danger' ? 'danger' : cap.stateCls === 'warning' ? 'warning' : 'muted'}"></span><div class="st-label">Capacidad</div><div class="st-value ${cap.stateCls === 'danger' ? 'danger' : ''}">${cap.pct}%</div><div class="st-sub">${cap.state}</div></div>
    </div>

    <div id="dashCap" style="margin-bottom:20px"></div>

    <div class="card" style="margin-bottom:20px;${hasPriority ? 'border-left:4px solid var(--primary)' : ''}">
      <div class="card-header">
        <div><div class="card-title">⚡ Pedidos prioritarios</div><div class="card-sub">Atiende primero los pedidos urgentes, de prioridad o delivery</div></div>
        ${hasPriority ? `<span class="badge badge-primary">${priorityOrders.length} a atender</span>` : ''}
      </div>
      <div class="card-body">
        ${hasPriority ? `<div class="order-queue" style="grid-template-columns:1fr">${priorityOrders.map((o) => priorityMiniCard(o)).join('')}</div>`
          : `<div class="empty-state" style="padding:12px 0"><div class="es-ico">✅</div><h3>Sin pedidos prioritarios</h3><p>No hay pedidos urgentes ni de entrega esperando por ahora.</p></div>`}
      </div>
    </div>

    <div class="grid grid-4">
      <div class="stat-card"><span class="stat-ico bx bx-credit-card warning"></span><div class="st-label">Por cobrar</div><div class="st-value warning">${payPending}</div><div class="st-sub"><a href="#" data-goto="adminbar/payments">Revisar</a></div></div>
      <div class="stat-card"><span class="stat-ico bx bx-cycling primary"></span><div class="st-label">Delivery activo</div><div class="st-value primary">${deliveries.length}</div><div class="st-sub"><a href="#" data-goto="adminbar/orders">Ver pedidos</a></div></div>
      <div class="stat-card success-card"><span class="stat-ico bx bx-line-chart success"></span><div class="st-label">Ventas del día</div><div class="st-value">${money(salesToday)}</div><div class="st-sub"><a href="#" data-goto="adminbar/sales-dashboard">Detalle</a></div></div>
      <div class="stat-card"><span class="stat-ico bx bx-x-circle ${outStock.length ? 'danger' : 'muted'}"></span><div class="st-label">Productos agotados</div><div class="st-value ${outStock.length ? 'danger' : ''}">${outStock.length}</div><div class="st-sub"><a href="#" data-goto="adminbar/stock">Ir a stock</a></div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-weight:700">Productos más vendidos</div>
        <a href="#" class="tiny" data-goto="adminbar/products" style="color:var(--primary);font-weight:600">Ver todos los productos →</a>
      </div>
      ${topProductsDash.length ? `<div style="display:flex;gap:12px;flex-wrap:wrap">${topProductsDash.map(({product,qty})=>`
        <div style="flex:1;min-width:140px;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)">
          <div style="width:44px;height:44px;border-radius:10px;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0">${product.emoji||productIcon(product)}</div>
          <div style="min-width:0">
            <div class="bold" style="font-size:var(--fs-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(product.name)}</div>
            <div class="tiny muted">${qty} unidades vendidas</div>
          </div>
        </div>
      `).join('')}</div>` : `<div class="tiny muted" style="text-align:center;padding:12px">Aún no hay ventas registradas</div>`}
    </div>`;

  renderCapacityCard(el.querySelector('#dashCap'));
  $$('[data-goto]', el).forEach((a) => a.onclick = (e) => { e.preventDefault(); const [s, p] = a.dataset.goto.split('/'); setRoute(`${s}/${p}`); });
  $$('[data-pri]', el).forEach((c) => c.onclick = () => setRoute('adminbar/orders'));
}

/* Tarjeta compacta para el panel de "Pedidos prioritarios" del dashboard */
function priorityMiniCard(o) {
  const priTag = o.priority === 'urgent'
    ? `<span class="priority-tag urgent">⚡ Urgente</span>`
    : o.priority === 'priority' ? `<span class="priority-tag priority">⭐ Prioridad</span>` : '';
  return `
    <div class="queue-order pri-${o.priority === 'normal' ? 'normal' : o.priority}" style="cursor:pointer" data-pri="${o.id}">
      <div class="queue-head">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="bold" style="color:var(--primary-strong)">#${o.id}</span>
          <span class="tiny muted">${o.time}</span>
          ${priTag}
          ${statusMeta(o.status)}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${o.delivery === 'delivery' ? `<span class="badge badge-info">🛵 P${o.deliveryInfo?.piso} ${o.deliveryInfo?.aula}</span>` : `<span class="badge badge-neutral">🏪</span>`}
          <span class="small bold">${money(o.total)}</span>
        </div>
      </div>
      <div class="queue-items">
        ${o.items.map((i) => `<div><span>${esc(i.name)}</span><span class="muted">× ${i.qty}</span></div>`).join('')}
      </div>
      <div class="tiny muted" style="color:var(--text-2)"><b>${esc(o.userName)}</b> · ${paymentMethodLabel(o.payment)} ${paymentMeta(o.paymentStatus)} · est. ${o.prepMin} min</div>
    </div>`;
}
