/* ============================================================
   admin.js — Panel de la Administradora del Bar
   ============================================================ */

const BAR_SECTIONS = {
  orders: { label: 'Pedidos', icon: 'bx-receipt' },
  dashboard: { label: 'Dashboard', icon: 'bx-grid-alt' },
  products: { label: 'Productos', icon: 'bx-food-menu' },
  stock: { label: 'Stock', icon: 'bx-box' },
  payments: { label: 'Pagos', icon: 'bx-credit-card' },
  'sales-dashboard': { label: 'Ventas', icon: 'bx-line-chart' },
  delivery: { label: 'Delivery', icon: 'bx-cycling' },
  suppliers: { label: 'Proveedores', icon: 'bx-store' },
  reports: { label: 'Informes', icon: 'bx-bar-chart-alt-2' },
  'config-hours': { label: 'Configuración', icon: 'bx-cog' },
};

const BAR_PAGES = {
  ...BAR_SECTIONS,
  'payment-detail': { label: 'Detalle de pago', icon: 'bx-credit-card' },
  'sales-history': { label: 'Historial de ventas', icon: 'bx-history' },
  'stock-history': { label: 'Historial de stock', icon: 'bx-history' },
  'config-status': { label: 'Estado de cafetería', icon: 'bx-cog' },
  profile: { label: 'Mi perfil', icon: 'bx-user' },
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
        <div class="sb-brand"><span style="font-size:1.5rem"><i class="bx bx-coffee-togo"></i></span> <span class="brand-name">Cafetería INTESUD</span></div>
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
          <span style="font-size:1.3rem"><i class="bx ${BAR_PAGES[sec].icon}"></i></span>
          <span class="page-name">${BAR_PAGES[sec].label}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
            <span id="cafePill"></span>
            <div class="profile-chip" id="barUserMenu">
              <div class="avatar sm" style="${(currentUser().photo || Store.load('int_admin_photo_' + currentUser().id, '')) ? `background-image:url('${currentUser().photo || Store.load('int_admin_photo_' + currentUser().id, '')}');background-size:cover;background-position:center;color:transparent` : ''}">${(currentUser().photo || Store.load('int_admin_photo_' + currentUser().id, '')) ? '' : esc(initials(Store.load('int_admin_name_' + currentUser().id, null) || currentUser().name))}</div>
              <span class="pname">${esc(Store.load('int_admin_name_' + currentUser().id, null) || currentUser().name)}</span> ▾
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
      <nav class="admin-bottom-nav" id="adminBottomNav">
        <div class="abn-grid">
          ${[
            { id: 'dashboard', label: 'Inicio', icon: 'bx-grid-alt' },
            { id: 'products', label: 'Productos', icon: 'bx-food-menu' },
            { id: 'orders', label: 'Pedidos', icon: 'bx-receipt', badge: queueCount, center: true },
            { id: 'stock', label: 'Stock', icon: 'bx-box' },
            { id: 'more', label: 'Más', icon: 'bx-dots-horizontal-rounded' },
          ].map((item) => {
            const isActive = item.id === 'more'
              ? ['payments','sales-dashboard','sales-history','delivery','suppliers','reports','config-hours','config-status'].includes(activeSidebarSection)
              : activeSidebarSection === item.id;
            if (item.center) {
              return `<a class="abn-item center ${isActive ? 'active' : ''}" href="#" data-bnav="${item.id}">
                <span class="abn-circle"><i class="bx ${item.icon}"></i></span>
                <span class="abn-label">${item.label}</span>
                ${item.badge ? `<span class="abn-badge">${item.badge}</span>` : ''}
              </a>`;
            }
            return `<a class="abn-item ${isActive ? 'active' : ''}" href="#" data-bnav="${item.id}">
              <span class="abn-ico bx ${item.icon}"></span>
              <span>${item.label}</span>
              ${item.badge ? `<span class="abn-badge">${item.badge}</span>` : ''}
            </a>`;
          }).join('')}
        </div>
      </nav>
      <div id="adminMoreModal" style="display:none"></div>
    </div>`;

  renderCafePill($('#cafePill'));

  // Limpieza: elimina toggle/flecha huérfano de arquitecturas anteriores (ya no se usa)
  document.querySelectorAll('.sidebar-toggle').forEach((el) => el.remove());
  document.querySelectorAll('.sb-scrim').forEach((el) => el.remove());

  const sidebar = $('.admin-sidebar', app);
  const layout = $('.admin-layout', app);
  const closeSidebar = () => {
    // Arquitectura híbrida: sidebar móvil oculto, desktop siempre visible → no hay drawer que cerrar, solo limpia scrims huérfanos
    document.querySelectorAll('.sb-scrim').forEach((el) => el.remove());
  };
  // Bottom nav - Más modal (móvil) - 5 ítems fijos + 6 en modal
  const moreModal = $('#adminMoreModal', app);
  const MORE_ITEMS = [
    { id: 'payments', label: 'Pagos', icon: 'bx-credit-card' },
    { id: 'sales-dashboard', label: 'Ventas', icon: 'bx-line-chart' },
    { id: 'delivery', label: 'Delivery', icon: 'bx-cycling' },
    { id: 'suppliers', label: 'Proveedores', icon: 'bx-store' },
    { id: 'reports', label: 'Informes', icon: 'bx-bar-chart-alt-2' },
    { id: 'config-hours', label: 'Configuración', icon: 'bx-cog' },
  ];
  const closeMoreModal = () => {
    if (moreModal) { moreModal.style.display = 'none'; moreModal.innerHTML = ''; }
  };
  const openMoreModal = () => {
    if (!moreModal) return;
    moreModal.innerHTML = `
      <div class="admin-more-scrim"></div>
      <div class="admin-more-sheet">
        <div class="admin-more-header">
          <span>Más opciones</span>
          <button class="btn btn-ghost btn-sm" id="closeMoreBtn">✕</button>
        </div>
        ${MORE_ITEMS.map(item => `
          <a class="admin-more-item ${activeSidebarSection === item.id ? 'active' : ''}" href="#" data-more="${item.id}">
            <span class="ami-ico bx ${item.icon}"></span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </div>
    `;
    moreModal.style.display = 'block';
    $('.admin-more-scrim', moreModal)?.addEventListener('click', closeMoreModal);
    $('#closeMoreBtn', moreModal)?.addEventListener('click', closeMoreModal);
    $$('[data-more]', moreModal).forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      closeMoreModal();
      closeSidebar();
      setRoute('adminbar/' + a.dataset.more);
    }));
  };
  $$('[data-bnav]', app).forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = a.dataset.bnav;
    if (target === 'more') {
      openMoreModal();
    } else {
      closeSidebar();
      closeMoreModal();
      setRoute('adminbar/' + target);
    }
  }));
  $$('[data-bar]', app).forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); closeSidebar(); setRoute('adminbar/' + a.dataset.bar);
  }));
  const ud = $('#barUserDropdown');
  $('#barUserMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'profile') { setRoute('adminbar/profile'); ud.style.display = 'none'; } else setRoute(t); });
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
    suppliers: barSuppliers,
    reports: barReports,
    'config-hours': (target) => barConfigTabs(target, 'hours'),
    'config-status': (target) => barConfigTabs(target, 'status'),
    profile: barAdminProfile,
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
  // Layout tipo Settings: 2 columnas (izquierda Horarios, derecha Estado) en vez de pestañas separadas
  const cfg = Store.config;
  const isOpen = cfg.cafeOpen;
  const originalValues = {
    orderOpen: cfg.orderOpen,
    orderClose: cfg.orderClose,
    breakStart: cfg.breakStart,
    breakEnd: cfg.breakEnd,
    capacity: String(cfg.capacity)
  };
  let hasUnsavedChanges = false;

  // Inicializa métodos de pago habilitados si no existen
  if (!cfg.enabledPayments) cfg.enabledPayments = { deuna: true, transferencia: true, efectivo: true };
  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-cog"></span> Configuración</h1></div>
    <div class="grid grid-2" style="align-items:start;gap:16px">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="width:100%;max-width:none;margin:0">
          <div style="margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">General — Horarios y Estado</div></div>
          <div style="margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Horario de pedidos</div></div>
          <div class="grid grid-2">
            <div class="field"><label class="label">Pedidos desde</label><input class="input" type="time" id="ohOpen" value="${cfg.orderOpen}" style="max-width: 200px"></div>
            <div class="field"><label class="label">Pedidos hasta</label><input class="input" type="time" id="ohClose" value="${cfg.orderClose}" style="max-width: 200px"></div>
          </div>
          <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Horario de receso</div></div>
          <div class="grid grid-2">
            <div class="field"><label class="label">Receso desde</label><input class="input" type="time" id="brStart" value="${cfg.breakStart}" style="max-width: 200px"></div>
            <div class="field"><label class="label">Receso hasta</label><input class="input" type="time" id="brEnd" value="${cfg.breakEnd}" style="max-width: 200px"></div>
          </div>
          <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Capacidad</div></div>
          <div class="field"><label class="label">Capacidad de preparación (pedidos)</label><input class="input" type="number" id="cpCap" value="${cfg.capacity}" style="max-width: 150px"><div class="tiny muted" style="margin-top:6px">Máximo de pedidos simultáneos.</div></div>
          <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Estado</div></div>
          <div style="display:flex;align-items:center;gap:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:12px">
            <span class="badge ${isOpen ? 'badge-success' : 'badge-danger'}"><span class="ico bx ${isOpen ? 'bx-check-circle' : 'bx-lock-alt'}"></span> ${isOpen ? 'ABIERTA' : 'CERRADA'}</span>
            <button class="btn ${isOpen ? 'btn-secondary' : 'btn-primary'} btn-sm" id="btnToggleCafeStatus" style="margin-left:auto">${isOpen ? 'Cerrar cafetería' : 'Abrir cafetería'}</button>
          </div>
          <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Métodos de pago habilitados</div></div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <label class="checkbox-row"><input type="checkbox" id="payDeuna" ${cfg.enabledPayments.deuna ? 'checked' : ''}> DEUNA</label>
            <label class="checkbox-row"><input type="checkbox" id="payTrans" ${cfg.enabledPayments.transferencia ? 'checked' : ''}> Transferencia</label>
            <label class="checkbox-row"><input type="checkbox" id="payEfect" ${cfg.enabledPayments.efectivo ? 'checked' : ''}> Efectivo</label>
          </div>
          <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;align-items:center">
            <span id="unsavedIndicator" class="unsaved-indicator" style="display:none"><span class="pulse-dot"></span></span>
            <button class="btn btn-primary" id="btnSaveConfigHours">Guardar cambios</button>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="width:100%;max-width:none;margin:0">
          <div style="margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Preferencias — Categorías y Notificaciones</div></div>
          <div style="margin-bottom:14px">
            <div style="font-weight:700;margin-bottom:8px">Categorías de productos</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${CATEGORIES.map((c) => {
                const cnt = Store.products.filter((p) => p.category === c).length;
                return `<span class="badge badge-primary" style="font-size:13px;padding:6px 10px">${esc(c)} · ${cnt}</span>`;
              }).join('')}
            </div>
            <div class="tiny muted" style="margin-top:6px">Gestiona las categorías desde Productos.</div>
          </div>
          <div style="border-top:1px solid var(--border);padding-top:14px">
            <div style="font-weight:700;margin-bottom:8px">Notificaciones</div>
            <label class="checkbox-row"><input type="checkbox" checked disabled> Notificar pedidos nuevos (próximamente)</label>
            <div class="tiny muted" style="margin-left:26px">Aviso sonoro/visual cuando entra un pedido.</div>
          </div>
        </div>
        <div class="card" style="width:100%;max-width:none;margin:0;background:var(--primary-soft);border-color:var(--primary-glass)">
          <div style="font-weight:700;color:var(--primary-strong);margin-bottom:6px"><i class="bx bx-info-circle"></i> Nota</div>
          <div class="tiny" style="color:var(--text-2)">Solo se reorganizó lo existente. No se agregaron impuestos/tasas ni funcionalidades no implementadas.</div>
        </div>
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
    if (indicator) indicator.style.display = hasUnsavedChanges ? 'inline-flex' : 'none';
    if (btnSave) { btnSave.disabled = !hasUnsavedChanges; btnSave.style.opacity = hasUnsavedChanges ? '1' : '0.6'; }
  };
  fields.forEach(id => {
    const field = $('#' + id, el);
    if (field) { field.addEventListener('input', checkChanges); field.addEventListener('change', checkChanges); }
  });
  if (btnSave) btnSave.onclick = () => saveConfigHours(btnSave, indicator, originalValues);
  const btnToggle = $('#btnToggleCafeStatus', el);
  if (btnToggle) btnToggle.onclick = () => confirmToggleState(!isOpen, btnToggle);
}

function barSuppliers(el) {
  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-store"></span> Proveedores</h1><button class="btn btn-primary btn-sm" id="btnAddSupplierPage"><i class="bx bx-plus" style="margin-right:4px"></i>Agregar proveedor</button></div>
    <div class="card">
      <div id="suppliersListPage"></div>
    </div>
  `;
  const renderSuppliersPage = () => {
    const list = Store.suppliers;
    const wrap = $('#suppliersListPage', el);
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-store"></i></div><div style="font-weight:600">Aún no hay proveedores</div><div class="tiny muted" style="margin-top:4px">¡Agrega el primero para tener tus contactos a mano!</div></div>`;
      return;
    }
    wrap.innerHTML = `<div class="grid" style="gap:12px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${list.map(s => `
      <div class="stat-card" style="padding:12px;display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:42px;height:42px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">${esc(s.name.charAt(0).toUpperCase())}</div>
        <div style="flex:1 1 0%;min-width:0;overflow:hidden">
          <div class="bold" style="font-size:14px;line-height:1.2;white-space:normal;word-break:break-word;overflow:visible;text-overflow:clip">${esc(s.name)}</div>
          <div class="tiny muted" style="white-space:normal;word-break:break-word;line-height:1.3">${esc(s.type)} · ${esc(s.phone)}</div>
        </div>
        <span class="badge badge-success" style="flex-shrink:0;align-self:center">Activo</span>
        <div style="display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:88px">
	         <a class="btn btn-icon-supplier" href="tel:${esc(s.phone)}" title="Llamar"><i class="bx bx-phone"></i></a>
	         <a class="btn btn-icon-supplier" href="https://wa.me/${esc(s.phone.replace(/\D/g,""))}" target="_blank" title="WhatsApp"><i class="bx bxl-whatsapp"></i></a>
	         <button class="btn btn-icon-supplier" data-edit-supplier="${s.id}" title="Editar"><i class="bx bx-edit-alt"></i></button>
	         <button class="btn btn-icon-supplier" data-del-supplier="${s.id}" title="Eliminar"><i class="bx bx-trash"></i></button>
	         </div>
      </div>
    `).join('')}</div>`;
    $$('[data-edit-supplier]', wrap).forEach(b => b.onclick = () => supplierFormModal(Store.suppliers.find(x => x.id === b.dataset.editSupplier), renderSuppliersPage));
    $$('[data-del-supplier]', wrap).forEach(b => b.onclick = () => {
      const sup = Store.suppliers.find(x => x.id === b.dataset.delSupplier);
      confirmDialog('Eliminar proveedor', `¿Eliminar a ${esc(sup?.name || '')}?`, 'Eliminar', true).then(ok => {
        if (!ok) return;
        Store.suppliers = Store.suppliers.filter(x => x.id !== b.dataset.delSupplier);
        toast('Proveedor eliminado', 'success');
        renderSuppliersPage();
      });
    });
  };
  renderSuppliersPage();
  $('#btnAddSupplierPage', el)?.addEventListener('click', () => supplierFormModal(null, renderSuppliersPage));
}

function barReports(el) {
  const orders = Store.orders.filter(isValidSale);
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today);
  const totalVentas = orders.reduce((s, o) => s + o.total, 0);
  const totalHoy = todayOrders.reduce((s, o) => s + o.total, 0);
  // Desglose por método REAL: DEUNA, Transferencia, Efectivo (nunca Tarjeta)
  const byMethod = { deuna: 0, transferencia: 0, efectivo: 0 };
  orders.forEach((o) => { if (byMethod.hasOwnProperty(o.payment)) byMethod[o.payment] += o.total; });
  const totalMetodo = byMethod.deuna + byMethod.transferencia + byMethod.efectivo || 1;
  const pct = (v) => Math.round((v / totalMetodo) * 100);
  // Ventas por hora hoy
  const hours = [7,9,11,13,15,17,19];
  const hourTotals = hours.map((h) => todayOrders.filter((o) => {
    const hr = parseInt((o.time || '0:0').split(':')[0], 10);
    return hr >= h && hr < h + 2;
  }).reduce((s, o) => s + o.total, 0));
  const maxHour = Math.max(...hourTotals, 1);
  // Mini datos para sparkline ventas totales (últimos 7 días)
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10); const t = orders.filter((o) => o.date === date).reduce((s, o) => s + o.total, 0); days.push({ label: d.toLocaleDateString('es-EC', { weekday: 'short' }), total: t }); }

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-bar-chart-alt-2"></span> Informes</h1></div>
    <p class="page-sub" style="margin-bottom:16px">Resumen visual adaptado a la lógica real del proyecto</p>
    <div class="adv-tabs" style="margin-bottom:20px">
      <button class="category-chip active" data-rpt="ventas">Ventas</button>
      <button class="category-chip" data-rpt="productos">Productos</button>
      <button class="category-chip" data-rpt="pagos">Pagos</button>
      <button class="category-chip" data-rpt="resumen">Resumen</button>
    </div>
    <div id="rptContent"></div>
    <div class="grid grid-3" style="gap:14px;margin-top:20px">
      <div class="stat-card" style="padding:18px;text-align:center">
        <div style="font-size:2.2rem;color:var(--primary);margin-bottom:10px"><i class="bx bx-line-chart"></i></div>
        <div style="font-weight:700;margin-bottom:4px">Reporte de Ventas</div>
        <div class="tiny muted" style="margin-bottom:14px">Resumen de ventas por período</div>
        <button class="btn btn-outline btn-sm" disabled title="Próximamente" style="opacity:0.6;cursor:not-allowed"><i class="bx bx-download" style="margin-right:4px"></i>Descargar</button>
      </div>
      <div class="stat-card" style="padding:18px;text-align:center">
        <div style="font-size:2.2rem;color:var(--primary);margin-bottom:10px"><i class="bx bx-box"></i></div>
        <div style="font-weight:700;margin-bottom:4px">Reporte de Stock</div>
        <div class="tiny muted" style="margin-bottom:14px">Movimientos y existencias</div>
        <button class="btn btn-outline btn-sm" disabled title="Próximamente" style="opacity:0.6;cursor:not-allowed"><i class="bx bx-download" style="margin-right:4px"></i>Descargar</button>
      </div>
      <div class="stat-card" style="padding:18px;text-align:center">
        <div style="font-size:2.2rem;color:var(--primary);margin-bottom:10px"><i class="bx bx-credit-card"></i></div>
        <div style="font-weight:700;margin-bottom:4px">Reporte de Pagos</div>
        <div class="tiny muted" style="margin-bottom:14px">Estado de pagos y cobros</div>
        <button class="btn btn-outline btn-sm" disabled title="Próximamente" style="opacity:0.6;cursor:not-allowed"><i class="bx bx-download" style="margin-right:4px"></i>Descargar</button>
      </div>
    </div>
  `;

  const rptContent = $('#rptContent', el);
  const renderTab = (tab) => {
    if (tab === 'ventas') {
      rptContent.innerHTML = `
        <div class="grid grid-2" style="gap:16px;margin-bottom:16px">
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px">
            <div>
              <div class="tiny muted" style="text-transform:uppercase;letter-spacing:0.06em;font-weight:700">Ventas totales</div>
              <div style="font-size:2rem;font-weight:800;color:var(--primary-strong)">${money(totalVentas)}</div>
              <div class="tiny muted">${orders.length} pedidos válidos · ${money(totalHoy)} hoy</div>
            </div>
            <svg width="120" height="48" viewBox="0 0 120 48" style="flex-shrink:0">
              <polyline fill="none" stroke="var(--primary)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${days.map((d, i) => `${(i / 6) * 110 + 5},${40 - (d.total / Math.max(...days.map(x=>x.total),1)) * 30}`).join(' ')}" />
              <polygon fill="var(--primary-glass)" stroke="none" points="${days.map((d, i) => `${(i / 6) * 110 + 5},${40 - (d.total / Math.max(...days.map(x=>x.total),1)) * 30}`).join(' ')} 115,40 5,40" />
            </svg>
          </div>
          <div class="card">
            <div style="font-weight:700;margin-bottom:12px">Ventas por método de pago</div>
            <div style="display:flex;align-items:center;gap:16px">
              <svg width="110" height="110" viewBox="0 0 42 42" style="flex-shrink:0">
                ${(() => {
                  const vals = [byMethod.deuna, byMethod.transferencia, byMethod.efectivo];
                  const colors = ['#40807E', '#3b7cc3', '#22a06b'];
                  let acc = 0;
                  return vals.map((v, i) => {
                    const pctVal = v / totalMetodo;
                    const dash = pctVal * 100;
                    const gap = 0.5;
                    const offset = 25 - acc * 100;
                    acc += pctVal;
                    return `<circle r="15.915" cx="21" cy="21" fill="transparent" stroke="${colors[i]}" stroke-width="6" stroke-dasharray="${dash - gap} ${100 - dash + gap}" stroke-dashoffset="${offset}" />`;
                  }).join('');
                })()}
                <circle r="10" cx="21" cy="21" fill="var(--surface)" />
              </svg>
              <div style="flex:1;display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#40807E"></span>DEUNA</span><span class="bold">${money(byMethod.deuna)} · ${pct(byMethod.deuna)}%</span></div>
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#3b7cc3"></span>Transferencia</span><span class="bold">${money(byMethod.transferencia)} · ${pct(byMethod.transferencia)}%</span></div>
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#22a06b"></span>Efectivo</span><span class="bold">${money(byMethod.efectivo)} · ${pct(byMethod.efectivo)}%</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <div style="font-weight:700;margin-bottom:12px">Ventas por hora (hoy)</div>
          <div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding:8px 8px 0;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md)">
            ${hours.map((h, i) => {
              const v = hourTotals[i];
              const hPct = (v / maxHour) * 100;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px"><div style="font-size:10px;color:var(--text-3);font-weight:600">${money(v)}</div><div style="width:100%;height:100px;background:var(--surface-3);border-radius:6px 6px 0 0;overflow:hidden;display:flex;align-items:flex-end"><div style="width:100%;height:${Math.max(6, hPct)}%;background:var(--primary);border-radius:6px 6px 0 0"></div></div><div style="font-size:11px;font-weight:700;color:var(--text-2)">${h}h</div></div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (tab === 'productos') {
      const prodSales = {};
      orders.forEach((o) => o.items.forEach((i) => { prodSales[i.productId] = (prodSales[i.productId] || 0) + i.qty; }));
      const top = Object.entries(prodSales).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=> ({ product: Store.products.find((p)=>p.id===id), qty})).filter(x=>x.product);
      rptContent.innerHTML = `<div class="card"><div style="font-weight:700;margin-bottom:12px">Productos más vendidos</div>${top.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">${top.map(({product,qty})=>`<div class="stat-card" style="padding:14px;text-align:center"><div style="font-size:2rem;margin-bottom:6px">${product.emoji||'📦'}</div><div class="bold" style="font-size:var(--fs-sm)">${esc(product.name)}</div><div class="st-value primary" style="font-size:1.3rem">${qty} uds</div></div>`).join('')}</div>` : '<div class="tiny muted">Sin ventas aún</div>'}</div>`;
    } else if (tab === 'pagos') {
      rptContent.innerHTML = `
        <div class="grid grid-3" style="gap:12px">
          <div class="stat-card"><div class="st-label">DEUNA</div><div class="st-value primary">${money(byMethod.deuna)}</div><div class="st-sub">${pct(byMethod.deuna)}% del total</div></div>
          <div class="stat-card"><div class="st-label">Transferencia</div><div class="st-value" style="color:var(--info)">${money(byMethod.transferencia)}</div><div class="st-sub">${pct(byMethod.transferencia)}%</div></div>
          <div class="stat-card"><div class="st-label">Efectivo</div><div class="st-value success">${money(byMethod.efectivo)}</div><div class="st-sub">${pct(byMethod.efectivo)}%</div></div>
        </div>
        <div class="card" style="margin-top:16px"><div class="tiny muted">Métodos reales del proyecto: DEUNA, Transferencia y Efectivo. No se usa Tarjeta.</div></div>
      `;
    } else {
      rptContent.innerHTML = `
        <div class="grid grid-2" style="gap:16px">
          <div class="card"><div style="font-weight:700;margin-bottom:8px">Resumen general</div><div class="tiny muted">Ventas totales ${money(totalVentas)} en ${orders.length} pedidos. Hoy ${money(totalHoy)}.</div><div style="margin-top:12px;display:flex;gap:8px"><span class="badge badge-primary">DEUNA ${pct(byMethod.deuna)}%</span><span class="badge badge-info">Transferencia ${pct(byMethod.transferencia)}%</span><span class="badge badge-success">Efectivo ${pct(byMethod.efectivo)}%</span></div></div>
          <div class="card"><div style="font-weight:700;margin-bottom:8px">Accesos rápidos</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-goto="adminbar/sales-dashboard">Ver Ventas</button><button class="btn btn-outline btn-sm" data-goto="adminbar/payments">Ver Pagos</button><button class="btn btn-outline btn-sm" data-goto="adminbar/stock">Ver Stock</button></div></div>
        </div>
      `;
      $$('[data-goto]', rptContent).forEach((a)=> a.onclick=(e)=>{e.preventDefault(); const [s,p]=a.dataset.goto.split('/'); setRoute(s+'/'+p);});
    }
  };
  $$('[data-rpt]', el).forEach((btn)=> btn.onclick=()=>{
    $$('[data-rpt]', el).forEach((x)=> x.classList.remove('active'));
    btn.classList.add('active');
    renderTab(btn.dataset.rpt);
  });
  renderTab('ventas');
}

function supplierFormModal(supplier, onSave) {
  const isEdit = !!supplier;
  const ov = modal(`
    <h3>${isEdit ? 'Editar' : 'Nuevo'} proveedor</h3>
    <div class="field"><label class="label">Nombre</label><input class="input" id="supName" value="${isEdit ? esc(supplier.name) : ''}" placeholder="Ej. Distribuciones Andinas"></div>
    <div class="field"><label class="label">Tipo de insumo</label><input class="input" id="supType" value="${isEdit ? esc(supplier.type) : ''}" placeholder="Ej. Bebidas, Panadería, Snacks"></div>
    <div class="field"><label class="label">Teléfono</label><input class="input" id="supPhone" value="${isEdit ? esc(supplier.phone) : ''}" placeholder="0991234567"></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn btn-primary" id="btnSaveSupplier">${isEdit ? 'Guardar cambios' : 'Crear proveedor'}</button>
    </div>
  `, { wide: false });
  $('[data-cancel]', ov).onclick = () => ov.remove();
  $('#btnSaveSupplier', ov).onclick = () => {
    const name = $('#supName', ov).value.trim();
    const type = $('#supType', ov).value.trim();
    const phone = $('#supPhone', ov).value.trim();
    if (!name || !type || !phone) { toast('Completa todos los campos', 'warning'); return; }
    if (isEdit) {
      Object.assign(supplier, { name, type, phone });
      toast('Proveedor actualizado', 'success');
    } else {
      const list = Store.suppliers;
      list.push({ id: 's' + Date.now(), name, type, phone });
      Store.suppliers = list;
      toast('Proveedor agregado', 'success');
    }
    ov.remove();
    if (onSave) onSave();
  };
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
  const validSalesDash = orders.filter(isValidSale);
  const prodSalesDash = {};
  validSalesDash.forEach((o) => o.items.forEach((i) => { prodSalesDash[i.productId] = (prodSalesDash[i.productId] || 0) + i.qty; }));
  const topProductsDash = Object.entries(prodSalesDash).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,qty])=> ({ product: Store.products.find((p)=>p.id===id), qty})).filter(x=>x.product);

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
    <div class="page-title"><h1>Productos</h1></div>
    <button class="btn btn-primary btn-block" id="addProduct" style="width:100%;margin-bottom:16px">+ Agregar producto</button>
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
      <button class="category-chip active" data-cat="Todas">Todas <span style="opacity:0.7;font-weight:400">(${products.length})</span></button>
      ${cats.map((c) => {
        const cnt = products.filter((p) => p.category === c).length;
        return `<button class="category-chip" data-cat="${esc(c)}">${esc(c)} <span style="opacity:0.7;font-weight:400">(${cnt})</span></button>`;
      }).join('')}
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
        <td data-label="Producto"><div style="display:flex;align-items:center;gap:12px;min-width:0"><img style="width:54px;height:54px;border-radius:12px;object-fit:cover;flex-shrink:0" src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="width:54px;height:54px;border-radius:12px;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.6rem;${p.image ? 'display:none' : ''}">${productIcon(p)}</div><div style="min-width:0;max-width:190px"><div class="bold" style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div><div class="tiny" style="color:var(--primary);font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.category)}">${esc(p.category)}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.desc)}">${esc(p.desc)}</div></div></div></td>
        <td data-label="Categoría"><span>${esc(p.category)}</span></td>
        <td data-label="Precio"><span class="bold tabular-nums">${money(p.price)}</span></td>
        <td data-label="Stock"><span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.minStock ? 'badge-warning' : 'badge-success'}">${p.stock} ${p.stock === 0 ? '· agotado' : p.stock <= p.minStock ? '· bajo' : ''}</span></td>
        <td data-label="Prep"><span>${p.prepMin} min</span></td>
        <td data-label="Estado">${p.available ? '<span class="badge badge-success">Disponible</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td data-label="Acciones">
            <div style="position:relative">
              <button class="btn btn-ghost btn-icon" data-menu="${p.id}" style="width:32px;height:32px" title="Más acciones"><i class="bx bx-dots-vertical-rounded" style="font-size:18px"></i></button>
              <div class="dropdown-menu" id="prodMenu-${p.id}" style="display:none;position:absolute;right:0;top:36px;min-width:150px;z-index:10">
                <a class="dropdown-item" href="#" data-edit="${p.id}"><i class="bx bx-edit-alt"></i> Editar</a>
                <a class="dropdown-item" href="#" data-toggle="${p.id}"><i class="bx ${p.available ? 'bx-hide' : 'bx-show'}"></i> ${p.available ? 'Desactivar' : 'Activar'}</a>
              </div>
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
    $$('[data-menu]', tbody).forEach((btn) => btn.onclick = (e) => {
      e.stopPropagation();
      const menu = document.getElementById('prodMenu-' + btn.dataset.menu);
      if (!menu) return;
      const isHidden = menu.style.display === 'none';
      document.querySelectorAll('[id^="prodMenu-"]').forEach((m) => m.style.display = 'none');
      menu.style.display = isHidden ? 'block' : 'none';
    });
    // Cierra menús al hacer clic fuera
    document.addEventListener('click', () => {
      document.querySelectorAll('[id^="prodMenu-"]').forEach((m) => m.style.display = 'none');
    }, { once: false });
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

  function setFieldError(fieldId, msg) {
    const field = $('#' + fieldId, ov);
    const err = $('#' + fieldId + 'Err', ov);
    if (field) field.classList.add('field-has-error');
    if (err) err.textContent = msg || '';
  }
  function clearFieldError(fieldId) {
    const field = $('#' + fieldId, ov);
    const err = $('#' + fieldId + 'Err', ov);
    if (field) field.classList.remove('field-has-error');
    if (err) err.textContent = '';
  }

  const ov = modal(`
    <div class="pf-header">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="pf-header-title">${isEdit ? 'Editar producto' : 'Nuevo producto'}</div>
          <div class="tiny" style="color:rgba(255,255,255,.8)">${isEdit ? 'Actualiza la información del producto' : 'Registra un nuevo producto'}</div>
        </div>
        <button class="modal-close" data-mclose style="color:#fff;background:rgba(255,255,255,.12);width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;border-radius:var(--r-sm);border:none;cursor:pointer" aria-label="Cerrar">×</button>
      </div>
    </div>
    <div class="pf-cols">
      <div class="pf-left">
        <div class="field" id="pfNameFld">
          <label class="label">Nombre</label>
          <input class="input" id="pfName" value="${isEdit ? esc(p.name) : ''}">
          <div class="input-err-msg" id="pfNameErr"></div>
        </div>
        <div class="field" id="pfDescFld">
          <label class="label">Descripción</label>
          <textarea class="input" id="pfDesc" rows="3">${isEdit ? esc(p.desc) : ''}</textarea>
          <div class="input-err-msg" id="pfDescErr"></div>
        </div>
        <div class="grid grid-2">
          <div class="field" id="pfPriceFld">
            <label class="label">Precio ($)</label>
            <input class="input" type="number" step="0.05" id="pfPrice" value="${isEdit ? p.price : ''}">
            <div class="input-err-msg" id="pfPriceErr"></div>
          </div>
          <div class="field" id="pfCatFld">
            <label class="label">Categoría</label>
            <select class="input" id="pfCat">${cats.map((c) => `<option ${isEdit && p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="field" id="pfPrepFld">
            <label class="label">Tiempo prep (min)</label>
            <input class="input" type="number" id="pfPrep" value="${isEdit ? p.prepMin : ''}">
            <div class="input-err-msg" id="pfPrepErr"></div>
          </div>
          <div class="field" id="pfStockFld">
            <label class="label">Stock</label>
            <input class="input" type="number" id="pfStock" value="${isEdit ? p.stock : ''}">
            <div class="input-err-msg" id="pfStockErr"></div>
          </div>
        </div>
        <div class="field" id="pfMinFld">
          <label class="label">Stock mínimo</label>
          <input class="input" type="number" id="pfMin" value="${isEdit ? p.minStock : ''}">
          <div class="input-err-msg" id="pfMinErr"></div>
        </div>
        <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
          <label class="checkbox-row"><input type="checkbox" id="pfExtras" ${isEdit && p.allowExtras ? 'checked' : ''}> <b>Permitir adicionales/observaciones</b></label>
          <div class="tiny muted" style="margin-left:26px;margin-top:4px">El cliente podrá agregar notas o extras al producto.</div>
        </div>
        ${isEdit ? `
        <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
          <div class="pf-switch-label">
            <label class="switch"><input type="checkbox" id="pfActive" ${p.available ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></label>
            <span style="font-weight:600">Producto activo</span>
          </div>
          <div class="tiny muted" style="margin-left:36px;margin-top:4px">Desactiva para ocultar del menú sin eliminarlo.</div>
        </div>
        ` : ''}
      </div>
      <div class="pf-right">
        <div class="field">
          <label class="label">Imagen del producto</label>
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
      </div>
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

  ['pfName', 'pfPrice', 'pfStock', 'pfPrep', 'pfMin'].forEach(id => {
    const field = $('#' + id, ov);
    if (field) {
      field.addEventListener('input', () => clearFieldError(id));
      field.addEventListener('change', () => clearFieldError(id));
    }
  });

  $('[data-cancel]', ov).onclick = () => ov.remove();
  btnSave.onclick = () => {
    const name = $('#pfName', ov).value.trim();
    const price = parseFloat($('#pfPrice', ov).value);
    const stock = parseInt($('#pfStock', ov).value);
    const prep = parseInt($('#pfPrep', ov).value);
    const mn = parseInt($('#pfMin', ov).value);
    let ok = true;

    ['pfName', 'pfPrice', 'pfStock', 'pfPrep', 'pfMin'].forEach(clearFieldError);

    if (!name) { setFieldError('pfName', 'Requerido'); ok = false; }
    if (isNaN(price) || price <= 0) { setFieldError('pfPrice', 'Requerido'); ok = false; }
    if (isNaN(stock) || stock < 0) { setFieldError('pfStock', 'Requerido'); ok = false; }
    if (isNaN(prep) || prep <= 0) { setFieldError('pfPrep', 'Requerido'); ok = false; }
    if (isNaN(mn) || mn < 0) { setFieldError('pfMin', 'Requerido'); ok = false; }
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
    <div class="page-title"><h1>Stock</h1></div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <div class="input-wrap" style="flex:1"><span class="leading-ico"><i class="bx bx-search"></i></span><input class="input" id="stockSearch" placeholder="Buscar producto..." style="padding-left:36px"></div>
      <button class="btn btn-outline btn-sm" id="stockFilterBtn"><i class="bx bx-filter"></i> Filtros</button>
    </div>
    <div class="adv-tabs" style="margin-bottom:16px">
      <button class="category-chip active" data-stock-tab="todos">Todos</button>
      <button class="category-chip" data-stock-tab="bajo">Bajo stock</button>
      <button class="category-chip" data-stock-tab="agotados">Agotados</button>
    </div>
    <div class="grid grid-3" style="gap:12px;margin-bottom:16px">
      <div class="stat-card"><div class="st-label">Total productos</div><div class="st-value">${products.length}</div><div class="st-sub">${products.filter((p)=>p.available).length} activos</div><span class="stat-ico bx bx-package muted"></span></div>
      <div class="stat-card warning-card"><div class="st-label">Bajo stock</div><div class="st-value warning">${lowStock.length}</div><div class="st-sub">requieren reposición</div><span class="stat-ico bx bx-error warning"></span></div>
      <div class="stat-card danger-card"><div class="st-label">Agotados</div><div class="st-value danger">${outOfStock.length}</div><div class="st-sub">sin existencias</div><span class="stat-ico bx bx-x-circle danger"></span></div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:12px">Productos con bajo stock</div>
      <div id="lowStockList" style="display:flex;flex-direction:column;gap:10px">
        ${lowStock.length ? lowStock.slice(0,4).map((p)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer" data-low="${p.id}">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--warning-soft);display:flex;align-items:center;justify-content:center;color:var(--warning-strong)"><i class="bx bx-error"></i></div>
            <div style="flex:1;min-width:0"><div class="bold" style="font-size:14px">${esc(p.name)}</div><div class="tiny muted">${esc(p.category)}</div></div>
            <span class="badge ${p.stock <= 2 ? 'badge-danger' : 'badge-warning'}">${p.stock <= 2 ? 'Muy bajo' : 'Bajo'}</span>
            <span class="bold tabular-nums">${p.stock}</span>
          </div>
        `).join('') : '<div class="tiny muted" style="text-align:center;padding:12px">Sin productos con bajo stock</div>'}
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:12px">Productos agotados</div>
      <div id="outStockList" style="display:flex;flex-direction:column;gap:10px">
        ${outOfStock.length ? outOfStock.slice(0,4).map((p)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--r-md)">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--danger-soft);display:flex;align-items:center;justify-content:center;color:var(--danger)"><i class="bx bx-x-circle"></i></div>
            <div style="flex:1"><div class="bold" style="font-size:14px">${esc(p.name)}</div><div class="tiny muted">${esc(p.category)}</div></div>
            <span class="badge badge-danger">Agotado</span>
          </div>
        `).join('') : '<div class="tiny muted" style="text-align:center;padding:12px">Ningún producto agotado</div>'}
      </div>
    </div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th><th>Última actualización</th><th></th></tr></thead>
      <tbody id="stockRows"></tbody>
    </table></div>
    <div style="margin-top:24px">
      <h3 class="section-title">Movimientos recientes</h3>
      <div class="card" id="stockHist"></div>
    </div>`;

  let stockCat = 'Todas';
  const renderRows = () => {
    const list = stockCat === 'Todas' ? products : products.filter((p) => p.category === stockCat);
    const tbody = $('#stockRows', el);
    tbody.innerHTML = list.map((p) => {
      const h = history.find((x) => x.productId === p.id);
      const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
      const fillCls = p.stock === 0 ? 'background:var(--danger)' : p.stock <= p.minStock ? 'background:var(--warning)' : 'background:var(--success)';
      return `<tr>
        <td data-label="Producto"><div class="bold" style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div></td>
        <td data-label="Stock actual"><div class="stock-line"><b class="tabular-nums">${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td>
        <td data-label="Stock mínimo"><span class="tabular-nums">${p.minStock}</span></td>
        <td data-label="Estado">${stockBadge(p)}</td>
        <td data-label="Última actualización"><span>${h ? `${h.time} ${h.date}` : '—'}</span></td>
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
  $$('[data-stock-cat]', el).forEach((btn) => btn.onclick = () => {
    $$('[data-stock-cat]', el).forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    stockCat = btn.dataset.stockCat;
    renderRows();
  });
  // Tabs stock: Todos / Bajo / Agotados
  $$('[data-stock-tab]', el).forEach((btn) => btn.onclick = () => {
    $$('[data-stock-tab]', el).forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.stockTab;
    if (tab === 'bajo') {
      const low = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
      const tbody = $('#stockRows', el);
      tbody.innerHTML = low.map((p) => {
        const h = history.find((x) => x.productId === p.id);
        const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
        const fillCls = 'background:var(--warning)';
        return `<tr><td data-label="Producto"><div class="bold" style="font-size:15px">${esc(p.name)}</div></td><td data-label="Stock actual"><div class="stock-line"><b>${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td><td data-label="Estado"><span class="badge badge-warning">Bajo</span></td><td data-label="Acciones"><div style="display:flex;gap:8px"><button class="btn btn-success btn-icon" data-inc="${p.id}"><i class="bx bx-plus"></i></button><button class="btn btn-neutral btn-icon" data-dec="${p.id}"><i class="bx bx-minus"></i></button></div></td></tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px" class="tiny muted">Sin bajo stock</td></tr>';
      $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
      $$('[data-dec]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });
    } else if (tab === 'agotados') {
      const out = products.filter((p) => p.stock === 0);
      const tbody = $('#stockRows', el);
      tbody.innerHTML = out.map((p) => `<tr><td data-label="Producto"><div class="bold" style="font-size:15px">${esc(p.name)}</div></td><td data-label="Stock actual"><b>0</b></td><td data-label="Estado"><span class="badge badge-danger">Agotado</span></td><td data-label="Acciones"><button class="btn btn-success btn-icon" data-inc="${p.id}"><i class="bx bx-plus"></i></button></td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px" class="tiny muted">Sin agotados</td></tr>';
      $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
    } else {
      renderRows();
    }
  });
  const stockSearch = $('#stockSearch', el);
  if (stockSearch) stockSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const tbody = $('#stockRows', el);
    const filtered = products.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    tbody.innerHTML = filtered.map((p) => {
      const h = history.find((x) => x.productId === p.id);
      const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
      const fillCls = p.stock === 0 ? 'background:var(--danger)' : p.stock <= p.minStock ? 'background:var(--warning)' : 'background:var(--success)';
      return `<tr><td data-label="Producto"><div class="bold" style="font-size:15px">${esc(p.name)}</div></td><td data-label="Stock actual"><div class="stock-line"><b>${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td><td data-label="Estado">${stockBadge(p)}</td><td data-label="Acciones"><div style="display:flex;gap:8px"><button class="btn btn-success btn-icon" data-inc="${p.id}"><i class="bx bx-plus"></i></button><button class="btn btn-neutral btn-icon" data-dec="${p.id}"><i class="bx bx-minus"></i></button></div></td></tr>`;
    }).join('');
    $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
    $$('[data-dec]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });
  });
  $$('[data-low]', el).forEach((item) => item.onclick = () => {
    const p = products.find((x) => x.id === item.dataset.low);
    if (p) { stockCat = p.category; $$('[data-stock-cat]', el).forEach((x) => x.classList.toggle('active', x.dataset.stockCat === p.category)); renderRows(); }
  });

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
            <td data-label="Fecha/hora"><span class="small" style="white-space:nowrap;">${h.time}</span></td>
            <td data-label="Producto"><span>${esc(h.name)}</span></td>
            <td data-label="Tipo"><span class="badge ${typeBadge}">${typeIcon} ${type}</span></td>
            <td data-label="Cantidad"><span class="bold tabular-nums ${deltaClass}">${h.delta > 0 ? '+' : ''}${h.delta}</span></td>
            <td data-label="Stock resultante"><span class="tabular-nums">${h.newVal}</span></td>
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

  const today = new Date().toISOString().slice(0, 10);
  const validToday = orders.filter((o) => o.date === today && isValidSale(o));
  const totalToday = validToday.reduce((s, o) => s + o.total, 0);
  const byMethod = { efectivo: 0, deuna: 0, transferencia: 0 };
  validToday.forEach((o) => { if (byMethod.hasOwnProperty(o.payment)) byMethod[o.payment] += o.total; });
  const pct = (v) => totalToday ? Math.round((v / totalToday) * 100) : 0;

  // Últimas transacciones para lista compacta
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
      <div class="stat-card success-card sales-summary-card"><span class="stat-ico bx bx-dollar success"></span><div class="st-label">Ventas del día</div><div class="st-value" data-sales-count="${salesToday}" data-sales-format="money">${money(0)}</div></div>
      <div class="stat-card sales-summary-card"><span class="stat-ico bx bx-receipt muted"></span><div class="st-label">Ticket promedio</div><div class="st-value" ${countToday > 0 ? `data-sales-count="${salesToday / countToday}" data-sales-format="money"` : ''}>${countToday > 0 ? money(0) : '—'}</div></div>
      <div class="stat-card sales-summary-card"><span class="stat-ico bx bx-cart primary"></span><div class="st-label">Número de ventas</div><div class="st-value primary" data-sales-count="${countToday}" data-sales-format="number">0</div></div>
      <div class="stat-card sales-summary-card"><span class="stat-ico bx bx-calendar muted"></span><div class="st-label">Total del mes</div><div class="st-value" data-sales-count="${salesMonth}" data-sales-format="money">${money(0)}</div></div>
    </div>

<div class="grid grid-2" style="margin-bottom:24px;align-items:stretch">
      <div class="card mom-performance-card" style="display:flex;flex-direction:column;min-height:360px"><h3 style="margin-bottom:16px">Rendimiento del mes</h3><div id="momDonutChart" class="mom-donut-chart" style="flex:1;display:flex;align-items:center;justify-content:center"></div></div>

  <div class="card" style="display:flex;flex-direction:column;min-height:360px">
    <h3 style="margin-bottom:16px">Ventas por día (últimos 7 días)</h3>
    <div id="salesLineChart" class="sales-line-chart" style="flex:1;display:flex;align-items:center;justify-content:center"></div>
  </div>
</div>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:16px">Ventas por hora (hoy)</h3>
      <div id="salesHourChart" style="display:flex;align-items:flex-end;gap:8px;height:160px;padding:12px 8px 0;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)"></div>
      <div class="tiny muted" style="margin-top:8px;text-align:center">Agrupado por franja horaria del día actual</div>
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
  renderSalesHourChart(el, todayOrders);
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

function renderSalesHourChart(el, todayOrders) {
  const container = $('#salesHourChart', el);
  if (!container) return;
  const hours = [7,9,11,13,15,17,19];
  const totals = hours.map((h) => {
    return todayOrders.filter((o) => {
      const hour = parseInt((o.time || '0:0').split(':')[0], 10);
      return hour >= h && hour < h + 2;
    }).reduce((s, o) => s + o.total, 0);
  });
  const max = Math.max(...totals, 1);
  container.innerHTML = hours.map((h, i) => {
    const val = totals[i];
    const pct = (val / max) * 100;
    const height = Math.max(8, pct);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="font-size:10px;color:var(--text-3);font-weight:600">${money(val)}</div>
      <div style="width:100%;height:100px;background:var(--surface-3);border-radius:6px 6px 0 0;overflow:hidden;display:flex;align-items:flex-end">
        <div style="width:100%;height:${height}%;background:linear-gradient(180deg,var(--primary),var(--primary-hover));border-radius:6px 6px 0 0;transition:height 0.6s ease;min-height:${val ? '4px' : '0'}"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-2)">${h}h</div>
    </div>`;
  }).join('');
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
      <tr><td data-label="Fecha/hora"><span class="small">${o.date} ${o.time || '—'}</span></td><td data-label="Pedido"><span class="bold">#${o.id}</span></td><td data-label="Monto"><span class="bold tabular-nums">${money(o.total)}</span></td><td data-label="Método pago"><span>${paymentMethodLabel(o.payment)}</span></td><td data-label="Estado">${statusMeta(o.status)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-history"></i></div><div style="font-weight:600">Aún no hay historial de ventas</div><div class="tiny muted" style="margin-top:4px">Tus ventas aparecerán aquí con mucho corazón</div></td></tr>';
  };

  renderSkeletonRows();
  setTimeout(renderRows, 350);
}
 
function barDelivery(el) {
  ensureAdminbarPresentationStyles();
  const orders = Store.orders.filter((o) => o.delivery === 'delivery');
  const pending = orders.filter((o) => ['queue','confirmed','prep'].includes(o.status));
  const enCamino = orders.filter((o) => o.status === 'ready');
  const entregado = orders.filter((o) => o.status === 'delivered');
  const cfg = Store.config;
  const week = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const floors = ['Piso 1', 'Piso 2', 'Piso 3'];
  
  // Initialize delivery floors in config if not present
  if (!cfg.deliveryFloors) cfg.deliveryFloors = floors;

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-cycling"></span> Delivery <span class="badge badge-primary">${orders.length} pedidos</span></h1></div>
    <p class="page-sub" style="margin-bottom:16px">Delivery interno INTESUD — por pisos, sin repartidores externos</p>
    <div class="adv-tabs" style="margin-bottom:16px">
      <button class="category-chip active" data-dtab="pendiente">Pendiente (${pending.length})</button>
      <button class="category-chip" data-dtab="encamino">En camino (${enCamino.length})</button>
      <button class="category-chip" data-dtab="entregado">Entregado (${entregado.length})</button>
      <button class="category-chip" data-dtab="config">Configuración</button>
    </div>
    <div id="deliveryArea"></div>
    <div id="deliveryConfig" style="display:none">
      <div class="card" style="width:100%;max-width:none;margin:0">
        <div style="margin:0 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Servicio</div></div>
        <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px">
          <label class="checkbox-row"><input type="checkbox" id="dlEnabled" ${cfg.deliveryEnabled ? 'checked' : ''}> <b>Habilitar delivery interno</b></label>
          <div class="tiny muted" style="margin-left:26px;margin-top:4px">Cobertura exclusiva dentro del edificio INTESUD.</div>
        </div>
        <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Pisos habilitados</div></div>
        <div class="field" id="dlFloorsField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlFloors">
            ${floors.map((f) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-floor="${f}" ${cfg.deliveryFloors.includes(f) ? 'checked' : ''} style="margin-right:4px">${f}</label>`).join('')}
          </div>
        </div>
        <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Días y horario</div></div>
        <div class="field" id="dlDaysField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <label class="label">Días de entrega</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlDays">
            ${week.map((d) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-day="${d}" ${cfg.deliveryDays.includes(d) ? 'checked' : ''} style="margin-right:4px">${d}</label>`).join('')}
          </div>
        </div>
        <div class="grid grid-2" id="dlTimeFields" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'};margin-top:12px">
          <div class="field"><label class="label">Hora inicio</label><input class="input" type="time" id="dlStart" value="${cfg.orderOpen}" style="max-width: 200px"></div>
          <div class="field"><label class="label">Hora fin</label><input class="input" type="time" id="dlEnd" value="${cfg.orderClose}" style="max-width: 200px"></div>
        </div>
        <div class="field" id="dlMaxField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <label class="label">Capacidad máxima simultánea</label>
          <input class="input" type="number" id="dlMax" value="${cfg.deliveryMax}" style="max-width: 150px"><div class="tiny muted" style="margin-top:6px">Pedidos de delivery que pueden atenderse simultáneamente.</div>
        </div>
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
          <button class="btn btn-primary" id="dlSave">Guardar configuración</button>
        </div>
      </div>
    </div>
    ${cfg.deliveryEnabled ? '' : '<div class="status-banner warning" style="margin-top:16px" id="dlWarning"><span class="ico">⚠️</span><div>Delivery interno deshabilitado. Habilítalo en Configuración.</div></div>'}
  `;

  let dtab = 'pendiente';
  const renderDelivery = () => {
    const area = $('#deliveryArea', el);
    const configDiv = $('#deliveryConfig', el);
    const warning = $('#dlWarning', el);
    if (dtab === 'config') {
      area.style.display = 'none';
      if (warning) warning.style.display = 'none';
      configDiv.style.display = 'block';
      return;
    } else {
      area.style.display = 'block';
      if (warning) warning.style.display = cfg.deliveryEnabled ? 'none' : 'block';
      configDiv.style.display = 'none';
    }
    const list = dtab === 'pendiente' ? pending : dtab === 'encamino' ? enCamino : entregado;
    if (!list.length) {
      area.innerHTML = `<div class="empty-state" style="padding:24px"><div class="es-ico">📦</div><h3>Sin pedidos ${dtab}</h3><p class="tiny muted">No hay deliveries en este estado por ahora.</p></div>`;
      return;
    }
    area.innerHTML = `<div class="grid" style="gap:12px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${list.map((o) => `
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="bold" style="color:var(--primary-strong)">#${o.id}</span>
          <span class="badge ${o.status === 'ready' ? 'badge-warning' : o.status === 'delivered' ? 'badge-success' : 'badge-info'}">${o.status === 'queue' || o.status === 'confirmed' || o.status === 'prep' ? 'Pendiente' : o.status === 'ready' ? 'En camino' : 'Entregado'}</span>
        </div>
        <div class="tiny muted"><b>Estudiante:</b> ${esc(o.userName)} · <b>Piso ${esc(o.deliveryInfo?.piso || '—')}</b> Aula ${esc(o.deliveryInfo?.aula || '—')}</div>
        <div style="font-size:var(--fs-sm)">${o.items.map((i)=>`${esc(i.name)} ×${i.qty}`).join(', ')}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <span class="bold tabular-nums">${money(o.total)}</span>
          <span class="tiny muted">${o.time} · ${o.date}</span>
        </div>
      </div>
    `).join('')}</div>`;
  };
  $$('[data-dtab]', el).forEach((btn) => btn.onclick = () => {
    $$('[data-dtab]', el).forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    dtab = btn.dataset.dtab;
    renderDelivery();
  });
  renderDelivery();
  // Configuración handlers
  const dlEnabledEl = $('#dlEnabled', el);
  const dlFields = ['dlDaysField','dlFloorsField','dlTimeFields','dlMaxField'];
  if (dlEnabledEl) dlEnabledEl.onchange = () => {
    cfg.deliveryEnabled = dlEnabledEl.checked;
    dlFields.forEach(id => {
      const f = $('#' + id, el);
      if (f) { f.style.opacity = cfg.deliveryEnabled ? '' : '.5'; f.style.pointerEvents = cfg.deliveryEnabled ? '' : 'none'; }
    });
    const w = $('#dlWarning', el);
    if (w) w.style.display = cfg.deliveryEnabled ? 'none' : 'block';
  };
  const dlSaveBtn = $('#dlSave', el);
  if (dlSaveBtn) dlSaveBtn.onclick = () => {
    cfg.orderOpen = $('#dlStart', el).value || cfg.orderOpen;
    cfg.orderClose = $('#dlEnd', el).value || cfg.orderClose;
    cfg.deliveryMax = parseInt($('#dlMax', el).value) || cfg.deliveryMax;
    cfg.deliveryDays = week.filter((d) => $(`[data-day="${d}"]`, el)?.checked);
    cfg.deliveryFloors = floors.filter((f) => $(`[data-floor="${f}"]`, el)?.checked);
    cfg.deliveryEnabled = $('#dlEnabled', el).checked;
    Store.config = cfg;
    logAudit('Actualizó configuración de delivery', cfg.deliveryEnabled ? 'Delivery habilitado' : 'Delivery deshabilitado');
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

function barAdminProfile(el) {
  const user = currentUser();
  if (!user) return route('login');
  const storedPhoto = Store.load('int_admin_photo_' + user.id, null) || user.photo || '';
  const currentPhoto = storedPhoto;
  const currentName = Store.load('int_admin_name_' + user.id, null) || user.name || '';

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-user"></span> Mi perfil</h1></div>
    <div class="card" style="max-width:560px">
      <div style="display:flex;gap:18px;align-items:center;margin-bottom:20px;flex-wrap:wrap">
        <div id="profileAvatarPreview" class="avatar lg" style="width:80px;height:80px;font-size:1.8rem;flex-shrink:0;${currentPhoto ? `background-image:url('${currentPhoto}');background-size:cover;background-position:center;color:transparent` : ''}">${currentPhoto ? '' : esc(initials(currentName))}</div>
        <div style="flex:1;min-width:200px">
          <div class="field" style="margin-bottom:8px">
            <label class="label">Foto de perfil</label>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0">
                <i class="bx bx-cloud-upload" style="margin-right:6px"></i>Subir foto
                <input type="file" id="profilePhotoInput" accept="image/*" style="display:none">
              </label>
              <button class="btn btn-neutral btn-sm" id="btnRemovePhoto" ${currentPhoto ? '' : 'disabled style="opacity:0.6"'}>Quitar foto</button>
            </div>
            <div class="tiny muted" style="margin-top:6px">Se guarda en base64 local, como las imágenes de producto</div>
          </div>
        </div>
      </div>
      <div class="field">
        <label class="label">Nombre para mostrar</label>
        <input class="input" id="profileNameInput" value="${esc(currentName)}" placeholder="Administradora Bar">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
        <button class="btn btn-primary" id="btnSaveProfile">Guardar cambios</button>
      </div>
    </div>
  `;

  const photoInput = $('#profilePhotoInput', el);
  const avatarPreview = $('#profileAvatarPreview', el);
  const nameInput = $('#profileNameInput', el);
  const btnRemove = $('#btnRemovePhoto', el);
  let newPhotoBase64 = currentPhoto;

  const updateAvatarPreview = (photo) => {
    if (photo) {
      avatarPreview.style.backgroundImage = `url('${photo}')`;
      avatarPreview.style.backgroundSize = 'cover';
      avatarPreview.style.backgroundPosition = 'center';
      avatarPreview.style.color = 'transparent';
      avatarPreview.textContent = '';
      if (btnRemove) { btnRemove.disabled = false; btnRemove.style.opacity = '1'; }
    } else {
      avatarPreview.style.backgroundImage = '';
      avatarPreview.textContent = esc(initials(nameInput.value.trim() || currentName));
      avatarPreview.style.color = '';
      if (btnRemove) { btnRemove.disabled = true; btnRemove.style.opacity = '0.6'; }
    }
  };

  nameInput.addEventListener('input', () => {
    if (!newPhotoBase64) {
      avatarPreview.textContent = esc(initials(nameInput.value.trim() || 'AB'));
    }
  });

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Solo se permiten imágenes', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      newPhotoBase64 = ev.target.result;
      updateAvatarPreview(newPhotoBase64);
    };
    reader.readAsDataURL(file);
  });

  if (btnRemove) {
    btnRemove.onclick = () => {
      newPhotoBase64 = '';
      photoInput.value = '';
      updateAvatarPreview('');
    };
  }

  $('#btnSaveProfile', el).onclick = () => {
    const newName = nameInput.value.trim();
    if (!newName) { toast('El nombre no puede estar vacío', 'warning'); return; }
    const session = Store.load('int_session', null);
    if (session) {
      session.name = newName;
      if (newPhotoBase64 !== undefined) session.photo = newPhotoBase64;
      Store.save('int_session', session);
    }
    const users = Store.users;
    const u = users.find(x => x.id === user.id);
    if (u) {
      u.name = newName;
      if (newPhotoBase64 !== undefined) u.photo = newPhotoBase64;
      Store.users = users;
    }
    Store.save('int_admin_name_' + user.id, newName);
    Store.save('int_admin_photo_' + user.id, newPhotoBase64 || '');
    // Actualiza también la foto en el avatar global si existe
    toast('Perfil actualizado', 'success');
    renderBarAdmin('profile');
  };
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

/* ============================================================
   Resize handler - Recalcula layout responsive con debounce
   ============================================================ */
let adminResizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(adminResizeTimeout);
  adminResizeTimeout = setTimeout(() => {
    const isMobile = window.innerWidth <= 768;
    const isAdmin = document.body.classList.contains('is-admin') || window.location.hash.includes('adminbar');
    if (!isAdmin) return;
    // Recalcula visibilidad de sidebar/bottom nav (CSS media queries ya manejan display, pero asegura padding y topbar)
    const content = document.querySelector('.admin-content');
    if (content) {
      content.style.paddingBottom = isMobile ? '80px' : '';
    }
    const topbar = document.querySelector('.admin-topbar');
    if (topbar) {
      const pill = document.getElementById('cafePill');
      if (pill) {
        pill.style.flexShrink = '0';
        pill.style.whiteSpace = 'nowrap';
      }
      // Fuerza reflow para evitar badge cortado al rotar
      topbar.style.display = 'none';
      // eslint-disable-next-line no-unused-expressions
      topbar.offsetHeight;
      topbar.style.display = '';
    }
    // Limpia estados de drawer huérfanos al cambiar breakpoint sin recargar
    document.querySelectorAll('.sb-scrim').forEach((el) => el.remove());
    document.querySelectorAll('.admin-layout.sidebar-push').forEach((el) => el.classList.remove('sidebar-push'));
    if (!isMobile) {
      document.querySelectorAll('.admin-sidebar.open').forEach((el) => el.classList.remove('open'));
      const moreModal = document.getElementById('adminMoreModal');
      if (moreModal) { moreModal.style.display = 'none'; moreModal.innerHTML = ''; }
    }
  }, 180);
});
