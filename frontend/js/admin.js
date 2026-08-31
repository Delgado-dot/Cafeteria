/* ============================================================
   admin.js — Panel de la Administradora del Bar
   ============================================================ */

const BAR_SECTIONS = {
  dashboard: { label: 'Dashboard', icon: 'bx-grid-alt' },
  orders: { label: 'Pedidos', icon: 'bx-receipt' },
  products: { label: 'Productos', icon: 'bx-food-menu' },
  stock: { label: 'Stock', icon: 'bx-box' },
  payments: { label: 'Pagos', icon: 'bx-credit-card' },
  'sales-dashboard': { label: 'Ventas', icon: 'bx-line-chart' },
  delivery: { label: 'Delivery', icon: 'bx-cycling' },
  'config-hours': { label: 'Configuración', icon: 'bx-cog' },
};

const BAR_PAGES = {
  ...BAR_SECTIONS,
  'payment-detail': { label: 'Detalle de pago', icon: 'bx-credit-card' },
  'sales-history': { label: 'Historial de ventas', icon: 'bx-history' },
  'stock-history': { label: 'Historial de stock', icon: 'bx-history' },
  'config-status': { label: 'Estado de cafetería', icon: 'bx-coffee-togo' },
};

// Mapeo de presentación de estados de pago (solo label + color, sin tocar valores internos)
const paymentStatusLabels = {
  pending: { label: 'Pendiente', cls: 'badge-warning' },
  review: { label: 'En revisión', cls: 'badge-info' },
  approved: { label: 'Aprobado', cls: 'badge-success' },
  paid: { label: 'Pagado', cls: 'badge-success' },
  rejected: { label: 'Rechazado', cls: 'badge-danger' },
  refunded: { label: 'Reembolsado', cls: 'badge-neutral' },
};

// Criterio único para "Por cobrar" — usado en Dashboard y Pagos para evitar desincronización
function isPendingPayment(order) {
  return order.paymentStatus === 'pending' && ['queue', 'confirmed', 'prep', 'ready'].includes(order.status);
}
function getPendingPayments(orders = Store.orders) {
  return orders.filter(isPendingPayment);
}

// Track last visited payment order ID for highlight-on-return
let lastVisitedPaymentId = null;

function isValidSale(order) {
  return ['approved', 'paid'].includes(order.paymentStatus);
}

function paymentMethodIcon(method) {
  return ({ deuna: 'bx-mobile-alt', transferencia: 'bx-transfer-alt', efectivo: 'bx-money' }[method] || 'bx-credit-card');
}

function ensureAdminbarPresentationStyles() {
  if (document.getElementById('adminbar-presentation')) return;
  const style = document.createElement('style');
  style.id = 'adminbar-presentation';
  style.textContent = `
    @keyframes adminbarEnter {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes adminbarBadgePop {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes adminbarModalIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Cards (existing sales summary) */
    .sales-summary-grid .sales-summary-card { animation: adminbarEnter var(--t-slow) both; }
    .sales-summary-grid .sales-summary-card:nth-child(2) { animation-delay: 70ms; }
    .sales-summary-grid .sales-summary-card:nth-child(3) { animation-delay: 140ms; }
    .sales-summary-grid .sales-summary-card:nth-child(4) { animation-delay: 210ms; }

    /* Stock summary cards (grid-3) - same staggered entrance */
    .grid-3 .stat-card { animation: adminbarEnter var(--t-slow) both; }
    .grid-3 .stat-card:nth-child(2) { animation-delay: 70ms; }
    .grid-3 .stat-card:nth-child(3) { animation-delay: 140ms; }

    /* Table rows - staggered fade-in */
    .admin-table tbody tr { animation: adminbarEnter var(--t-med) both; }
    .admin-table tbody tr:nth-child(1)  { animation-delay: 10ms; }
    .admin-table tbody tr:nth-child(2)  { animation-delay: 25ms; }
    .admin-table tbody tr:nth-child(3)  { animation-delay: 40ms; }
    .admin-table tbody tr:nth-child(4)  { animation-delay: 55ms; }
    .admin-table tbody tr:nth-child(5)  { animation-delay: 70ms; }
    .admin-table tbody tr:nth-child(6)  { animation-delay: 85ms; }
    .admin-table tbody tr:nth-child(7)  { animation-delay: 100ms; }
    .admin-table tbody tr:nth-child(8)  { animation-delay: 115ms; }
    .admin-table tbody tr:nth-child(9)  { animation-delay: 130ms; }
    .admin-table tbody tr:nth-child(10) { animation-delay: 145ms; }
    .admin-table tbody tr:nth-child(11) { animation-delay: 160ms; }
    .admin-table tbody tr:nth-child(12) { animation-delay: 175ms; }
    .admin-table tbody tr:nth-child(13) { animation-delay: 190ms; }
    .admin-table tbody tr:nth-child(14) { animation-delay: 205ms; }
    .admin-table tbody tr:nth-child(15) { animation-delay: 220ms; }
    .admin-table tbody tr:nth-child(16) { animation-delay: 235ms; }
    .admin-table tbody tr:nth-child(17) { animation-delay: 250ms; }
    .admin-table tbody tr:nth-child(18) { animation-delay: 265ms; }
    .admin-table tbody tr:nth-child(19) { animation-delay: 280ms; }
    .admin-table tbody tr:nth-child(20) { animation-delay: 295ms; }

    /* Badges - pop in */
    .admin-table .badge,
    .sales-summary-grid .badge,
    .queue-order .badge,
    .stat-card .badge { animation: adminbarBadgePop var(--t-fast) both; }

    /* Modals - fade + scale */
    .modal-overlay .modal { animation: adminbarModalIn var(--t-med) both; }

    @media (prefers-reduced-motion: reduce) {
      .sales-summary-grid .sales-summary-card,
      .grid-3 .stat-card,
      .admin-table tbody tr,
      .admin-table .badge,
      .sales-summary-grid .badge,
      .queue-order .badge,
      .stat-card .badge,
      .modal-overlay .modal { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

function animateSalesMetrics(el) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const duration = 800;
  $$('[data-sales-count]', el).forEach((metric) => {
    const target = Number(metric.dataset.salesCount);
    const format = metric.dataset.salesFormat;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = target * (1 - Math.pow(1 - progress, 3));
      metric.textContent = format === 'money' ? money(value) : String(Math.round(value));
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}

function renderBarAdmin(page, params) {
  const app = $('#app');
  if (!currentUser() || currentUser().role !== 'adminbar') return route('login');
  const requestedPage = { sales: 'sales-dashboard', config: 'config-status' }[page] || page;
  const sec = BAR_PAGES[requestedPage] ? requestedPage : 'dashboard';
  const activeSidebarSection = { 'sales-history': 'sales-dashboard', 'config-status': 'config-hours' }[sec] || sec;
  syncBodyClass();

  const queueCount = Store.orders.filter((o) => o.status === 'queue').length;
  const prepCount = Store.orders.filter((o) => o.status === 'prep').length;
  const readyCount = Store.orders.filter((o) => o.status === 'ready').length;

  app.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="sb-brand"><span style="font-size:1.3rem"><i class="bx bx-coffee-togo"></i></span> <span class="brand-name">Cafetería INTESUD</span></div>
        <nav class="sb-nav">
${Object.entries(BAR_SECTIONS).map(([k, v]) => `
            <a class="sb-link ${k === activeSidebarSection ? 'active' : ''}" href="#" data-bar="${k}">
              <span class="sb-ico bx ${v.icon}"></span><span class="sb-label">${v.label}</span>
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
          <span style="font-size:1.3rem"><i class="bx ${BAR_PAGES[sec].icon}"></i></span>
          <span class="page-name">${BAR_PAGES[sec].label}</span>
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
  if (localStorage.getItem('int_sidebar_collapsed') === 'true' && window.innerWidth > 900) sidebar?.classList.add('collapsed');
  const closeSidebar = () => { sidebar?.classList.remove('open'); $('.sb-scrim')?.remove(); };
  $('#barHamburger')?.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      sidebar?.classList.add('open');
      if (!$('.sb-scrim')) {
        const scrim = document.createElement('div');
        scrim.className = 'sb-scrim';
        scrim.addEventListener('click', closeSidebar);
        document.body.appendChild(scrim);
      }
    } else {
      sidebar?.classList.toggle('collapsed');
      localStorage.setItem('int_sidebar_collapsed', sidebar?.classList.contains('collapsed'));
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
    'stock-history': barStockHistory,
    payments: barPayments,
    'payment-detail': barPaymentDetail,
    'sales-dashboard': (target) => barSalesTabs(target, 'summary'),
    'sales-history': (target) => barSalesTabs(target, 'history'),
    delivery: barDelivery,
    'config-hours': (target) => barConfigTabs(target, 'hours'),
    'config-status': (target) => barConfigTabs(target, 'status'),
  };
  // Skeleton loading al cambiar de pantalla (200-300ms) para transición suave
  content.innerHTML = `<div style="padding:4px"><div class="skeleton" style="height:28px;width:160px;margin-bottom:18px"></div><div class="grid grid-4" style="margin-bottom:16px"><div class="skeleton" style="height:92px"></div><div class="skeleton" style="height:92px"></div><div class="skeleton" style="height:92px"></div><div class="skeleton" style="height:92px"></div></div><div class="skeleton" style="height:180px"></div></div>`;
  setTimeout(() => renderers[sec](content, params), 260);
}

function renderCafePill(el) {
  const cfg = Store.config;
  el.innerHTML = `<span class="badge ${cfg.cafeOpen ? 'badge-success' : 'badge-danger'}"><span class="ico">${cfg.cafeOpen ? '🟢' : '🔴'}</span> ${cfg.cafeOpen ? 'ABIERTA' : 'CERRADA'}</span>`;
}

function renderAdminTabs(el, tabs, initialTab) {
  let activeTab = initialTab;
  el.innerHTML = `
    <div class="adv-tabs">
      ${tabs.map((tab) => `<button class="category-chip${tab.id === activeTab ? ' active' : ''}" data-admin-tab="${tab.id}">${tab.label}</button>`).join('')}
    </div>
    <div id="adminTabContent"></div>`;

  const renderTab = () => {
    const tab = tabs.find((item) => item.id === activeTab);
    tab.render($('#adminTabContent', el));
  };
  $$('[data-admin-tab]', el).forEach((button) => button.onclick = () => {
    activeTab = button.dataset.adminTab;
    $$('[data-admin-tab]', el).forEach((item) => item.classList.toggle('active', item === button));
    renderTab();
  });
  renderTab();
}

function barSalesTabs(el, initialTab) {
  renderAdminTabs(el, [
    { id: 'summary', label: 'Resumen', render: barSalesDashboard },
    { id: 'history', label: 'Historial', render: barSalesHistory },
  ], initialTab);
}

function barConfigTabs(el, initialTab) {
  renderAdminTabs(el, [
    { id: 'hours', label: 'Horarios', render: barConfigHours },
    { id: 'status', label: 'Estado de cafetería', render: barConfigStatus },
  ], initialTab);
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
  const payPending = getPendingPayments(orders).length;
  const deliveries = orders.filter((o) => o.delivery === 'delivery' && ['queue', 'confirmed', 'prep', 'ready'].includes(o.status));
  const salesToday = todayOrders.filter(isValidSale).reduce((s, o) => s + o.total, 0);

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

    <div class="status-banners-wrap">
      ${outStock.length ? `<div class="status-banner danger"><span class="ico">⛔</span><div><b>Productos agotados:</b> ${outStock.map((p) => p.name).join(', ')}</div></div>` : ''}
      ${lowStock.length ? `<div class="status-banner warning"><span class="ico">⚠️</span><div><b>Stock bajo:</b> ${lowStock.map((p) => p.name).join(', ')}</div></div>` : ''}
    </div>

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
      <div class="stat-card"><div class="st-label">Por cobrar</div><div class="st-value warning">${payPending}</div><div class="st-sub"><a href="#" data-goto="adminbar/payments">Revisar</a></div></div>
      <div class="stat-card"><div class="st-label">Delivery activo</div><div class="st-value primary">${deliveries.length}</div><div class="st-sub"><a href="#" data-goto="adminbar/orders">Ver pedidos</a></div></div>
      <div class="stat-card success-card"><div class="st-label">Ventas del día</div><div class="st-value">${money(salesToday)}</div><div class="st-sub"><a href="#" data-goto="adminbar/sales-dashboard">Detalle</a></div></div>
      <div class="stat-card"><div class="st-label">Productos agotados</div><div class="st-value ${outStock.length ? 'danger' : ''}">${outStock.length}</div><div class="st-sub"><a href="#" data-goto="adminbar/stock">Ir a stock</a></div></div>
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

/* ============================================================
   PRODUCTOS
   ============================================================ */
function barProducts(el) {
  ensureAdminbarPresentationStyles();
  const products = Store.products;
  const cats = [...new Set(products.map((p) => p.category))];
  let cat = 'Todas';
  let searchTerm = '';

  const outOfStock = products.filter((p) => p.stock === 0 && p.available);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock && p.available);

  el.innerHTML = `
    <div class="page-title"><h1>Productos</h1><button class="btn btn-primary" id="addProduct">+ Nuevo producto</button></div>
    <div class="status-banners-wrap">
      ${outOfStock.length ? `<div class="status-banner danger"><span class="ico"><i class="bx bx-error-circle"></i></span><div><b>Productos agotados:</b> ${outOfStock.map((p) => p.name).join(', ')}</div></div>` : ''}
      ${lowStock.length ? `<div class="status-banner warning"><span class="ico"><i class="bx bx-error"></i></span><div><b>Stock bajo:</b> ${lowStock.map((p) => p.name).join(', ')}</div></div>` : ''}
    </div>
    <div class="field" style="margin-bottom:16px">
      <label class="label">Buscar</label>
      <div class="input-wrap">
        <span class="leading-ico"><i class="bx bx-search"></i></span>
        <input class="input" type="search" id="productSearch" placeholder="Nombre, categoría..." style="padding-left:38px">
      </div>
    </div>
    <div class="adv-tabs">
      <button class="category-chip active" data-cat="Todas">Todas</button>
      ${cats.map((c) => `<button class="category-chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Prep</th><th>Estado</th><th></th></tr></thead>
      <tbody id="prodRows"></tbody>
    </table></div>`;

  const renderRows = () => {
    let list = cat === 'Todas' ? products : products.filter((p) => p.category === cat);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    }
    const tbody = $('#prodRows', el);
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-search-alt"></i></div><div style="font-weight:600">No encontramos productos que coincidan</div><div class="tiny muted" style="margin-top:4px">Prueba con otro nombre o ajusta los filtros de categoría</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map((p) => `
      <tr>
        <td data-label="Producto"><div style="display:flex;align-items:center;gap:10px;min-width:0"><img style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="width:36px;height:36px;border-radius:8px;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;${p.image ? 'display:none' : ''}">${productIcon(p)}</div><div style="min-width:0;max-width:180px"><div class="bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.desc)}">${esc(p.desc)}</div></div></div></td>
        <td data-label="Categoría">${esc(p.category)}</td>
        <td class="bold tabular-nums" data-label="Precio">${money(p.price)}</td>
        <td data-label="Stock"><span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.minStock ? 'badge-warning' : 'badge-success'}">${p.stock} ${p.stock === 0 ? '· agotado' : p.stock <= p.minStock ? '· bajo' : ''}</span></td>
        <td data-label="Prep">${p.prepMin} min</td>
        <td data-label="Estado">${p.available ? '<span class="badge badge-success">Disponible</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td data-label="Acciones">
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn-outline btn-icon" title="Editar ${esc(p.name)}" aria-label="Editar ${esc(p.name)}" data-edit="${p.id}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0">
                <span class="ico bx bx-edit-alt" style="font-size:1.1rem;color:var(--primary)"></span>
              </button>
              <button class="btn btn-neutral btn-icon" title="${p.available ? 'Desactivar' : 'Activar'}" aria-label="${p.available ? 'Desactivar' : 'Activar'}" data-toggle="${p.id}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0">
                <span class="ico ${p.available ? 'bx bx-hide' : 'bx bx-show'}" style="font-size:1.1rem;color:${p.available ? 'var(--danger)' : 'var(--primary)'}"></span>
              </button>
            </div>
          </td>
      </tr>
    `).join('');
    $$('[data-edit]', tbody).forEach((b) => b.onclick = () => productFormModal(products.find((p) => p.id === b.dataset.edit)));
    $$('[data-toggle]', tbody).forEach((b) => b.onclick = () => {
      const p = products.find((x) => x.id === b.dataset.toggle);
      p.available = !p.available;
      Store.products = products;
      logAudit(p.available ? 'Activó producto' : 'Desactivó producto', p.name);
      toast(p.name + (p.available ? ' activado.' : ' desactivado.'), 'success');
      renderBarAdmin('products');
    });
  };

  $('#productSearch', el).addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderRows();
  });

  $$('[data-cat]', el).forEach((t) => t.onclick = () => {
    $$('[data-cat]', el).forEach((x) => x.classList.remove('active'));
    t.classList.add('active'); cat = t.dataset.cat; renderRows();
  });

  $('#addProduct', el).onclick = () => productFormModal(null);
  renderRows();
}

function productFormModal(p) {
  const isEdit = !!p;
  const cats = CATEGORIES;
  const originalValues = isEdit ? {
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    prepMin: p.prepMin,
    minStock: p.minStock,
    desc: p.desc,
    available: p.available,
    allowExtras: p.allowExtras || false,
    image: p.image || ''
  } : null;
  let hasUnsavedChanges = false;
  
  const ov = modal(`
    <h3>${isEdit ? 'Editar' : 'Nuevo'} producto</h3>
    <div style="margin:16px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Información básica</div></div>
    <div class="field"><label class="label">Nombre</label><input class="input" id="pfName" value="${isEdit ? esc(p.name) : ''}"><div class="input-err-msg" id="pfNameErr"></div></div>
    <div class="field"><label class="label">Categoría</label><select class="input" id="pfCat">${cats.map((c) => `<option ${isEdit && p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label class="label">Descripción</label><textarea class="input" id="pfDesc" rows="3">${isEdit ? esc(p.desc) : ''}</textarea></div>
    <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Precio y tiempo</div></div>
    <div class="grid grid-2">
      <div class="field"><label class="label">Precio ($)</label><input class="input" type="number" step="0.05" id="pfPrice" value="${isEdit ? p.price : ''}"><div class="input-err-msg" id="pfPriceErr"></div></div>
      <div class="field"><label class="label">Stock</label><input class="input" type="number" id="pfStock" value="${isEdit ? p.stock : ''}"><div class="input-err-msg" id="pfStockErr"></div></div>
    </div>
    <div class="grid grid-2">
      <div class="field"><label class="label">Tiempo prep (min)</label><input class="input" type="number" id="pfPrep" value="${isEdit ? p.prepMin : ''}"><div class="input-err-msg" id="pfPrepErr"></div></div>
      <div class="field"><label class="label">Stock mínimo</label><input class="input" type="number" id="pfMin" value="${isEdit ? p.minStock : ''}"><div class="input-err-msg" id="pfMinErr"></div></div>
    </div>
    <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Disponibilidad</div></div>
    <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
      <label class="checkbox-row"><input type="checkbox" id="pfExtras" ${isEdit && p.allowExtras ? 'checked' : ''}> <b>Permitir adicionales/observaciones</b></label>
      <div class="tiny muted" style="margin-left:26px;margin-top:4px">El cliente podrá agregar notas o extras al producto.</div>
    </div>
    ${isEdit ? `
    <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
      <label class="checkbox-row"><input type="checkbox" id="pfActive" ${p.available ? 'checked' : ''}> <b>Producto activo</b></label>
      <div class="tiny muted" style="margin-left:26px;margin-top:4px">Desactiva para ocultar del menú sin eliminarlo.</div>
    </div>
    ` : ''}
    <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Imagen</div></div>
    <div class="field"><label class="label">Imagen del producto</label>
      <div id="pfDropZone" style="border:2px dashed var(--border-strong);border-radius:var(--r-lg);padding:28px 20px;text-align:center;cursor:pointer;background:var(--surface-2);transition:all var(--t-fast);position:relative">
        <div id="pfDropPlaceholder" style="${p?.image ? 'display:none' : ''}">
          <div style="font-size:2.4rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-cloud-upload"></i></div>
          <div style="font-weight:600;color:var(--text-2)">Arrastra una imagen o haz clic para seleccionar</div>
          <div class="tiny muted" style="margin-top:4px">PNG, JPG — se guarda en base64 local</div>
        </div>
        <img id="pfImagePreview" src="${p?.image || ''}" style="max-width:200px;max-height:200px;border-radius:10px;margin:0 auto;${p?.image ? 'display:block' : 'display:none'};object-fit:cover;box-shadow:var(--shadow-sm)" onload="if(this.getAttribute('src')) this.style.display='block'">
        <button type="button" id="pfRemoveImage" title="Quitar imagen" aria-label="Quitar imagen" style="position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:var(--surface);border:1px solid var(--border-strong);${p?.image ? 'display:flex' : 'display:none'};align-items:center;justify-content:center;color:var(--text-2);box-shadow:var(--shadow-sm)"><i class="bx bx-x" style="font-size:1.1rem"></i></button>
      </div>
      <input class="input" type="file" id="pfImage" accept="image/*" style="display:none">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding-top:18px;border-top:1px solid var(--border)">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn btn-primary" id="btnSaveProduct" ${isEdit && !hasUnsavedChanges ? 'disabled style="opacity:0.6"' : ''}>${isEdit ? 'Guardar cambios' : 'Crear producto'}</button>
    </div>`, { wide: true });

  const btnSave = $('#btnSaveProduct', ov);
  const fields = ['pfName', 'pfCat', 'pfPrice', 'pfStock', 'pfPrep', 'pfMin', 'pfDesc', 'pfExtras'];
  if (isEdit) fields.push('pfActive');
  
  const checkChanges = () => {
    if (!isEdit || !originalValues) return;
    const currentValues = {
      name: $('#pfName', ov).value.trim(),
      category: $('#pfCat', ov).value,
      price: parseFloat($('#pfPrice', ov).value),
      stock: parseInt($('#pfStock', ov).value),
      prepMin: parseInt($('#pfPrep', ov).value),
      minStock: parseInt($('#pfMin', ov).value),
      desc: $('#pfDesc', ov).value,
      available: $('#pfActive', ov)?.checked ?? true,
      allowExtras: $('#pfExtras', ov).checked
    };
    hasUnsavedChanges = Object.keys(originalValues).some(key => {
      if (key === 'price') return currentValues[key] !== originalValues[key];
      if (key === 'stock' || key === 'prepMin' || key === 'minStock') return currentValues[key] !== originalValues[key];
      return currentValues[key] !== originalValues[key];
    });
    btnSave.disabled = !hasUnsavedChanges;
    btnSave.style.opacity = hasUnsavedChanges ? '1' : '0.6';
  };
  
fields.forEach(id => {
    const field = $('#' + id, ov);
    if (field) {
      field.addEventListener('input', checkChanges);
      field.addEventListener('change', checkChanges);
    }
  });

  const pfImage = $('#pfImage', ov);
  const pfImagePreview = $('#pfImagePreview', ov);
  const pfDropZone = $('#pfDropZone', ov);
  const pfDropPlaceholder = $('#pfDropPlaceholder', ov);
  const pfRemoveImage = $('#pfRemoveImage', ov);
  const showPreview = (src) => {
    pfImagePreview.src = src;
    pfImagePreview.style.display = 'block';
    if (pfDropPlaceholder) pfDropPlaceholder.style.display = 'none';
    if (pfRemoveImage) pfRemoveImage.style.display = 'flex';
    if (pfDropZone) { pfDropZone.style.borderColor = 'var(--border-strong)'; pfDropZone.style.background = 'var(--surface-2)'; }
  };
  const clearPreview = () => {
    pfImage.value = '';
    pfImagePreview.src = '';
    pfImagePreview.style.display = 'none';
    if (pfDropPlaceholder) pfDropPlaceholder.style.display = '';
    if (pfRemoveImage) pfRemoveImage.style.display = 'none';
  };
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => showPreview(e.target.result);
    reader.readAsDataURL(file);
  };
  if (pfImage && pfImagePreview && pfDropZone) {
    pfImage.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
    pfDropZone.addEventListener('click', (e) => { if (e.target.closest('#pfRemoveImage')) return; pfImage.click(); });
    pfDropZone.addEventListener('dragover', (e) => { e.preventDefault(); pfDropZone.style.borderColor = 'var(--primary)'; pfDropZone.style.background = 'var(--primary-soft)'; });
    pfDropZone.addEventListener('dragleave', () => { pfDropZone.style.borderColor = 'var(--border-strong)'; pfDropZone.style.background = 'var(--surface-2)'; });
    pfDropZone.addEventListener('drop', (e) => { e.preventDefault(); pfDropZone.style.borderColor = 'var(--border-strong)'; pfDropZone.style.background = 'var(--surface-2)'; handleFile(e.dataTransfer.files?.[0]); });
    if (pfRemoveImage) pfRemoveImage.addEventListener('click', (e) => { e.stopPropagation(); clearPreview(); });
    if (pfImagePreview.getAttribute('src')) { showPreview(pfImagePreview.getAttribute('src')); }
  }

  $('[data-cancel]', ov).onclick = () => ov.remove();
  btnSave.onclick = () => {
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
    
    const originalText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2.5px;margin-right:8px"></span>Guardando...';
    
    setTimeout(() => {
      const products = Store.products;
      const allowExtras = $('#pfExtras', ov).checked;
      const available = isEdit ? ($('#pfActive', ov)?.checked ?? true) : (stock > 0);
      if (isEdit) {
        Object.assign(p, { name, category: $('#pfCat', ov).value, price, stock, prepMin: prep, minStock: mn, desc: $('#pfDesc', ov).value, available, allowExtras, image: pfImagePreview.src });
        logAudit('Editó producto', name);
        toast('Producto actualizado.', 'success');
      } else {
        products.push({ id: 'p' + Date.now(), name, category: $('#pfCat', ov).value, price, stock, minStock: mn, prepMin: prep, available, desc: $('#pfDesc', ov).value, emoji: '', image: pfImagePreview.src || '', allowExtras });
        logAudit('Creó producto', name);
        toast('Producto creado.', 'success');
      }
      Store.products = products;
      
      btnSave.innerHTML = '<i class="bx bx-check" style="margin-right:6px"></i>' + (isEdit ? 'Guardado' : 'Creado');
      btnSave.classList.add('btn-success');
      btnSave.classList.remove('btn-primary');
      
      setTimeout(() => {
        ov.remove();
        renderBarAdmin('products');
      }, 600);
    }, 500);
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
  ensureAdminbarPresentationStyles();
  const products = Store.products;
  const history = Store.stockHistory;

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);

  el.innerHTML = `
    <div class="page-title"><h1>Stock</h1><span class="badge badge-primary">${outOfStock.length} agotados</span></div>
    <div class="status-banners-wrap">
      ${outOfStock.length ? `<div class="status-banner danger"><span class="ico"><i class="bx bx-error-circle"></i></span><div><b>Productos agotados:</b> ${outOfStock.map((p) => p.name).join(', ')}</div></div>` : ''}
      ${lowStock.length ? `<div class="status-banner warning"><span class="ico"><i class="bx bx-error"></i></span><div><b>Stock bajo:</b> ${lowStock.map((p) => p.name).join(', ')}</div></div>` : ''}
    </div>
    <div class="grid grid-3" style="margin-bottom:20px">
      <div class="stat-card success-card"><div class="st-label">Disponibles</div><div class="st-value">${products.filter((p) => p.stock > p.minStock).length}</div></div>
      <div class="stat-card warning-card"><div class="st-label">Stock bajo</div><div class="st-value warning">${lowStock.length}</div></div>
      <div class="stat-card danger-card"><div class="st-label">Agotados</div><div class="st-value danger">${outOfStock.length}</div></div>
    </div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th><th>Última actualización</th><th></th></tr></thead>
      <tbody id="stockRows"></tbody>
    </table></div>
    <div style="margin-top:24px">
      <h3 class="section-title">Historial de cambios</h3>
      <div class="card" id="stockHist"></div>
    </div>`;

  const renderRows = () => {
    const tbody = $('#stockRows', el);
    tbody.innerHTML = products.map((p) => {
      const h = history.find((x) => x.productId === p.id);
      const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
      const fillCls = p.stock === 0 ? 'background:var(--danger)' : p.stock <= p.minStock ? 'background:var(--warning)' : 'background:var(--success)';
      return `<tr>
        <td data-label="Producto"><div class="bold" style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div></td>
        <td data-label="Stock actual"><div class="stock-line"><b class="tabular-nums">${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td>
        <td data-label="Stock mínimo" class="tabular-nums">${p.minStock}</td>
        <td data-label="Estado">${stockBadge(p)}</td>
        <td data-label="Última actualización">${h ? `${h.time} ${h.date}` : '—'}</td>
        <td data-label="Acciones">
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn-success btn-icon" title="Aumentar stock" aria-label="Aumentar stock" data-inc="${p.id}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0;background:var(--success);border-color:var(--success)">
                <span class="ico bx bx-plus" style="font-size:18px;color:#fff;line-height:1"></span>
              </button>
              <button class="btn btn-neutral btn-icon" title="Disminuir stock" aria-label="Disminuir stock" data-dec="${p.id}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0">
                <span class="ico bx bx-minus" style="font-size:18px;color:var(--danger);line-height:1"></span>
              </button>
            </div>
          </td>
        </td>
      </tr>`;
    }).join('');
    $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
    $$('[data-dec]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });
  };

  const histWrap = $('#stockHist');
  if (!history.length) histWrap.innerHTML = emptyState('<i class="bx bx-history"></i>', 'Aún no hay movimientos', 'Cuando ajustes el stock, verás aquí el historial con cariño.');

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

  // Skeleton + render
  const tbody = $('#stockRows', el);
  tbody.innerHTML = Array.from({ length: 5 }, () => `
    <tr>
      <td><div class="skeleton" style="width:120px;height:16px"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
      <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
      <td><div class="skeleton" style="width:90px;height:14px"></div></td>
      <td><div class="skeleton" style="width:60px;height:28px;border-radius:var(--r-sm)"></div></td>
    </tr>
  `).join('');
  setTimeout(renderRows, 350);

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
   HISTORIAL DE STOCK
   ============================================================ */
function barStockHistory(el) {
  ensureAdminbarPresentationStyles();
  const history = Store.stockHistory;
  const products = Store.products;

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-history"></span> Historial de stock</h1></div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Fecha/hora</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock resultante</th></tr></thead>
      <tbody id="stockHistoryRows"></tbody></table></div>
  `;

  const renderRows = () => {
    const tbody = $('#stockHistoryRows', el);
    if (!history.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-history"></i></div><div style="font-weight:600">Aún no hay movimientos de stock</div><div class="tiny muted" style="margin-top:4px">Los ajustes de stock aparecerán aquí</div></td></tr>';
      return;
    }
    
    // Group by date
    const byDate = history.reduce((acc, h) => {
      const date = h.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(h);
      return acc;
    }, {});
    
    tbody.innerHTML = Object.entries(byDate).map(([date, entries]) => `
      <tr class="stock-history-date-header">
        <td colspan="5" style="background:var(--surface-2); font-weight:var(--fw-semibold); padding:8px 16px; border-bottom:1px solid var(--border);">
          ${date}
        </td>
      </tr>
      ${entries.map((h) => {
        const type = h.delta > 0 ? 'entrada' : 'salida';
        const typeBadge = h.delta > 0 ? 'badge-success' : 'badge-danger';
        const typeIcon = h.delta > 0 ? '⬆️' : '⬇️';
        const deltaClass = h.delta > 0 ? 'stock-delta-positive' : 'stock-delta-negative';
        return `
          <tr>
            <td data-label="Fecha/hora" class="small" style="text-align:right; white-space:nowrap;">${h.time}</td>
            <td data-label="Producto">${esc(h.name)}</td>
            <td data-label="Tipo"><span class="badge ${typeBadge}">${typeIcon} ${type}</span></td>
            <td data-label="Cantidad" class="bold tabular-nums ${deltaClass}">${h.delta > 0 ? '+' : ''}${h.delta}</td>
            <td data-label="Stock resultante" class="tabular-nums">${h.newVal}</td>
          </tr>
        `;
      }).join('')}
    `).join('');
  };

  // Skeleton + render
  const tbody = $('#stockHistoryRows', el);
  tbody.innerHTML = Array.from({ length: 5 }, () => `
    <tr>
      <td><div class="skeleton" style="width:90px;height:14px"></div></td>
      <td><div class="skeleton" style="width:120px;height:16px"></div></td>
      <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
    </tr>
  `).join('');
  setTimeout(renderRows, 350);
}

/* ============================================================
   PAGOS
   ============================================================ */
function barPayments(el) {
  const orders = Store.orders;
  const review = orders.filter((o) => o.paymentStatus === 'review');
  const filters = [
    ['all', 'Todos'], ['pending', 'Pendientes'], ['review', 'En revisión'],
    ['approved', 'Aprobados'], ['paid', 'Pagados'], ['rejected', 'Rechazados'], ['refunded', 'Reembolsados'],
  ];
  let selectedFilter = 'all';

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-credit-card"></span> Pagos</h1></div>
    ${review.length ? `<div class="status-banner info"><span class="ico"><i class="bx bx-info-circle"></i></span><div><b>${review.length} pago(s) en revisión.</b> Revisa los comprobantes de transferencia.</div></div>` : ''}
    <div class="adv-tabs">
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
          <td class="bold" data-label="Pedido">#${o.id}</td>
          <td data-label="Usuario">${esc(o.userName)}</td>
          <td data-label="Método"><span class="badge badge-primary">${paymentMethodLabel(o.payment)}</span></td>
          <td class="bold tabular-nums" data-label="Total">${money(o.total)}</td>
          <td data-label="Estado"><span class="badge ${badgeCls}">${sInfo ? sInfo.label : 'Pendiente'}</span></td>
          <td class="small muted" data-label="Fecha">${o.date} ${o.time || '—'}</td>
          <td data-label="Acciones">
            ${o.paymentStatus === 'review' ? `<button class="btn btn-success btn-sm" data-ap="${o.id}">Aprobar</button> <button class="btn btn-danger-outline btn-sm" data-rj="${o.id}">Rechazar</button>` : ''}
            ${o.paymentStatus === 'pending' && o.payment === 'deuna' ? `<button class="btn btn-success btn-sm" data-ap="${o.id}">Aprobar</button>` : ''}
            ${['transferencia', 'deuna'].includes(o.payment) ? `<button class="btn btn-outline btn-sm" data-voucher="${o.id}">Ver comprobante</button>` : ''}
            ${o.paymentStatus === 'refunded' ? '<span class="badge badge-info">Reembolso aplicado</span>' : ''}
          </td>
        </tr>
        `;
      }).join('') : `<tr><td colspan="7" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx ${selectedFilter==='pending' ? 'bx-happy-heart-eyes' : 'bx-search-alt'}"></i></div><div style="font-weight:600">${selectedFilter==='pending' ? '¡Todo al día! No hay pagos pendientes' : 'No encontramos pagos en este estado'}</div><div class="tiny muted" style="margin-top:4px">${selectedFilter==='pending' ? 'Respira tranquilo, por ahora no debes cobrar nada' : 'Prueba con otro filtro'}</div></td></tr>`;
    $$('[data-voucher]', el).forEach((b) => b.onclick = () => showVoucherModal(b.dataset.voucher));
    $$('[data-ap]', el).forEach((b) => b.onclick = () => setPay(b.dataset.ap, 'approved'));
    $$('[data-rj]', el).forEach((b) => b.onclick = () => setPay(b.dataset.rj, 'rejected'));
    
    // Trigger highlight animation for visited row
    if (lastVisitedPaymentId) {
      const visitedRow = $('#paymentRows', el).querySelector('.visited-row');
      if (visitedRow) {
        visitedRow.classList.add('highlight');
        setTimeout(() => visitedRow.classList.remove('highlight'), 1500);
      }
    }
  };

  // Show skeleton first, then real data
  renderSkeletonRows();
  setTimeout(renderRows, 350);

  $$('[data-payment-filter]', el).forEach((button) => button.onclick = () => {
    selectedFilter = button.dataset.paymentFilter;
    $$('[data-payment-filter]', el).forEach((item) => item.classList.toggle('active', item === button));
    renderSkeletonRows();
    setTimeout(renderRows, 350);
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
  
  // Attach close handler to footer button (modal() only binds the header × button)
  $('#voucherCloseBtn', overlay).onclick = () => overlay.remove();
  
  // Handle Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Clean up on close
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

/* ============================================================
   DASHBOARD DE VENTAS
   ============================================================ */
function barSalesDashboard(el) {
  ensureAdminbarPresentationStyles();
  const orders = Store.orders;
  const today = new Date().toISOString().slice(0, 10);
  const validSales = orders.filter(isValidSale);
  const todayOrders = validSales.filter((o) => o.date === today);
  const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const countToday = todayOrders.length;
  const currentMonth = today.slice(0, 7);
  const salesMonth = validSales.filter((o) => o.date.startsWith(currentMonth)).reduce((s, o) => s + o.total, 0);

const prodSales = {};
  validSales.forEach((o) => o.items.forEach((i) => { prodSales[i.productId] = (prodSales[i.productId] || 0) + i.qty; }));
  const topProducts = Object.entries(prodSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, qty]) => ({ product: Store.products.find((p) => p.id === id), qty }))
    .filter((p) => p.product);

const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const total = validSales.filter((o) => o.date === date).reduce((sum, o) => sum + o.total, 0);
    days.push({ label: d.toLocaleDateString('es-EC', { weekday: 'short' }), total });
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  // Month-over-month comparison
  const currentMonthStart = new Date(today.slice(0, 7) + '-01');
  const prevMonthEnd = new Date(currentMonthStart);
  prevMonthEnd.setDate(0);
  const prevMonthStr = prevMonthEnd.toISOString().slice(0, 7);
  const salesPrevMonth = validSales.filter((o) => o.date.startsWith(prevMonthStr)).reduce((s, o) => s + o.total, 0);
  const momChange = salesPrevMonth > 0 ? ((salesMonth - salesPrevMonth) / salesPrevMonth) * 100 : (salesMonth > 0 ? 100 : 0);
  const momPositive = momChange >= 0;
  const momAbsChange = Math.abs(momChange);

  // Micro-mensaje contextual dinámico (solo si hay datos suficientes, nunca muestra undefined)
  let microMsg = '';
  if (validSales.length >= 3 && days.length === 7) {
    const avgWeek = days.reduce((s, d) => s + d.total, 0) / 7;
    const bestDay = [...days].sort((a, b) => b.total - a.total)[0];
    if (avgWeek > 0 && salesToday > avgWeek * 1.1) {
      microMsg = `Hoy vas mejor que el promedio de la semana ✨`;
    } else if (bestDay && bestDay.total > 0 && bestDay.total > avgWeek * 1.2) {
      microMsg = `Tu día más fuerte esta semana fue ${esc(bestDay.label)} con ${money(bestDay.total)}`;
    } else if (avgWeek > 0 && salesToday > 0) {
      microMsg = `Promedio semanal: ${money(avgWeek)} — hoy llevas ${money(salesToday)}`;
    }
  }

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-line-chart"></span> Ventas</h1></div>
    ${microMsg ? `<div class="status-banner info"><span class="ico"><i class="bx bx-trending-up"></i></span><div>${microMsg}</div></div>` : ''}
<div class="grid grid-4 sales-summary-grid" style="margin-bottom:24px">
      <div class="stat-card success-card sales-summary-card"><div class="st-label">Ventas del día</div><div class="st-value" data-sales-count="${salesToday}" data-sales-format="money">${money(0)}</div></div>
      <div class="stat-card sales-summary-card"><div class="st-label">Ticket promedio</div><div class="st-value" ${countToday > 0 ? `data-sales-count="${salesToday / countToday}" data-sales-format="money"` : ''}>${countToday > 0 ? money(0) : '—'}</div></div>
      <div class="stat-card sales-summary-card"><div class="st-label">Número de ventas</div><div class="st-value primary" data-sales-count="${countToday}" data-sales-format="number">0</div></div>
      <div class="stat-card sales-summary-card"><div class="st-label">Total del mes</div><div class="st-value" data-sales-count="${salesMonth}" data-sales-format="money">${money(0)}</div></div>
    </div>

<div class="grid grid-2" style="margin-bottom:24px;align-items:stretch">
      <div class="card mom-performance-card" style="display:flex;flex-direction:column;min-height:360px"><h3 style="margin-bottom:16px">Rendimiento del mes</h3><div id="momDonutChart" class="mom-donut-chart" style="flex:1;display:flex;align-items:center;justify-content:center"></div></div>

  <div class="card" style="display:flex;flex-direction:column;min-height:360px">
    <h3 style="margin-bottom:16px">Ventas por día (últimos 7 días)</h3>
    <div id="salesLineChart" class="sales-line-chart" style="flex:1;display:flex;align-items:center;justify-content:center"></div>
  </div>
</div>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:16px">Productos más vendidos</h3>
      ${topProducts.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
          ${topProducts.map(({ product, qty }) => `
            <div class="stat-card" style="padding:16px;text-align:center">
              <div style="font-size:2.5rem;margin-bottom:8px">${product.emoji || productIcon(product)}</div>
              <div class="bold" style="font-size:var(--fs-sm);margin-bottom:4px">${esc(product.name)}</div>
              <div class="stat-value primary tabular-nums" style="font-size:1.5rem">${qty}</div>
              <div class="tiny muted">unidades</div>
            </div>
          `).join('')}
        </div>` : `<div style="text-align:center;padding:24px 12px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-bar-chart-alt-2"></i></div><div style="font-weight:600">Aún no hay ventas registradas</div><div class="tiny muted" style="margin-top:4px">Cuando haya movimiento, verás aquí tus productos estrella</div></div>`}
    </div>
  `;
animateSalesMetrics(el);
  renderSalesLineChart(el, days);
  renderMomDonutChart(el, momChange, momAbsChange, momPositive, salesMonth, salesPrevMonth);
}

function renderSalesLineChart(el, days) {
  const container = $('#salesLineChart', el);
  if (!container) return;
  const totals = days.map((d) => d.total);
  const maxVal = Math.max(...totals, 1);
  const minVal = Math.min(...totals, 0);
  const range = maxVal - minVal || 1;
  const padding = { top: 24, right: 16, bottom: 36, left: 56 };
  const width = container.clientWidth || 600;
  const height = 220;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (i) => padding.left + (i / (days.length - 1)) * innerW;
  const y = (val) => padding.top + innerH * (1 - (val - minVal) / range);

  const points = days.map((d, i) => `${x(i)},${y(d.total)}`).join(' ');
  const areaPoints = `${padding.left},${padding.top + innerH} ${points} ${padding.left + innerW},${padding.top + innerH}`;

  const pathLen = 1000;

  container.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sales-chart-svg" role="img" aria-label="Gráfico de ventas de los últimos 7 días">
      <defs>
        <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#40807E" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#40807E" stop-opacity="0.02"/>
        </linearGradient>
        <linearGradient id="salesLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#40807E"/>
          <stop offset="100%" stop-color="#2f605e"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      <g class="chart-grid" stroke="var(--border)" stroke-width="0.5">
        ${[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = padding.top + innerH * f;
          const gv = maxVal - range * f;
          return `<line x1="${padding.left}" y1="${gy}" x2="${padding.left + innerW}" y2="${gy}"/><text x="${padding.left - 8}" y="${gy + 4}" text-anchor="end" font-size="10" fill="var(--text-3)">${money(gv)}</text>`;
        }).join('')}
      </g>
      <!-- Area -->
      <polygon class="sales-area" points="${areaPoints}" fill="url(#salesAreaGrad)"/>
      <!-- Line -->
      <polyline class="sales-line" points="${points}" fill="none" stroke="url(#salesLineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:${pathLen}; stroke-dashoffset:${pathLen};"/>
      <!-- Points -->
      <g class="sales-points">
        ${days.map((d, i) => `
          <g class="sales-point-group" data-index="${i}" style="cursor:pointer">
            <circle class="sales-point" cx="${x(i)}" cy="${y(d.total)}" r="5" fill="var(--surface)" stroke="#40807E" stroke-width="2.5"/>
            <title>${d.label}: ${money(d.total)}</title>
            <text class="sales-tooltip" x="${x(i)}" y="${y(d.total) - 18}" text-anchor="middle" font-size="11" fill="var(--text)" opacity="0" pointer-events="none" style="white-space:nowrap">${money(d.total)}</text>
          </g>
        `).join('')}
      </g>
      <!-- X-axis labels -->
      <g class="chart-x-labels" font-size="11" fill="var(--text-3)" text-anchor="middle">
        ${days.map((d, i) => `<text x="${x(i)}" y="${height - 6}">${d.label}</text>`).join('')}
      </g>
    </svg>`;

  requestAnimationFrame(() => {
    const line = container.querySelector('.sales-line');
    if (line) {
      line.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
      line.style.strokeDashoffset = '0';
    }
  });

  container.querySelectorAll('.sales-point-group').forEach((g) => {
    g.addEventListener('mouseenter', () => {
      const tooltip = g.querySelector('.sales-tooltip');
      const point = g.querySelector('.sales-point');
      if (tooltip) tooltip.style.opacity = '1';
      if (point) point.setAttribute('r', '7');
    });
    g.addEventListener('mouseleave', () => {
      const tooltip = g.querySelector('.sales-tooltip');
      const point = g.querySelector('.sales-point');
      if (tooltip) tooltip.style.opacity = '0';
      if (point) point.setAttribute('r', '5');
    });
  });
}
 
function renderMomDonutChart(el, momChange, momAbsChange, momPositive, salesMonth, salesPrevMonth) {
  const container = $('#momDonutChart', el);
  if (!container) return;
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(momAbsChange, 200) / 200;
  const dashOffset = circumference * (1 - progress);
  const color = momPositive ? '#22a06b' : '#e09a16';
  const arrowColor = momPositive ? 'var(--success)' : 'var(--warning)';
  const sign = momPositive ? '+' : '';
  const prevMonthLabel = salesPrevMonth > 0 ? money(salesPrevMonth) : '—';

  container.innerHTML = `
    <div class="mom-donut-wrap" style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="mom-donut-svg" role="img" aria-label="Rendimiento del mes">
        <defs>
          <linearGradient id="momGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${momPositive ? '#178a5a' : '#c07d08'}"/>
          </linearGradient>
        </defs>
        <!-- Background track -->
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="var(--surface-3)" stroke-width="${strokeWidth}"/>
        <!-- Progress ring -->
        <circle class="mom-ring" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="url(#momGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})" style="stroke-dasharray:${circumference}; stroke-dashoffset:${circumference};"/>
      </svg>
      <div class="mom-donut-center" style="text-align:center">
        <div style="font-size:2.2rem;font-weight:var(--fw-extrabold);color:${arrowColor};line-height:1.1"><span style="font-size:1.6rem">${sign}${momAbsChange.toFixed(1)}%</span></div>
        <div class="tiny muted" style="margin-top:4px">Rendimiento del mes</div>
        <div class="tiny muted" style="margin-top:2px">${money(salesMonth)} este mes</div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const ring = container.querySelector('.mom-ring');
    if (ring) {
      ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)';
      ring.style.strokeDashoffset = String(dashOffset);
    }
  });
}

/* ============================================================
   HISTORIAL DE VENTAS
   ============================================================ */
function barSalesHistory(el) {
  const orders = Store.orders;
  const tbody = $('#salesHistoryRows');
  if (!tbody) {
    el.innerHTML = `
      <div class="page-title"><h1><span class="ico bx bx-history"></span> Historial de ventas</h1></div>
      <div class="table-wrap"><table class="admin-table">
        <thead><tr><th>Fecha/hora</th><th>Número pedido</th><th>Monto</th><th>Método pago</th><th>Estado</th></tr></thead>
        <tbody id="salesHistoryRows"></tbody></table></div>
    `;
  } else {
    tbody.innerHTML = '';
  }

  const renderSkeletonRows = (count = 5) => {
    const tbodyEl = $('#salesHistoryRows', el);
    if (tbodyEl) {
      tbodyEl.innerHTML = Array.from({ length: count }, () => `
        <tr>
          <td><div class="skeleton" style="width:90px;height:14px"></div></td>
          <td><div class="skeleton" style="width:60px;height:16px"></div></td>
          <td><div class="skeleton" style="width:70px;height:16px"></div></td>
          <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
          <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
        </tr>
      `).join('');
    }
  };

  const renderRows = () => {
    const tbodyEl = $('#salesHistoryRows', el);
    if (!tbodyEl) return;
    const validSales = orders.filter(isValidSale).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    tbodyEl.innerHTML = validSales.length ? validSales.map((o) => `
      <tr><td class="small" data-label="Fecha/hora">${o.date} ${o.time || '—'}</td><td class="bold" data-label="Pedido">#${o.id}</td><td class="bold tabular-nums" data-label="Monto">${money(o.total)}</td><td data-label="Método pago">${paymentMethodLabel(o.payment)}</td><td data-label="Estado">${statusMeta(o.status)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-history"></i></div><div style="font-weight:600">Aún no hay historial de ventas</div><div class="tiny muted" style="margin-top:4px">Tus ventas aparecerán aquí con mucho corazón</div></td></tr>';
  };

  renderSkeletonRows();
  setTimeout(renderRows, 350);
}
 
function barDelivery(el) {
  ensureAdminbarPresentationStyles();
  const cfg = Store.config;
  const week = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const floors = ['Piso 1', 'Piso 2', 'Piso 3'];
  
  // Initialize delivery floors in config if not present
  if (!cfg.deliveryFloors) cfg.deliveryFloors = floors;

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-cycling"></span> Delivery</h1></div>
    <div class="card" style="width:100%;max-width:none;margin:0">
      <div style="margin:0 0 18px;padding-bottom:8px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Servicio</div></div>
      <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px">
        <label class="checkbox-row">
          <input type="checkbox" id="dlEnabled" ${cfg.deliveryEnabled ? 'checked' : ''}>
          <b>Habilitar delivery interno</b>
        </label>
        <div class="tiny muted" style="margin-left:26px;margin-top:4px">Cobertura exclusiva dentro del edificio INTESUD.</div>
      </div>
      <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Cobertura</div></div>
      <div class="field" id="dlDaysField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
        <label class="label">Días de entrega</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlDays">
          ${week.map((d) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-day="${d}" ${cfg.deliveryDays.includes(d) ? 'checked' : ''} style="margin-right:4px">${d}</label>`).join('')}
        </div>
      </div>
      <div class="field" id="dlFloorsField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
        <label class="label">Pisos habilitados</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlFloors">
          ${floors.map((f) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-floor="${f}" ${cfg.deliveryFloors.includes(f) ? 'checked' : ''} style="margin-right:4px">${f}</label>`).join('')}
        </div>
      </div>
      <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Horario y capacidad</div></div>
      <div class="grid grid-2" id="dlTimeFields" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
        <div class="field"><label class="label">Hora inicio</label><input class="input" type="time" id="dlStart" value="${cfg.orderOpen}" style="max-width: 200px"></div>
        <div class="field"><label class="label">Hora fin</label><input class="input" type="time" id="dlEnd" value="${cfg.orderClose}" style="max-width: 200px"></div>
      </div>
      <div class="field" id="dlMaxField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
        <label class="label">Capacidad máxima simultánea</label>
        <input class="input" type="number" id="dlMax" value="${cfg.deliveryMax}" style="max-width: 150px"><div class="tiny muted" style="margin-top:6px">Pedidos de delivery que pueden atenderse simultáneamente.</div>
      </div>
      <div style="margin-top:24px;padding-top:18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
        <button class="btn btn-primary" id="dlSave">Guardar configuración</button>
      </div>
    </div>`;

  const fieldsToToggle = ['dlDaysField', 'dlFloorsField', 'dlTimeFields', 'dlMaxField'];
  
  $('#dlEnabled', el).onchange = () => {
    cfg.deliveryEnabled = $('#dlEnabled', el).checked;
    fieldsToToggle.forEach(id => {
      const field = $('#' + id, el);
      if (field) {
        field.style.opacity = cfg.deliveryEnabled ? '' : '.5';
        field.style.pointerEvents = cfg.deliveryEnabled ? '' : 'none';
      }
    });
  };

  $('#dlSave', el).onclick = () => {
    cfg.orderOpen = $('#dlStart', el).value || cfg.orderOpen;
    cfg.orderClose = $('#dlEnd', el).value || cfg.orderClose;
    cfg.deliveryMax = parseInt($('#dlMax', el).value) || cfg.deliveryMax;
    cfg.deliveryDays = week.filter((d) => $(`[data-day="${d}"]`, el)?.checked);
    cfg.deliveryFloors = floors.filter((f) => $(`[data-floor="${f}"]`, el)?.checked);
    const enabled = $('#dlEnabled', el).checked;
    cfg.deliveryEnabled = enabled;
    Store.config = cfg;
    logAudit('Actualizó configuración de delivery', enabled ? 'Delivery habilitado' : 'Delivery deshabilitado');
    toast('Configuración de delivery guardada.', 'success');
    renderBarAdmin('delivery');
  };
}

/* ============================================================
   CONFIGURACIÓN - HORARIOS
   ============================================================ */
function barConfigHours(el) {
  const cfg = Store.config;
  // Store original values to detect changes
  const originalValues = {
    orderOpen: cfg.orderOpen,
    orderClose: cfg.orderClose,
    breakStart: cfg.breakStart,
    breakEnd: cfg.breakEnd,
    capacity: String(cfg.capacity)
  };
  let hasUnsavedChanges = false;
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.id = 'btnSaveConfigHours';
  btn.innerHTML = 'Guardar cambios';
  
  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-time-five"></span> Configuración - Horarios</h1></div>
    <div class="card" style="width:100%;max-width:none;margin:0">
      <div style="margin:0 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Horario de pedidos</div></div>
      <div class="grid grid-2">
        <div class="field"><label class="label">Pedidos desde</label><input class="input" type="time" id="ohOpen" value="${cfg.orderOpen}" style="max-width: 200px"></div>
        <div class="field"><label class="label">Pedidos hasta</label><input class="input" type="time" id="ohClose" value="${cfg.orderClose}" style="max-width: 200px"></div>
      </div>
      <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Horario de receso</div></div>
      <div class="grid grid-2">
        <div class="field"><label class="label">Receso desde</label><input class="input" type="time" id="brStart" value="${cfg.breakStart}" style="max-width: 200px"></div>
        <div class="field"><label class="label">Receso hasta</label><input class="input" type="time" id="brEnd" value="${cfg.breakEnd}" style="max-width: 200px"></div>
      </div>
      <div style="margin:20px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Capacidad</div></div>
      <div class="field"><label class="label">Capacidad de preparación (pedidos)</label><input class="input" type="number" id="cpCap" value="${cfg.capacity}" style="max-width: 150px"><div class="tiny muted" style="margin-top:6px">Máximo de pedidos simultáneos que la administradora puede preparar.</div></div>
      <div style="margin-top:24px;padding-top:18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;align-items:center">
        <span id="unsavedIndicator" class="unsaved-indicator" style="display:none" aria-label="Cambios sin guardar">
          <span class="pulse-dot"></span>
        </span>
        <button class="btn btn-primary" id="btnSaveConfigHours">Guardar cambios</button>
      </div>
    </div>
  `;
  
  const btnSave = $('#btnSaveConfigHours', el);
  const indicator = $('#unsavedIndicator', el);
  const fields = ['ohOpen', 'ohClose', 'brStart', 'brEnd', 'cpCap'];
  
  const checkChanges = () => {
    const currentValues = {
      orderOpen: $('#ohOpen', el).value,
      orderClose: $('#ohClose', el).value,
      breakStart: $('#brStart', el).value,
      breakEnd: $('#brEnd', el).value,
      capacity: $('#cpCap', el).value
    };
    hasUnsavedChanges = Object.keys(originalValues).some(key => currentValues[key] !== originalValues[key]);
    indicator.style.display = hasUnsavedChanges ? 'inline-flex' : 'none';
    btnSave.disabled = !hasUnsavedChanges;
    btnSave.style.opacity = hasUnsavedChanges ? '1' : '0.6';
  };
  
  fields.forEach(id => {
    const field = $('#' + id, el);
    if (field) {
      field.addEventListener('input', checkChanges);
      field.addEventListener('change', checkChanges);
    }
  });
  
  btnSave.onclick = () => saveConfigHours(btnSave, indicator, originalValues);
}

function saveConfigHours(btn, indicator, originalValues) {
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2.5px;margin-right:8px"></span>Guardando...';
  
  setTimeout(() => {
    const cfg = Store.config;
    cfg.orderOpen = $('#ohOpen').value || cfg.orderOpen;
    cfg.orderClose = $('#ohClose').value || cfg.orderClose;
    cfg.breakStart = $('#brStart').value || cfg.breakStart;
    cfg.breakEnd = $('#brEnd').value || cfg.breakEnd;
    cfg.capacity = parseInt($('#cpCap').value) || cfg.capacity;
    Store.config = cfg;
    logAudit('Actualizó horarios', 'Horario de pedidos y receso');
    toast('Horarios guardados.', 'success');
    
    btn.innerHTML = '<i class="bx bx-check" style="margin-right:6px"></i>Guardado';
    btn.classList.add('btn-success');
    btn.classList.remove('btn-primary');
    if (indicator) indicator.style.display = 'none';
    
    setTimeout(() => {
      renderBarAdmin('config-hours');
    }, 600);
  }, 500);
}

/* ============================================================
   CONFIGURACIÓN - ESTADO ABIERTO/CERRADO
   ============================================================ */
function barConfigStatus(el) {
  const cfg = Store.config;
  const isOpen = cfg.cafeOpen;
  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-cog"></span> Configuración - Estado</h1></div>
    <div class="card" style="width:100%;max-width:none;margin:0">
      <div style="text-align:center;margin-bottom:24px">
        <span class="badge ${isOpen ? 'badge-success' : 'badge-danger'}" style="font-size:1.5rem;margin-bottom:8px"><span class="ico bx ${isOpen ? 'bx-check-circle' : 'bx-lock-alt'}"></span> ${isOpen ? 'ABIERTA' : 'CERRADA'}</span>
      </div>
      <div style="text-align:center">
        <button class="btn ${isOpen ? 'btn-secondary' : 'btn-primary'}" id="btnToggleCafeStatus" style="width:100%;padding:12px;font-size:var(--fs-lg)">
          ${isOpen ? 'Cambiar a CERRADA' : 'Cambiar a ABIERTA'}
        </button>
      </div>
      <div style="margin-top:16px;text-align:center;color:var(--text-2);font-size:var(--fs-sm)">
        <b>Nota:</b> Si la cafetería está cerrada, los usuarios pueden ver el menú pero no realizar pedidos.
      </div>
    </div>
  `;
  $('#btnToggleCafeStatus', el).onclick = () => confirmToggleState(!isOpen, $('#btnToggleCafeStatus', el));
}

// Helper for config-status toggle - defined globally for onclick handlers
function confirmToggleState(toOpen, btn) {
  const msg = toOpen ? '¿Seguro que quieres abrir la cafetería?' : '¿Seguro que quieres cerrar la cafetería?';
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2.5px;margin-right:8px"></span>Procesando...';
  
  confirmDialog(msg, msg, 'Confirmar', false).then((ok) => {
    if (!ok) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }
    
    setTimeout(() => {
      const cfg = Store.config;
      cfg.cafeOpen = toOpen;
      Store.config = cfg;
      logAudit('Cambió estado de la cafetería', toOpen ? 'Abierta' : 'Cerrada');
      toast('La cafetería está ' + (toOpen ? 'ABIERTA' : 'CERRADA') + '.', toOpen ? 'success' : 'warning');
      
      btn.innerHTML = '<i class="bx bx-check" style="margin-right:6px"></i>' + (toOpen ? 'Abierta' : 'Cerrada');
      btn.classList.add('btn-success');
      btn.classList.remove('btn-primary', 'btn-secondary');
      
      setTimeout(() => {
        renderBarAdmin('config-status');
      }, 600);
    }, 500);
  });
}
window.confirmToggleState = confirmToggleState;
