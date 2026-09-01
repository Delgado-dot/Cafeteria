/* ============================================================
   app.js — Enrutador, navegación por rol y páginas del usuario
   Cafetería INTESUD · Sistema de diseño v2
   ============================================================ */

function currentUser() { return Auth.current(); }
window.currentUser = currentUser;

function route(r) {
  setRoute(r);
  window.scrollTo(0, 0);
}
window.route = route;

function setRoute(r) {
  if (!r) r = 'home';
  window.location.hash = r;
  handleRoute();
}
window.setRoute = setRoute;

/* ---------- Resolución de rutas y separación por rol ---------- */

// Rutas públicas legibles que redirigen al área interna correspondiente.
// El núcleo interno (home, menu, cart, adminbar/*, admindev/*) se mantiene
// como aliases estables para no romper los setRoute existentes.
function resolveAlias(r) {
  if (r === 'usuario') return 'home';
  if (r.startsWith('usuario/')) return r.slice('usuario/'.length) || 'home';
  if (r === 'bar') return 'adminbar/dashboard';
  if (r.startsWith('bar/')) return 'adminbar/' + r.slice('bar/'.length);
  if (r === 'developer') return 'admindev/dashboard';
  if (r.startsWith('developer/')) return 'admindev/' + r.slice('developer/'.length);
  return r;
}
window.resolveAlias = resolveAlias;

// Define a qué rol pertenece cada ruta para impedir el cruce de interfaces.
function routeTargetRole(r) {
  if (r.startsWith('adminbar')) return 'adminbar';
  if (r.startsWith('admindev')) return 'admindev';
  return 'user';
}

// Ruta de aterrizaje por defecto de cada rol (inicio de su propia interfaz).
function homeRouteFor(role) {
  if (role === 'adminbar') return 'adminbar/dashboard';
  if (role === 'admindev') return 'admindev/dashboard';
  return 'home';
}
window.homeRouteFor = homeRouteFor;

function handleRoute() {
  const user = Auth.current();
  let r = (window.location.hash || '#home').replace('#', '');
  params.product = null;

  // Páginas públicas
  if (r === 'landing') return renderLanding();
  if (r === 'login') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    return renderLogin();
  }
  if (r === 'forgot') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    return renderForgot();
  }

  // Alias públicos legibles
  r = resolveAlias(r);

  if (r.startsWith('product/')) {
    params.product = r.split('/')[1];
    r = 'product';
  }

  // Sin sesión: el Landing público es la puerta de entrada del sistema.
  // El login se alcanza desde el botón "ACCEDER" del Landing.
  if (!user) return renderLanding();

  // Separación por rol: cada rol vive en su propia interfaz.
  if (routeTargetRole(r) !== user.role) {
    setRoute(homeRouteFor(user.role));
    return;
  }

  if (r.startsWith('adminbar')) return renderBarAdmin(r.split('/')[1] || 'dashboard');
  if (r.startsWith('admindev')) return renderDevAdmin(r.split('/')[1] || 'dashboard');

  renderUserShell(r);
}
window.handleRoute = handleRoute;

/* ---------- Iconos Lucide (inline SVG, sin emojis) ---------- */
const UI_ICO = {
  svg: (paths, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`,
  home: (s) => UI_ICO.svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', s),
  menu: (s) => UI_ICO.svg('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>', s),
  orders: (s) => UI_ICO.svg('<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>', s),
  profile: (s) => UI_ICO.svg('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s),
  logout: (s) => UI_ICO.svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>', s),
  menuToggle: (s) => UI_ICO.svg('<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>', s),
  close: (s) => UI_ICO.svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', s),
  cart: (s) => UI_ICO.svg('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>', s),
  search: (s) => UI_ICO.svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', s),
  chevron: (s) => UI_ICO.svg('<path d="m6 9 6 6 6-6"/>', s),
  lock: (s) => UI_ICO.svg('<rect width="16" height="11" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', s),
};
window.UI_ICO = UI_ICO;

/* ---------- User shell (header + sidebar + main + mobile nav) ---------- */
const USER_SIDEBAR_LINKS = [
  ['home', 'home', 'Inicio'],
  ['menu', 'menu', 'Menú'],
  ['orders', 'orders', 'Mis pedidos'],
  ['profile', 'profile', 'Perfil'],
];

function renderUserShell(page) {
  const app = $('#app');
  const user = currentUser();
  const cartCount = Cart.count();

  const pageClasses = page === 'product' ? ' page-wide' : (page === 'cart' || page === 'checkout') ? ' page-narrow' : '';
  const profileInfo = Store.users.find((x) => x.email === user.email) || {};
  const sidebarNav = USER_SIDEBAR_LINKS.map(([k, ico, label]) => `
      <a href="#" data-side-nav="${k}" class="user-sidebar-link${page === k ? ' active' : ''}">
        <span class="usi-ico">${UI_ICO[ico]()}</span><span class="usi-label">${label}</span>
      </a>`).join('');

  const header = `
    <div class="app">
      <header class="user-header">
        <div class="uh-left">
          <button class="user-menu-toggle" id="userMenuToggle" type="button" aria-label="Abrir o cerrar menú" aria-expanded="false">${UI_ICO.menuToggle(22)}</button>
        </div>
        <a class="brand uh-center" href="#" data-nav="home">
          <span class="brand-mark"><img class="brand-mark-img" src="assets/bar-intesud-logo.png" alt="Logo INTESUD"></span>
          <span class="brand-name">Bar INTESUD</span>
        </a>
        <div class="uh-right">
          <div class="user-search" id="userSearch">
            <button class="user-search-toggle" id="userSearchToggle" type="button" aria-label="Buscar productos" aria-expanded="false">${UI_ICO.search(20)}</button>
            <div class="user-search-open" id="userSearchBox">
              <span class="user-search-prefix">${UI_ICO.search(16)}</span>
              <input class="input user-search-input" id="headerSearch" placeholder="Buscar productos..." autocomplete="off">
              <button class="user-search-close" id="userSearchClose" type="button" aria-label="Cerrar búsqueda">${UI_ICO.close(16)}</button>
            </div>
          </div>
          <button class="header-icon-btn on-teal" data-nav="cart" title="Carrito">${UI_ICO.cart(20)}<span class="bubble ${cartCount ? 'show' : ''}" id="cartBubble">${cartCount}</span></button>
          <div class="user-chip on-teal" id="userMenu">
            <div class="avatar">${esc(initials(user.name))}</div>
            <span class="chip-info bold" style="color:#fff;font-size:var(--fs-sm)">${esc(user.name.split(' ')[0])}</span>
            <span class="chip-info" style="color:rgba(255,255,255,0.85);font-size:.7rem">${UI_ICO.chevron(15)}</span>
            <div class="dropdown-menu" id="userDropdown" style="display:none">
              <div class="dropdown-head">
                <div class="bold small">${esc(user.name)}</div>
                <div class="tiny muted">${esc(user.email)}</div>
              </div>
              <a class="dropdown-item" href="#" data-link="profile"><span class="dm-ico">${UI_ICO.profile(17)}</span>Mi perfil</a>
              <a class="dropdown-item" href="#" data-link="orders"><span class="dm-ico">${UI_ICO.orders(17)}</span>Mis pedidos</a>
              <a class="dropdown-item" href="#" data-link="changepass"><span class="dm-ico">${UI_ICO.lock(17)}</span>Cambio de contraseña</a>
              <div class="dropdown-sep"></div>
              <a class="dropdown-item danger" href="#" id="btnUserLogout"><span class="dm-ico">${UI_ICO.logout(17)}</span>Cerrar sesión</a>
            </div>
          </div>
        </div>
      </header>
      <div class="user-sidebar-scrim" id="userSidebarScrim"></div>
      <aside class="user-sidebar" id="userSidebar" aria-label="Navegación principal">
        <div class="user-sidebar-head">
          <span class="user-sidebar-logo"><img class="brand-mark-img" src="assets/bar-intesud-logo.png" alt="Logo INTESUD"></span>
          <span class="user-sidebar-title">Bar INTESUD</span>
        </div>
        <div class="user-sidebar-profile">
          <div class="avatar">${esc(initials(user.name))}</div>
          <div class="usp-info">
            <div class="bold ellipsis">${esc(user.name)}</div>
            <div class="muted xs ellipsis">${esc(profileInfo.cargo || ROLE_LABELS[user.role] || 'Usuario institucional')}</div>
          </div>
        </div>
        <nav class="user-sidebar-nav">${sidebarNav}</nav>
        <div class="user-sidebar-foot">
          <button class="user-sidebar-logout" id="btnSidebarLogout" type="button">${UI_ICO.logout(18)}<span>Cerrar sesión</span></button>
        </div>
      </aside>
      <main class="page${pageClasses}" id="mainContent"></main>
      <nav class="mobile-nav" id="mobileNav"></nav>
    </div>`;

  app.innerHTML = header;
  syncBodyClass();
  refreshCartBadge();

  renderMobileNav(page, app);

  // header nav binding
  $$('[data-nav]', app).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute(a.dataset.nav); });

  // Sidebar: drawer lateral controlado únicamente por el ☰ del header
  const sidebar = $('#userSidebar');
  const sidebarScrim = $('#userSidebarScrim');
  const toggleSidebar = (open) => {
    sidebar.classList.toggle('open', open);
    sidebarScrim.classList.toggle('open', open);
    $('#userMenuToggle').setAttribute('aria-expanded', String(open));
  };
  $('#userMenuToggle').onclick = (e) => { e.stopPropagation(); toggleSidebar(!sidebar.classList.contains('open')); };
  sidebarScrim.onclick = () => toggleSidebar(false);
  $$('[data-side-nav]', sidebar).forEach((a) => a.onclick = (e) => { e.preventDefault(); toggleSidebar(false); setRoute(a.dataset.sideNav); });
  $('#btnSidebarLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); syncBodyClass(); handleRoute(); };

  const ud = $('#userDropdown');
  $('#userMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $('#btnUserLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); syncBodyClass(); handleRoute(); };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'changepass') { changePasswordModal(); ud.style.display = 'none'; } else setRoute(t); });

  // Buscador desplegable (icono Search → campo)
  const setSearchOpen = (open) => {
    $('#userSearch').classList.toggle('open', open);
    $('#userSearchToggle').setAttribute('aria-expanded', String(open));
    if (open) $('#headerSearch').focus();
  };
  $('#userSearchToggle').onclick = (e) => { e.stopPropagation(); setSearchOpen(!$('#userSearch').classList.contains('open')); };
  $('#userSearchClose').onclick = () => { setSearchOpen(false); $('#headerSearch').value = ''; };
  const hs = $('#headerSearch');
  if (hs) hs.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && hs.value.trim()) {
      sessionStorage.setItem('int_search', hs.value.trim());
      setSearchOpen(false);
      setRoute('menu');
    }
    if (e.key === 'Escape') setSearchOpen(false);
  });

  const main = $('#mainContent');
  const renderers = {
    home: userHome,
    menu: userMenuPage,
    catalog: userMenuPage,
    orders: renderOrders,
    profile: renderProfile,
    product: userProductPage,
    cart: renderCart,
    checkout: renderCheckout,
  };
  if (renderers[page]) renderers[page](main);
}

function renderMobileNav(page, app) {
  const nav = $('#mobileNav', app);
  const items = [
    ['home', 'home', 'Inicio'], ['menu', 'menu', 'Menú'],
    ['cart', 'cart', 'Carrito'], ['orders', 'orders', 'Pedidos'],
  ];
  const cartCount = Cart.count();
  nav.innerHTML = `<div class="mn-grid">` + items.map(([k, ico, l]) => `
    <a class="mn-item ${page === k ? 'active' : ''}" href="#" data-nav="${k}">
      <span class="mn-ico">${UI_ICO[ico](20)}</span>${l}
      ${k === 'cart' && cartCount ? `<span class="mn-badge">${cartCount}</span>` : ''}
    </a>`).join('') + `</div>`;
  $$('[data-nav]', nav).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute(a.dataset.nav); });
}

/* ---------- Home (usuario) ---------- */
function userHome(el) {
  const cfg = Store.config;
  const cap = capacityInfo();
  const products = Store.products;
  const featured = products.filter((p) => p.available).slice(0, 4);
  const open = canPlaceOrder();

  let statusBanner = '';
  if (!open) {
    statusBanner = `<div class="alert danger"><span class="a-ico">⛔</span><div><div class="a-title">Cafetería cerrada.</div>Puedes ver el menú, pero no se aceptan pedidos en este momento<br>(Receso: ${cfg.breakStart} - ${cfg.breakEnd}).</div></div>`;
  } else if (cap.stateCls === 'warning') {
    statusBanner = `<div class="alert warning"><span class="a-ico">⚠️</span><div><div class="a-title">Alta demanda.</div>Tu pedido podría tardar más de lo habitual.</div></div>`;
  } else if (cap.stateCls === 'danger') {
    statusBanner = `<div class="alert danger"><span class="a-ico">📋</span><div><div class="a-title">Capacidad llena.</div>La capacidad de preparación está completa. Intenta más tarde.</div></div>`;
  }

  el.innerHTML = `
    <div class="page-title"><h1>¡Hola, ${esc(currentUser().name.split(' ')[0])}! 👋</h1>
      <span class="badge ${open ? 'badge-success' : 'badge-danger'}">${open ? '● ABIERTA' : '● CERRADA'}</span>
    </div>
    <p class="page-sub">Pide tu almuerzo o snack y retíralo durante el receso.</p>

    ${statusBanner}

    <div class="grid grid-2" style="margin-bottom:12px;grid-template-columns:1.4fr 1fr">
      <div class="card card-hover">
        <div class="card-header">
          <div><div class="card-title">Estado actual</div><div class="card-sub">Horario de la cafetería</div></div>
          <span class="badge ${cap.stateCls === 'danger' ? 'badge-danger' : cap.stateCls === 'warning' ? 'badge-warning' : 'badge-success'}">${cap.state}</span>
        </div>
        <div class="card-body" style="display:grid;gap:10px;font-size:var(--fs-md)">
          <div class="kv"><dt>Pedidos hasta</dt><dd>${cfg.orderClose}</dd></div>
          <div class="kv"><dt>Receso de entrega</dt><dd>${cfg.breakStart} - ${cfg.breakEnd}</dd></div>
          <div class="kv"><dt>Horario de pedidos</dt><dd>${cfg.orderOpen} - ${cfg.orderClose}</dd></div>
        </div>
      </div>
      <div id="homeCap"></div>
    </div>

    <h2 class="section-title">Categorías</h2>
    <div class="grid grid-3" style="margin-bottom:8px">
      ${CATEGORIES.map((c) => `<a class="cat-card" href="#" data-cat="${esc(c)}"><span class="cc-ico">${catIcon(c)}</span><div><div class="cc-name">${esc(c)}</div><div class="cc-count">${products.filter((p) => p.category === c).length} productos</div></div></a>`).join('')}
    </div>

    <div class="flex justify-between items-center" style="margin:26px 0 14px">
      <h2 class="section-title" style="margin:0">Productos destacados</h2>
      <a class="btn btn-outline btn-sm" href="#" data-nav="menu">Ver menú completo →</a>
    </div>
    <div class="grid grid-4" id="featuredGrid"></div>`;

  const capWrap = $('#homeCap');
  if (capWrap) renderCapacityCard(capWrap);

  const featuredEl = $('#featuredGrid');
  if (!featured.length) featuredEl.innerHTML = emptyState('🍽️', 'Sin productos', 'No hay productos disponibles por ahora.');
  featured.forEach((p) => featuredEl.appendChild(productCard(p, 'featured')));

  $$('[data-cat]', el).forEach((a) => a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('int_cat', a.dataset.cat); setRoute('menu'); });
}

/* ---------- Card de producto ---------- */
function productCard(p, size = '') {
  const soldOut = !p.available || p.stock === 0;
  const card = document.createElement('div');
  card.className = 'product-card' + (soldOut ? ' disabled' : '');
  card.innerHTML = `
    <div class="product-media">
      ${catIcon(p.category) ? `<span class="p-cat badge badge-primary">${catIcon(p.category)} ${esc(p.category.split(' ')[0])}</span>` : ''}
      ${productIcon(p)}
      ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
    </div>
    <div class="product-body">
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-desc">${esc(p.desc)}</div>
      <div class="product-foot">
        <span class="product-price">${money(p.price)}</span>
        <span class="prep-tag">⏱ ${p.prepMin} min</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm ${soldOut ? '' : 'btn-outline'}" style="flex:1" ${soldOut ? 'disabled' : ''} data-view="${p.id}">Ver</button>
        <button class="btn btn-sm btn-primary" style="flex:1" ${soldOut ? 'disabled' : ''} ${canPlaceOrder() ? '' : 'disabled'} data-add="${p.id}">${soldOut ? 'Agotado' : '+ Agregar'}</button>
      </div>
    </div>`;

  const view = $('[data-view]', card);
  if (view) view.onclick = () => setRoute('product/' + p.id);
  const add = $('[data-add]', card);
  if (add && !soldOut) {
    add.onclick = () => {
      if (!canPlaceOrder()) { toast('La cafetería está cerrada. No se aceptan pedidos.', 'warning'); return; }
      const res = Cart.add(p, 1, [], '');
      if (res.ok) toast(p.name + ' agregado al carrito.', 'success');
      else toast(res.msg, 'warning');
    };
  }
  return card;
}

/* ---------- Menú ---------- */
const params = { product: null, cat: null };

function userMenuPage(el) {
  const products = Store.products;
  let activeCat = sessionStorage.getItem('int_cat') || 'Todas';
  let search = sessionStorage.getItem('int_search') || '';
  sessionStorage.removeItem('int_search');
  sessionStorage.removeItem('int_cat');

  el.innerHTML = `
    <div class="page-title"><h1>Menú</h1><span class="badge badge-primary" id="menuCount"></span></div>
    <p class="page-sub">Elige lo que quieras y agrégalo a tu carrito.</p>

    <div class="menu-layout">
      <aside class="menu-filters" id="menuFilters"></aside>
      <div>
        <div class="input-wrap" style="margin-bottom:18px;max-width:360px">
          <span class="leading-ico">🔍</span>
          <input class="input" id="menuSearch" placeholder="Buscar producto..." value="${esc(search)}">
          ${search ? '' : ''}
        </div>
        <div class="chips-scroll" style="margin-bottom:20px" id="menuChips"></div>
        <div id="menuGrid" class="grid grid-4"></div>
      </div>
    </div>`;

  const renderFilters = () => {
    const wrap = $('#menuFilters');
    const cats = ['Todas', ...CATEGORIES];
    const countFor = (c) => c === 'Todas' ? products.length : products.filter((p) => p.category === c).length;
    wrap.innerHTML = cats.map((c) => `
      <button class="menu-filter-btn ${activeCat === c ? 'active' : ''}" data-cat="${esc(c)}">
        ${c === 'Todas' ? '🍽️' : catIcon(c)} ${esc(c)}
        <span class="mf-count">${countFor(c)}</span>
      </button>`).join('');
    $$('[data-cat]', wrap).forEach((c) => c.onclick = () => {
      $$('[data-cat]', wrap).forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
      activeCat = c.dataset.cat;
      render();
    });
  };

  const render = () => {
    let list = products;
    if (activeCat !== 'Todas') list = list.filter((p) => p.category === activeCat);
    if (search) list = list.filter((p) => (p.name + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(search.toLowerCase()));
    const grid = $('#menuGrid');
    $('#menuCount').textContent = list.length + ' productos';
    $('#menuCount').classList.toggle('badge-primary', list.length > 0);
    if (!list.length) { grid.innerHTML = emptyState('🔍', 'Sin resultados', 'No encontramos productos con ese criterio.'); return; }
    grid.innerHTML = '';
    list.forEach((p) => grid.appendChild(productCard(p)));
  };

  $('#menuSearch').addEventListener('input', (e) => { search = e.target.value; render(); });
  renderFilters();
  render();
}

/* ---------- Detalle de producto ---------- */
const ADDONS = {
  'Hamburguesas': [{ name: 'Doble carne', price: 1.00 }, { name: 'Tocineta', price: 0.80 }, { name: 'Queso extra', price: 0.60 }, { name: 'Huevo', price: 0.50 }],
  'Hot Dogs': [{ name: 'Tocineta', price: 0.60 }, { name: 'Queso extra', price: 0.50 }, { name: 'Papitas', price: 0.40 }],
  'Sándwiches': [{ name: 'Huevo extra', price: 0.50 }, { name: 'Queso extra', price: 0.50 }],
  'Papas y Salchipapas': [{ name: 'Queso extra', price: 0.60 }, { name: 'Salsa adicional', price: 0.30 }],
  'Bebidas': [],
  'Snacks': [],
};

function userProductPage(el) {
  const p = Store.products.find((x) => x.id === params.product);
  if (!p) { setRoute('menu'); return; }
  const soldOut = !p.available || p.stock === 0;
  const addons = ADDONS[p.category] || [];
  const maxQty = p.stock;

  el.innerHTML = `
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="setRoute('menu')">← Volver al menú</button>
    <div class="card card-flush" style="overflow:hidden">
      <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:0" class="prod-detail">
        <div class="product-media" style="height:100%;min-height:340px;font-size:5.5rem;align-items:center">
          ${productIcon(p)}
          ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
        </div>
        <div style="padding:var(--sp-6)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span class="badge badge-primary">${catIcon(p.category)} ${esc(p.category)}</span>
            ${p.stock === 0 ? '<span class="badge badge-danger">AGOTADO</span>' : p.stock <= p.minStock ? '<span class="badge badge-warning">Stock bajo</span>' : `<span class="badge badge-success">Disponible · ${p.stock} restantes</span>`}
          </div>
          <h1>${esc(p.name)}</h1>
          <p class="muted" style="margin:10px 0 18px;max-width:520px">${esc(p.desc)}</p>
          <div style="display:flex;gap:24px;align-items:center;margin-bottom:24px">
            <span style="font-size:2rem;font-weight:800;color:var(--primary-strong)">${money(p.price)}</span>
            <span class="small muted">⏱ Tiempo estimado: <b>${p.prepMin} min</b></span>
          </div>

          <div class="field"><label class="label">Cantidad (máx ${p.stock || 0})</label>
            <div class="qty-stepper">
              <button id="qdDec">−</button><span class="qty-val" id="qdVal">1</span><button id="qdInc">+</button>
            </div>
          </div>

          ${addons.length ? `
          <div class="field">
            <label class="label">Adicionales</label>
            <div id="addonList" style="display:flex;flex-direction:column;gap:10px">
              ${addons.map((a, i) => `<label class="checkbox-row"><input type="checkbox" data-addon="${i}"> <span>${esc(a.name)}</span> <span class="muted-3">(+${money(a.price)})</span></label>`).join('')}
            </div>
          </div>` : ''}

          <div class="field"><label class="label">Observaciones</label><textarea class="input" id="prodNote" placeholder="Ej: sin cebolla, extra salsa..."></textarea></div>

          ${!canPlaceOrder() ? `<div class="alert danger" style="margin:14px 0"><span class="a-ico">⛔</span><div><div class="a-title">La cafetería está cerrada.</div>Puedes ver el menú pero no realizar pedidos.</div></div>` : ''}

          <button class="btn btn-primary btn-lg btn-block" id="btnAdd" ${soldOut || !canPlaceOrder() ? 'disabled' : ''}>
            ${soldOut ? 'Producto agotado' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>`;

  let qty = 1;
  const qv = $('#qdVal');
  const setBtnState = () => { $('#qdDec').disabled = qty <= 1; $('#qdInc').disabled = qty >= maxQty; };
  setBtnState();
  $('#qdInc').onclick = () => { if (qty < maxQty) { qty++; qv.textContent = qty; setBtnState(); } else toast('Stock máximo: ' + maxQty, 'warning'); };
  $('#qdDec').onclick = () => { if (qty > 1) { qty--; qv.textContent = qty; setBtnState(); } };

  $('#btnAdd').onclick = () => {
    const addonsSel = $$('#addonList input:checked').map((c) => addons[parseInt(c.dataset.addon)]);
    const note = $('#prodNote').value.trim();
    const res = Cart.add(p, qty, addonsSel, note);
    if (res.ok) { toast(p.name + ' agregado al carrito.', 'success'); setRoute('cart'); }
    else toast(res.msg, 'warning');
  };
}

/* ---------- Inicialización ---------- */
function syncBodyClass() {
  // El Landing público no convive con las clases de shell internas.
  document.body.classList.remove('is-landing');
  const u = currentUser();
  if (u && (u.role === 'adminbar' || u.role === 'admindev')) {
    document.body.classList.add('is-admin');
    document.body.classList.remove('has-bottom-nav');
  } else if (u) {
    document.body.classList.add('has-bottom-nav');
    document.body.classList.remove('is-admin');
  } else {
    document.body.classList.remove('has-bottom-nav', 'is-admin');
  }
}
window.syncBodyClass = syncBodyClass;

window.onhashchange = handleRoute;

window.addEventListener('DOMContentLoaded', () => {
  syncBodyClass();
  handleRoute();
});
