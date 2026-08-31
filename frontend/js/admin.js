/* ============================================================
   admin.js — Panel de la Administradora del Bar
   ============================================================ */

const BAR_SECTIONS = {
  dashboard: { label: 'Dashboard', icon: '📊' },
  orders: { label: 'Pedidos', icon: '🧾' },
  products: { label: 'Productos', icon: '🍔' },
  stock: { label: 'Stock', icon: '📦' },
  payments: { label: 'Pagos', icon: '💳' },
  sales: { label: 'Ventas', icon: '📈' },
  delivery: { label: 'Delivery', icon: '🛵' },
  config: { label: 'Configuración', icon: '⚙️' },
};

function renderBarAdmin(page) {
  const app = $('#app');
  if (!currentUser() || currentUser().role !== 'adminbar') return route('login');
  const sec = BAR_SECTIONS[page] ? page : 'dashboard';
  syncBodyClass();

  const queueCount = Store.orders.filter((o) => o.status === 'queue').length;
  const prepCount = Store.orders.filter((o) => o.status === 'prep').length;
  const readyCount = Store.orders.filter((o) => o.status === 'ready').length;

  app.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="sb-brand"><img class="sidebar-brand-image" src="assets/bar-intesud-logo.png" alt=""> BAR INTESUD</div>
        <nav class="sb-nav">
          ${Object.entries(BAR_SECTIONS).map(([k, v]) => `
            <a class="sb-link ${k === sec ? 'active' : ''}" href="#" data-bar="${k}">
              <span class="ico">${v.icon}</span>${v.label}
              ${k === 'orders' && queueCount ? `<span class="sb-badge">${queueCount}</span>` : ''}
            </a>`).join('')}
        </nav>
        <div class="sb-footer">
          <div class="bold small">${esc(currentUser().name)}</div>
          <div class="tiny muted">Administradora de cafetería</div>
        </div>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="hamburger" id="barHamburger" title="Menú">☰</button>
          <span style="font-size:1.3rem">${BAR_SECTIONS[sec].icon}</span>
          <span class="page-name">${BAR_SECTIONS[sec].label}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
            <span id="cafePill"></span>
            <div class="profile-chip" id="barUserMenu">
              <div class="avatar sm">${esc(initials(currentUser().name))}</div>
              <span class="pname">${esc(currentUser().name)}</span> ▾
              <div class="dropdown-menu" id="barUserDropdown" style="display:none">
                <a class="dropdown-item" href="#" data-link="profile"><span class="ico">👤</span>Mi perfil</a>
                <div class="dropdown-sep"></div>
                <a class="dropdown-item danger" href="#" id="btnBarLogout"><span class="ico">⏻</span>Cerrar sesión</a>
              </div>
            </div>
          </div>
        </div>
        <div class="admin-content" id="barContent">
        </div>
      </div>
    </div>`;

  renderCafePill($('#cafePill'));

  const sidebar = $('.admin-sidebar', app);
  const closeSidebar = () => { sidebar?.classList.remove('open'); $('.sb-scrim')?.remove(); };
  $('#barHamburger')?.addEventListener('click', () => {
    sidebar?.classList.add('open');
    if (!$('.sb-scrim')) {
      const scrim = document.createElement('div');
      scrim.className = 'sb-scrim';
      scrim.addEventListener('click', closeSidebar);
      document.body.appendChild(scrim);
    }
  });
  $$('[data-bar]', app).forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); closeSidebar(); setRoute('adminbar/' + a.dataset.bar);
  }));
  const ud = $('#barUserDropdown');
  $('#barUserMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'profile') { renderProfileModal(); ud.style.display = 'none'; } else setRoute(t); });
  $('#btnBarLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); route('login'); };

  const content = $('#barContent');
  const renderers = {
    dashboard: barDashboard,
    orders: barOrders,
    products: barProducts,
    stock: barStock,
    payments: barPayments,
    sales: barSales,
    delivery: barDelivery,
    config: barConfig,
  };
  renderers[sec](content);
}

function renderCafePill(el) {
  const cfg = Store.config;
  el.innerHTML = `<span class="badge ${cfg.cafeOpen ? 'badge-success' : 'badge-danger'}">${cfg.cafeOpen ? '● ABIERTA' : '● CERRADA'}</span>`;
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function barDashboard(el) {
  const orders = Store.orders;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today);
  const queue = orders.filter((o) => o.status === 'queue');
  const prep = orders.filter((o) => o.status === 'prep');
  const ready = orders.filter((o) => o.status === 'ready');
  const cap = capacityInfo();
  const payPending = orders.filter((o) => ['pending', 'review'].includes(o.paymentStatus) && ['queue', 'confirmed', 'prep', 'ready'].includes(o.status)).length;
  const deliveries = orders.filter((o) => o.delivery === 'delivery' && ['queue', 'confirmed', 'prep', 'ready'].includes(o.status));
  const salesToday = todayOrders.filter((o) => ['delivered', 'ready', 'prep', 'queue', 'confirmed'].includes(o.status)).reduce((s, o) => s + o.total, 0);

  const lowStock = Store.products.filter((p) => p.available && p.stock <= p.minStock && p.stock > 0);
  const outStock = Store.products.filter((p) => p.stock === 0);

  // Pedidos prioritarios: qué atender primero (urgente/prioridad, delivery o pago en revisión)
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

    ${outStock.length ? `<div class="status-banner danger"><span class="ico">⛔</span><div><b>Productos agotados:</b> ${outStock.map((p) => p.name).join(', ')}</div></div>` : ''}
    ${lowStock.length ? `<div class="status-banner warning"><span class="ico">⚠️</span><div><b>Stock bajo:</b> ${lowStock.map((p) => p.name).join(', ')}</div></div>` : ''}

    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="stat-card ${queue.length >= 5 ? 'danger-card' : ''}"><div class="st-label">Pedidos en cola</div><div class="st-value ${queue.length >= 5 ? 'danger' : 'primary'}">${queue.length}</div><div class="st-sub">esperando confirmación</div></div>
      <div class="stat-card"><div class="st-label">En preparación</div><div class="st-value warning">${prep.length}</div><div class="st-sub">preparándose ahora</div></div>
      <div class="stat-card success-card"><div class="st-label">Listos</div><div class="st-value">${ready.length}</div><div class="st-sub">listos para retirar</div></div>
      <div class="stat-card ${cap.stateCls === 'danger' ? 'danger-card' : cap.stateCls === 'warning' ? 'alert' : ''}"><div class="st-label">Capacidad</div><div class="st-value ${cap.stateCls === 'danger' ? 'danger' : ''}">${cap.pct}%</div><div class="st-sub">${cap.state}</div></div>
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
      <div class="stat-card alert"><div class="st-label">Pagos pendientes</div><div class="st-value warning">${payPending}</div><div class="st-sub"><a href="#" data-goto="adminbar/payments">Revisar</a></div></div>
      <div class="stat-card"><div class="st-label">Delivery activo</div><div class="st-value primary">${deliveries.length}</div><div class="st-sub"><a href="#" data-goto="adminbar/orders">Ver pedidos</a></div></div>
      <div class="stat-card success-card"><div class="st-label">Ventas del día</div><div class="st-value">${money(salesToday)}</div><div class="st-sub"><a href="#" data-goto="adminbar/sales">Detalle</a></div></div>
      <div class="stat-card"><div class="st-label">Productos agotados</div><div class="st-value ${outStock.length ? 'danger' : ''}">${outStock.length}</div><div class="st-sub"><a href="#" data-goto="adminbar/stock">Ir a stock</a></div></div>
    </div>

    <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">
      ${[['adminbar/orders', '🧾', 'Pedidos'], ['adminbar/products', '🍔', 'Productos'], ['adminbar/stock', '📦', 'Stock'], ['adminbar/payments', '💳', 'Pagos'], ['adminbar/sales', '📈', 'Ventas'], ['adminbar/delivery', '🛵', 'Delivery']].map(([r, ic, l]) =>
        `<a href="#" class="btn btn-outline" data-goto="${r}">${ic} ${l}</a>`).join('')}
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

/* ============================================================
   PEDIDOS (cola)
   ============================================================ */
function barOrders(el) {
  const orders = Store.orders;
  const actives = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const queue = orders.filter((o) => o.status === 'queue');
  const prep = orders.filter((o) => o.status === 'prep');
  const ready = orders.filter((o) => o.status === 'ready');
  const delivered = orders.filter((o) => o.status === 'delivered');

  el.innerHTML = `
    <div class="page-title"><h1>Pedidos</h1><span class="badge badge-primary">${actives.length} activos</span></div>
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
      ${needsPayment ? `<div class="alert warning" style="margin-top:10px;padding:8px 12px"><span class="a-ico">💳</span><div>Pago ${paymentMethodLabel(o.payment)}: ${o.paymentStatus === 'review' ? 'en revisión' : 'pendiente'} ${paymentMeta(o.paymentStatus)}</div></div>` : ''}
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

/* ============================================================
   PRODUCTOS
   ============================================================ */
function barProducts(el) {
  const products = Store.products;
  const cats = [...new Set(products.map((p) => p.category))];
  let cat = 'Todas';

  el.innerHTML = `
    <div class="page-title"><h1>Productos</h1><button class="btn" id="addProduct">+ Nuevo producto</button></div>
    <div class="adv-tabs">
      <button class="category-chip active" data-cat="Todas">Todas</button>
      ${cats.map((c) => `<button class="category-chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <div id="prodArea"></div>`;

  const render = () => {
    const area = $('#prodArea');
    const list = cat === 'Todas' ? products : products.filter((p) => p.category === cat);
    if (!list.length) { area.innerHTML = emptyState('🍔', 'Sin productos', 'No hay productos en esta categoría.'); return; }
    area.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Prep</th><th>Estado</th><th></th></tr></thead>
      <tbody>${list.map((p) => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center">${productIcon(p)}</div><div><div class="bold">${esc(p.name)}</div><div class="tiny muted">${esc(p.desc)}</div></div></div></td>
          <td>${esc(p.category)}</td>
          <td class="bold">${money(p.price)}</td>
          <td>${stockBadge(p)}</td>
          <td>${p.prepMin} min</td>
          <td>${p.available ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
          <td>
            <button class="btn btn-outline btn-sm" data-edit="${p.id}">Editar</button>
            <button class="btn btn-neutral btn-sm" data-toggle="${p.id}">${p.available ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`).join('')}
      </tbody></table></div>`;

    $$('[data-edit]', area).forEach((b) => b.onclick = () => productFormModal(products.find((p) => p.id === b.dataset.edit)));
    $$('[data-toggle]', area).forEach((b) => b.onclick = () => {
      const p = products.find((x) => x.id === b.dataset.toggle);
      p.available = !p.available;
      Store.products = products;
      logAudit(p.available ? 'Activó producto' : 'Desactivó producto', p.name);
      toast(p.name + (p.available ? ' activado.' : ' desactivado.'), 'success');
      renderBarAdmin('products');
    });
  };

  $$('[data-cat]', el).forEach((t) => t.onclick = () => {
    $$('[data-cat]', el).forEach((x) => x.classList.remove('active'));
    t.classList.add('active'); cat = t.dataset.cat; render();
  });

  $('#addProduct').onclick = () => productFormModal(null);
  render();
}

function productFormModal(p) {
  const isEdit = !!p;
  const cats = CATEGORIES;
  const ov = modal(`
    <h3>${isEdit ? 'Editar' : 'Nuevo'} producto</h3>
    <div class="field"><label class="label">Nombre</label><input class="input" id="pfName" value="${isEdit ? esc(p.name) : ''}"><div class="input-err-msg" id="pfNameErr"></div></div>
    <div class="field"><label class="label">Categoría</label><select class="input" id="pfCat">${cats.map((c) => `<option ${isEdit && p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="grid grid-2">
      <div class="field"><label class="label">Precio ($)</label><input class="input" type="number" step="0.05" id="pfPrice" value="${isEdit ? p.price : ''}"><div class="input-err-msg" id="pfPriceErr"></div></div>
      <div class="field"><label class="label">Stock</label><input class="input" type="number" id="pfStock" value="${isEdit ? p.stock : ''}"><div class="input-err-msg" id="pfStockErr"></div></div>
    </div>
    <div class="grid grid-2">
      <div class="field"><label class="label">Tiempo prep (min)</label><input class="input" type="number" id="pfPrep" value="${isEdit ? p.prepMin : ''}"><div class="input-err-msg" id="pfPrepErr"></div></div>
      <div class="field"><label class="label">Stock mínimo</label><input class="input" type="number" id="pfMin" value="${isEdit ? p.minStock : ''}"><div class="input-err-msg" id="pfMinErr"></div></div>
    </div>
    <div class="field"><label class="label">Descripción</label><textarea class="input" id="pfDesc">${isEdit ? esc(p.desc) : ''}</textarea></div>
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn" data-save>${isEdit ? 'Guardar cambios' : 'Crear producto'}</button>
    </div>`, { wide: true });

  $('[data-cancel]', ov).onclick = () => ov.remove();
  $('[data-save]', ov).onclick = () => {
    const name = $('#pfName', ov).value.trim();
    const price = parseFloat($('#pfPrice', ov).value);
    const stock = parseInt($('#pfStock', ov).value);
    const prep = parseInt($('#pfPrep', ov).value);
    const mn = parseInt($('#pfMin', ov).value);
    let ok = true;
    if (!name) { $('#pfNameErr', ov).textContent = 'El nombre es obligatorio.'; ok = false; }
    if (isNaN(price) || price <= 0) { $('#pfPriceErr', ov).textContent = 'Precio inválido.'; ok = false; }
    if (isNaN(stock) || stock < 0) { $('#pfStockErr', ov).textContent = 'Stock inválido.'; ok = false; }
    if (isNaN(prep) || prep <= 0) { $('#pfPrepErr', ov).textContent = 'Tiempo inválido.'; ok = false; }
    if (isNaN(mn) || mn < 0) { $('#pfMinErr', ov).textContent = 'Stock mínimo inválido.'; ok = false; }
    if (!ok) return;
    const products = Store.products;
    if (isEdit) {
      Object.assign(p, { name, category: $('#pfCat', ov).value, price, stock, prepMin: prep, minStock: mn, desc: $('#pfDesc', ov).value, available: p.stock > 0 ? p.available : false });
      logAudit('Editó producto', name);
      toast('Producto actualizado.', 'success');
    } else {
      products.push({ id: 'p' + Date.now(), name, category: $('#pfCat', ov).value, price, stock, minStock: mn, prepMin: prep, available: stock > 0, desc: $('#pfDesc', ov).value, emoji: '' });
      logAudit('Creó producto', name);
      toast('Producto creado.', 'success');
    }
    Store.products = products;
    ov.remove();
    renderBarAdmin('products');
  };
}

function stockBadge(p) {
  if (p.stock === 0) return '<span class="badge badge-danger">AGOTADO</span>';
  if (p.stock <= p.minStock) return `<span class="badge badge-warning">${p.stock} · bajo</span>`;
  return `<span class="badge badge-success">${p.stock}</span>`;
}

/* ============================================================
   STOCK
   ============================================================ */
function barStock(el) {
  const products = Store.products;
  const history = Store.stockHistory;
  el.innerHTML = `
    <div class="page-title"><h1>Stock</h1><span class="badge badge-primary">${products.filter((p) => p.stock === 0).length} agotados</span></div>
    <div class="grid grid-3" style="margin-bottom:20px">
      <div class="stat-card success-card"><div class="st-label">Disponibles</div><div class="st-value">${products.filter((p) => p.stock > p.minStock).length}</div></div>
      <div class="stat-card alert"><div class="st-label">Stock bajo</div><div class="st-value warning">${products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length}</div></div>
      <div class="stat-card danger-card"><div class="st-label">Agotados</div><div class="st-value danger">${products.filter((p) => p.stock === 0).length}</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th><th>Última actualización</th><th></th></tr></thead>
      <tbody>${products.map((p) => {
        const h = history.find((x) => x.productId === p.id);
        const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
        const fillCls = p.stock === 0 ? 'background:var(--danger)' : p.stock <= p.minStock ? 'background:var(--warning)' : 'background:var(--success)';
        return `<tr>
          <td><div class="bold">${esc(p.name)}</div></td>
          <td><div class="stock-line"><b>${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td>
          <td>${p.minStock}</td>
          <td>${stockBadge(p)}</td>
          <td>${h ? `${h.time} ${h.date}` : '—'}</td>
          <td>
            <button class="btn btn-outline btn-sm" data-inc="${p.id}">+ Aumentar</button>
            <button class="btn btn-neutral btn-sm" data-dec="${p.id}">− Disminuir</button>
          </td>
        </tr>`;
      }).join('')}</tbody></table></div>
    <div style="margin-top:24px">
      <h3 class="section-title">Historial de cambios</h3>
      <div class="card" id="stockHist"></div>
    </div>`;

  const histWrap = $('#stockHist');
  if (!history.length) histWrap.innerHTML = emptyState('📋', 'Sin cambios registrados', 'Modifica el stock para ver el historial.');

  const adjust = (p, delta) => {
    const newVal = p.stock + delta;
    if (newVal < 0) { toast('El stock no puede ser negativo.', 'warning'); return; }
    const entry = { productId: p.id, name: p.name, delta, newVal, time: nowTime(), date: new Date().toISOString().slice(0, 10) };
    p.stock = newVal;
    Store.products = products;
    history.unshift(entry);
    Store.stockHistory = history;
    logAudit(`${delta > 0 ? 'Aumentó' : 'Disminuyó'} stock`, p.name);
    toast(p.name + ' ' + (delta > 0 ? '+' : '') + delta + ' unidades.', 'success');
    renderBarAdmin('stock');
  };

  $$('[data-inc]', el).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
  $$('[data-dec]', el).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });

  histWrap.innerHTML = history.slice(0, 15).map((h) => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.88rem">
      <span>${esc(h.name)} <span class="badge ${h.delta > 0 ? 'badge-success' : 'badge-danger'}">${h.delta > 0 ? '+' + h.delta : h.delta}</span> → <b>${h.newVal}</b></span>
      <span class="tiny muted">${h.time} · ${h.date}</span>
    </div>`).join('');
}

function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ============================================================
   PAGOS
   ============================================================ */
function barPayments(el) {
  const orders = Store.orders;
  const payOrders = orders.filter((o) => o.payment !== 'efectivo' || o.paymentStatus !== 'paid');
  const pending = payOrders.filter((o) => o.paymentStatus === 'pending');
  const review = payOrders.filter((o) => o.paymentStatus === 'review');

  el.innerHTML = `
    <div class="page-title"><h1>Pagos</h1></div>
    ${review.length ? `<div class="status-banner info"><span class="ico">🔍</span><div><b>${review.length} pago(s) en revisión.</b> Revisa los comprobantes de transferencia.</div></div>` : ''}
    <div class="table-wrap"><table>
      <thead><tr><th>Pedido</th><th>Usuario</th><th>Método</th><th>Total</th><th>Estado pago</th><th>Fecha</th><th></th></tr></thead>
      <tbody>${orders.map((o) => `
        <tr>
          <td class="bold">#${o.id}</td>
          <td>${esc(o.userName)}</td>
          <td><span class="badge badge-primary">${paymentMethodLabel(o.payment)}</span></td>
          <td class="bold">${money(o.total)}</td>
          <td>${paymentMeta(o.paymentStatus)}</td>
          <td class="small muted">${o.date} ${o.time}</td>
          <td>
            ${o.paymentStatus === 'review' ? `<button class="btn btn-success btn-sm" data-ap="${o.id}">Aprobar</button> <button class="btn btn-danger-outline btn-sm" data-rj="${o.id}">Rechazar</button>` : ''}
            ${o.paymentStatus === 'pending' && o.payment === 'deuna' ? `<button class="btn btn-success btn-sm" data-ap="${o.id}">Aprobar</button>` : ''}
            ${o.payment === 'transferencia' ? `<button class="btn btn-outline btn-sm" data-v="${o.id}">Ver comprobante</button>` : ''}
            ${o.paymentStatus === 'refunded' ? '<span class="badge badge-info">Reembolso aplicado</span>' : ''}
          </td>
        </tr>`).join('')}</tbody></table></div>`;

  $$('[data-v]', el).forEach((b) => b.onclick = () => {
    const o = orders.find((x) => x.id === b.dataset.v);
    modal(`<h3>Comprobante de transferencia</h3>
      <div class="card" style="background:var(--primary-soft);text-align:center;padding:30px;margin-top:12px">
        <div style="font-size:3rem">🧾</div>
        <div class="tiny muted">Comprobante simulado</div>
        <div class="bold" style="margin-top:8px">#${o.id} · ${money(o.total)}</div>
        <div class="muted small">${o.userName} · ${o.date}</div>
      </div>
      <div class="muted small" style="margin-top:12px">Imagen del comprobante cargada por el usuario (simulada).</div>
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn" data-c>Cerrar</button></div>`);
    const m = $('.modal-overlay');
    $('[data-c]', m).onclick = () => m.remove();
  });

  const setPay = (id, status) => {
    const o = orders.find((x) => x.id === id);
    o.paymentStatus = status;
    saveOrders();
    logAudit('Actualizó pago', `${o.id} → ${status}`);
    toast('Pago #' + o.id + ' ' + (status === 'approved' ? 'aprobado.' : 'rechazado.'), status === 'approved' ? 'success' : 'error');
    renderBarAdmin('payments');
  };
  $$('[data-ap]', el).forEach((b) => b.onclick = () => setPay(b.dataset.ap, 'approved'));
  $$('[data-rj]', el).forEach((b) => b.onclick = () => setPay(b.dataset.rj, 'rejected'));
}

/* ============================================================
   VENTAS
   ============================================================ */
function barSales(el) {
  const orders = Store.orders;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today && ['delivered', 'ready', 'prep', 'queue', 'confirmed'].includes(o.status));
  const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const countToday = todayOrders.length;

  // product sales
  const prodSales = {};
  orders.filter((o) => o.status === 'delivered' || o.status === 'ready').forEach((o) => o.items.forEach((i) => { prodSales[i.productId] = (prodSales[i.productId] || 0) + i.qty; }));
  let best = null, worst = null;
  Object.entries(prodSales).forEach(([id, qty]) => {
    if (!best || qty > best.qty) best = { id, qty };
    if (!worst || qty < worst.qty) worst = { id, qty };
  });
  const bestProduct = best ? Store.products.find((p) => p.id === best.id) : null;
  const worstProduct = worst ? Store.products.find((p) => p.id === worst.id) : null;

  // last 7 days chart
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const s = orders.filter((o) => o.date === ds).reduce((ss, o) => ss + o.total, 0);
    days.push({ label: d.toLocaleDateString('es-EC', { weekday: 'short' }), total: s });
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  el.innerHTML = `
    <div class="page-title"><h1>Ventas</h1></div>
    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="stat-card success-card"><div class="st-label">Ventas del día</div><div class="st-value">${money(salesToday)}</div></div>
      <div class="stat-card"><div class="st-label">Pedidos del día</div><div class="st-value primary">${countToday}</div></div>
      <div class="stat-card"><div class="st-label">Más vendido</div><div class="st-value" style="font-size:1rem">${bestProduct ? esc(bestProduct.name) : '—'}</div><div class="st-sub">${best?.qty || 0} unidades</div></div>
      <div class="stat-card"><div class="st-label">Menos vendido</div><div class="st-value" style="font-size:1rem">${worstProduct ? esc(worstProduct.name) : '—'}</div><div class="st-sub">${worst?.qty || 0} unidades</div></div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:16px">Ventas por día (últimos 7 días)</h3>
      <div class="bar-chart">
        ${days.map((d) => `<div class="bc-col"><div class="bc-bar${d === days[days.length - 1] ? ' hl' : ''}" style="height:${Math.max(3, (d.total / maxDay) * 100)}%"></div><div class="bc-label">${d.label}</div><div class="bc-label bold">${money(d.total)}</div></div>`).join('')}
      </div>
    </div>
    <h3 class="section-title">Historial de ventas</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead>
      <tbody>${orders.filter((o) => ['delivered', 'ready', 'prep', 'queue', 'confirmed'].includes(o.status)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((o) => `
        <tr><td class="bold">#${o.id}</td><td class="small">${o.date} ${o.time}</td><td>${esc(o.userName)}</td><td>${o.delivery === 'delivery' ? 'Delivery' : 'Retiro'}</td><td>${paymentMethodLabel(o.payment)}</td><td class="bold">${money(o.total)}</td><td>${statusMeta(o.status)}</td></tr>`).join('')}
      </tbody></table></div>`;
}

/* ============================================================
   DELIVERY
   ============================================================ */
function barDelivery(el) {
  const cfg = Store.config;
  const week = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  el.innerHTML = `
    <div class="page-title"><h1>Delivery interno</h1></div>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-bottom:14px">Configuración del delivery</h3>
        <div class="field"><label class="checkbox-row"><input type="checkbox" id="dlEnabled" ${cfg.deliveryEnabled ? 'checked' : ''}> <b>Habilitar delivery interno</b></label><div class="tiny muted" style="margin-left:26px">Cobertura exclusiva dentro del edificio INTESUD (Piso 1 - 3).</div></div>
        <div class="field" id="dlDaysField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <label class="label">Días de entrega</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlDays">
            ${week.map((d) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-day="${d}" ${cfg.deliveryDays.includes(d) ? 'checked' : ''} style="margin-right:4px">${d}</label>`).join('')}
          </div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label class="label">Hora inicio</label><input class="input" type="time" id="dlStart" value="${cfg.orderOpen}"></div>
          <div class="field"><label class="label">Hora fin</label><input class="input" type="time" id="dlEnd" value="${cfg.orderClose}"></div>
        </div>
        <div class="field"><label class="label">Capacidad máxima de delivery</label><input class="input" type="number" id="dlMax" value="${cfg.deliveryMax}"><div class="tiny muted">Pedidos de delivery que pueden atenderse simultáneamente.</div></div>
        <button class="btn" id="dlSave">Guardar configuración</button>
      </div>
      <div>
        <div class="capacity-card" style="margin-bottom:16px">
          <div class="capacity-header"><h3>Capacidad de delivery</h3><span class="badge ${cfg.deliveryEnabled ? 'badge-success' : 'badge-danger'}">${cfg.deliveryEnabled ? 'Disponible' : parseInt(cfg.deliveryCurrent) >= parseInt(cfg.deliveryMax) ? 'Capacidad llena' : 'Activo'}</span></div>
          <div class="bar-track"><div class="bar-fill ${cfg.deliveryEnabled && cfg.deliveryCurrent >= cfg.deliveryMax ? 'danger' : ''}" style="width:${Math.min(100, (cfg.deliveryCurrent / cfg.deliveryMax) * 100)}%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px"><span class="muted small">${cfg.deliveryCurrent} / ${cfg.deliveryMax} pedidos de delivery</span></div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:10px">Pedidos de delivery</h3>
          <div id="dlOrders"></div>
        </div>
      </div>
    </div>`;

  if (!cfg.deliveryEnabled) {
    el.querySelector('#dlOrders').innerHTML = `<div class="status-banner danger" style="margin:0"><span class="ico">🚫</span><div><b>Delivery no disponible</b><br>Habilita el servicio para recibir pedidos de delivery.</div></div>`;
    el.querySelector('.capacity-card .capacity-header .badge').textContent = 'No disponible';
  } else {
    const dlOrders = Store.orders.filter((o) => o.delivery === 'delivery' && ['queue', 'confirmed', 'prep', 'ready'].includes(o.status));
    $('#dlOrders').innerHTML = dlOrders.length ? dlOrders.map((o) => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);align-items:center">
        <div><div class="bold small">#${o.id} · P${o.deliveryInfo?.piso} ${o.deliveryInfo?.aula}</div><div class="tiny muted">${esc(o.userName)} · ${money(o.total)}</div></div>
        ${statusMeta(o.status)}
      </div>`).join('') : emptyState('🛵', 'Sin pedidos de delivery', 'Por ahora no hay pedidos de delivery.');
  }

  $('#dlEnabled').onchange = () => {
    cfg.deliveryEnabled = $('#dlEnabled').checked;
    const field = $('#dlDaysField');
    field.style.opacity = cfg.deliveryEnabled ? '' : '.5';
    field.style.pointerEvents = cfg.deliveryEnabled ? '' : 'none';
  };

  $('#dlSave').onclick = () => {
    cfg.orderOpen = $('#dlStart').value || cfg.orderOpen;
    cfg.orderClose = $('#dlEnd').value || cfg.orderClose;
    cfg.deliveryMax = parseInt($('#dlMax').value) || cfg.deliveryMax;
    cfg.deliveryDays = week.filter((d) => $(`[data-day="${d}"]`, el)?.checked);
    const enabled = $('#dlEnabled').checked;
    cfg.deliveryEnabled = enabled;
    Store.config = cfg;
    logAudit('Actualizó configuración de delivery', enabled ? 'Delivery habilitado' : 'Delivery deshabilitado');
    toast('Configuración de delivery guardada.', 'success');
    renderBarAdmin('delivery');
  };
}

/* ============================================================
   CONFIGURACIÓN DE CAFETERÍA
   ============================================================ */
function barConfig(el) {
  const cfg = Store.config;
  el.innerHTML = `
    <div class="page-title"><h1>Configuración de la cafetería</h1></div>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-bottom:14px">Estado de la cafetería</h3>
        <div class="capacity-card" style="text-align:center">
          <div><span class="badge ${cfg.cafeOpen ? 'badge-success' : 'badge-danger'}" style="font-size:1rem">${cfg.cafeOpen ? '● ABIERTA' : '● CERRADA'}</span></div>
          <button class="btn btn-outline" style="margin-top:14px" id="toggleCafe">${cfg.cafeOpen ? 'Cambiar a cerrada' : 'Cambiar a abierta'}</button>
          <div class="tiny muted" style="margin-top:10px">Si la cafetería está cerrada, los usuarios pueden ver el menú pero no realizar pedidos.</div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Horario de pedidos</h3>
        <div class="grid grid-2">
          <div class="field"><label class="label">Pedidos desde</label><input class="input" type="time" id="ohOpen" value="${cfg.orderOpen}"></div>
          <div class="field"><label class="label">Pedidos hasta</label><input class="input" type="time" id="ohClose" value="${cfg.orderClose}"></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label class="label">Receso desde</label><input class="input" type="time" id="brStart" value="${cfg.breakStart}"></div>
          <div class="field"><label class="label">Receso hasta</label><input class="input" type="time" id="brEnd" value="${cfg.breakEnd}"></div>
        </div>
        <div class="field"><label class="label">Capacidad de preparación (pedidos)</label><input class="input" type="number" id="cpCap" value="${cfg.capacity}"><div class="tiny muted">Máximo de pedidos simultáneos que la administradora puede preparar.</div></div>
        <button class="btn" id="ohSave">Guardar horario y capacidad</button>
      </div>
    </div>`;

  $('#toggleCafe').onclick = () => {
    cfg.cafeOpen = !cfg.cafeOpen;
    Store.config = cfg;
    logAudit('Cambió estado de la cafetería', cfg.cafeOpen ? 'Abierta' : 'Cerrada');
    toast('La cafetería está ' + (cfg.cafeOpen ? 'ABIERTA' : 'CERRADA') + '.', cfg.cafeOpen ? 'success' : 'warning');
    renderBarAdmin('config');
  };

  $('#ohSave').onclick = () => {
    cfg.orderOpen = $('#ohOpen').value || cfg.orderOpen;
    cfg.orderClose = $('#ohClose').value || cfg.orderClose;
    cfg.breakStart = $('#brStart').value || cfg.breakStart;
    cfg.breakEnd = $('#brEnd').value || cfg.breakEnd;
    cfg.capacity = parseInt($('#cpCap').value) || cfg.capacity;
    Store.config = cfg;
    logAudit('Actualizó horario', 'Horario de pedidos');
    toast('Configuración guardada.', 'success');
    renderBarAdmin('config');
  };
}
