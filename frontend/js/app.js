/* ============================================================
   app.js — Enrutador, navegación por rol y páginas del usuario
   Cafetería INTESUD · Sistema de diseño v2
   ============================================================ */

function currentUser() { return Auth.current(); }
window.currentUser = currentUser;

function clientIcon(name, extra = '') {
  const icons = {
    search: 'bx-search', cart: 'bx-cart', user: 'bx-user', orders: 'bx-receipt', lock: 'bx-lock-alt',
    logout: 'bx-log-out', home: 'bx-grid-alt', menu: 'bx-food-menu', warning: 'bx-error', danger: 'bx-error-circle',
    capacity: 'bx-gauge', food: 'bx-restaurant', clock: 'bx-time', empty: 'bx-package', delivery: 'bx-cycling',
    pickup: 'bx-store', location: 'bx-map', mobile: 'bx-mobile-alt', transfer: 'bx-transfer-alt', cash: 'bx-money',
    clip: 'bx-paperclip', check: 'bx-check-circle', celebrate: 'bx-party', back: 'bx-arrow-back',
  };
  return `<i class="bx ${icons[name] || icons.food}" aria-hidden="true" ${extra}></i>`;
}
window.clientIcon = clientIcon;

function clientCatIcon(category) {
  const icons = {
    Hamburguesas: 'food', 'Hot Dogs': 'food', Sándwiches: 'food', 'Papas y Salchipapas': 'food',
    Bebidas: 'food', Snacks: 'food',
  };
  return clientIcon(icons[category] || 'food');
}
window.clientCatIcon = clientCatIcon;

function clientProductIcon(product) {
  return clientCatIcon(product.category);
}
window.clientProductIcon = clientProductIcon;

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

// Se agregan aliases en español según especificación del proyecto.
 function resolveAlias(r) {
   // normalizar
   r = r.replace(/^\//, '');
   // español -> interno
   const alias = {
     '': 'landing',
     'inicio': 'home',
     'menu': 'menu',
     'catalogo': 'menu',
     'producto': 'product',
     'carrito': 'cart',
     'checkout': 'checkout',
     'pedidos': 'orders',
     'perfil': 'profile',
     'recuperar': 'forgot',
     'verificar': 'forgot',
     'nueva-contrasena': 'forgot',
     'admin': 'adminbar/dashboard',
     'admin/pedidos': 'adminbar/orders',
     'admin/pedidos-listos': 'adminbar/orders',
     'admin/preparacion': 'adminbar/dashboard',
     'admin/productos': 'adminbar/products',
     'admin/stock': 'adminbar/stock',
     'admin/pagos': 'adminbar/payments',
     'admin/ventas': 'adminbar/sales',
     'admin/delivery': 'adminbar/delivery',
     'admin/configuracion': 'adminbar/config',
     'developer': 'admindev/dashboard',
     'developer/usuarios': 'admindev/users',
     'developer/roles': 'admindev/roles',
     'developer/permisos': 'admindev/roles',
     'developer/auditoria': 'admindev/auditoria',
     'developer/configuracion': 'admindev/config',
   };
   if (alias[r] !== undefined) return alias[r];
   if (r.startsWith('producto/')) return r.replace('producto/', 'product/');
   if (r.startsWith('pedidos/')) return 'orders';
   if (r.startsWith('admin/')) return r.replace('admin/', 'adminbar/');
   if (r.startsWith('developer/')) return r.replace('developer/', 'admindev/');
   if (r === 'usuario') return 'home';
   if (r.startsWith('usuario/')) return r.slice('usuario/'.length) || 'home';
   if (r === 'bar') return 'adminbar/dashboard';
   if (r.startsWith('bar/')) return 'adminbar/' + r.slice('bar/'.length);
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

  // Cada ruta parte de un estado visual limpio. Antes, al cerrar sesion,
  // el login/landing heredaba clases del panel anterior y algunos textos
  // quedaban blancos sobre superficies claras.
  document.body.classList.remove('is-landing', 'is-auth');
  syncBodyClass();

  // Páginas públicas
  if (r === 'landing') return renderLanding();
  if (r === 'login') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    document.body.classList.add('is-auth');
    return renderLogin();
  }
  if (r === 'forgot') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    document.body.classList.add('is-auth');
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

  // --- Inicio: verificaciones de permiso granular por rol ---
  // Para roles conocidos (adminbar/admindev), no forzar redirect por rol;
  // permitir acceso a home + control por permisos detallados.
  const isKnownAdmin = ['adminbar', 'admindev'].includes(user.role);
  if (isKnownAdmin && routeTargetRole(r) !== user.role && routeTargetRole(r) !== 'public') {
    setRoute(homeRouteFor(user.role));
    return;
  }
  // Si es rol personalizado intentando entrar a admin, verificar permiso básico
  if (!isKnownAdmin && r.startsWith('admin')) {
    // requiere al menos dashboard.view o users.view para entrar a admindev
    const need = r.startsWith('admindev') ? 'dashboard.view' : 'orders.view_all';
    if (typeof can === 'function' && !can(need) && user.role !== 'admindev') {
      toast('Acceso denegado: sin permiso '+need, 'error');
      setRoute('home');
      return;
    }
  }
  // --- Fin: verificaciones de permiso granular por rol ---

  // Separación por rol: cada rol vive en su propia interfaz.
  if (routeTargetRole(r) !== user.role) {
    setRoute(homeRouteFor(user.role));
    return;
  }

  if (r.startsWith('adminbar')) {
    const section = r.split('/')[1];
    if (section === 'payment-detail') {
      return renderBarAdmin('payment-detail', r.split('/')[2]);
    }
    if (section === 'sales-dashboard') {
      return renderBarAdmin('sales-dashboard');
    }
    if (section === 'sales-history') {
      return renderBarAdmin('sales-history');
    }
    if (section === 'config-hours') {
      return renderBarAdmin('config-hours');
    }
    if (section === 'config-status') {
      return renderBarAdmin('config-status');
    }
    return renderBarAdmin(section || 'dashboard');
  }
  if (r.startsWith('admindev')) return renderDevAdmin(r.split('/')[1] || 'dashboard');

  renderUserShell(r);
}
window.handleRoute = handleRoute;

/* ---------- User shell (header + main + mobile nav) ---------- */
function renderUserShell(page) {
  const app = $('#app');
  const user = currentUser();
  const cartCount = Cart.count();

  const header = `
    <div class="app">
      <header class="user-header">
        <a class="brand" href="#" data-nav="home">
          <span class="brand-mark"><img class="brand-mark-img" src="assets/intesud-white-mark.png" alt="Logo INTESUD"></span>
          <span class="brand-name">Bar INTESUD<span class="brand-sub">Pedidos en línea</span></span>
        </a>
        <div class="header-actions">
          <div class="header-search">
            <span class="ico">${clientIcon('search')}</span>
            <input class="input" id="headerSearch" placeholder="Buscar producto..." autocomplete="off">
          </div>
          <button class="header-icon-btn" onclick="setRoute('cart')" title="Carrito">${clientIcon('cart')}<span class="bubble ${cartCount ? 'show' : ''}" id="cartBubble">${cartCount}</span></button>
          <div class="user-chip" id="userMenu">
            <div class="avatar">${esc(initials(user.name))}</div>
            <span class="chip-info bold" style="font-size:var(--fs-sm)">${esc(user.name.split(' ')[0])}</span>
            <span class="chip-info" style="color:var(--text-3);font-size:.7rem">▾</span>
            <div class="dropdown-menu" id="userDropdown" style="display:none">
              <div class="dropdown-head">
                <div class="bold small">${esc(user.name)}</div>
                <div class="tiny muted">${esc(user.email)}</div>
              </div>
              <a class="dropdown-item" href="#" data-link="profile"><span class="dm-ico">${clientIcon('user')}</span>Mi perfil</a>
              <a class="dropdown-item" href="#" data-link="orders"><span class="dm-ico">${clientIcon('orders')}</span>Mis pedidos</a>
              <a class="dropdown-item" href="#" data-link="changepass"><span class="dm-ico">${clientIcon('lock')}</span>Cambio de contraseña</a>
              <div class="dropdown-sep"></div>
              <a class="dropdown-item danger" href="#" id="btnUserLogout"><span class="dm-ico">${clientIcon('logout')}</span>Cerrar sesión</a>
            </div>
          </div>
        </div>
      </header>
      <main class="page${page === 'product' ? ' page-wide' : page === 'cart' ? ' page-narrow' : page === 'checkout' ? ' page-narrow' : ''}" id="mainContent"></main>
      <nav class="mobile-nav" id="mobileNav"></nav>
    </div>`;

  app.innerHTML = header;
  syncBodyClass();
  refreshCartBadge();

  renderMobileNav(page, app);

  // header nav binding
  $$('[data-nav]', app).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute(a.dataset.nav); });

  const ud = $('#userDropdown');
  $('#userMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $('#btnUserLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); syncBodyClass(); handleRoute(); };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'changepass') { changePasswordModal(); ud.style.display = 'none'; } else setRoute(t); });

  // header search → go to menu with query
  const hs = $('#headerSearch');
  if (hs) hs.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && hs.value.trim()) {
      sessionStorage.setItem('int_search', hs.value.trim());
      setRoute('menu');
    }
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
    ['home', clientIcon('home'), 'Inicio'], ['menu', clientIcon('menu'), 'Menú'],
    ['cart', clientIcon('cart'), 'Carrito'], ['orders', clientIcon('orders'), 'Pedidos'],
  ];
  const cartCount = Cart.count();
  nav.innerHTML = `<div class="mn-grid">` + items.map(([k, ico, l]) => `
    <a class="mn-item ${page === k ? 'active' : ''}" href="#" data-nav="${k}">
      <span class="mn-ico">${ico}</span>${l}
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
    statusBanner = `<div class="alert danger"><span class="a-ico">${clientIcon('danger')}</span><div><div class="a-title">Cafetería cerrada.</div>Puedes ver el menú, pero no se aceptan pedidos en este momento<br>(Receso: ${cfg.breakStart} - ${cfg.breakEnd}).</div></div>`;
  } else if (cap.stateCls === 'warning') {
    statusBanner = `<div class="alert warning"><span class="a-ico">${clientIcon('warning')}</span><div><div class="a-title">Alta demanda.</div>Tu pedido podría tardar más de lo habitual.</div></div>`;
  } else if (cap.stateCls === 'danger') {
    statusBanner = `<div class="alert danger"><span class="a-ico">${clientIcon('capacity')}</span><div><div class="a-title">Capacidad llena.</div>La capacidad de preparación está completa. Intenta más tarde.</div></div>`;
  }

  el.innerHTML = `
    <div class="page-welcome">
      <div class="home-hero">
        <span class="hh-photo"></span>
        <div class="hh-inner">
          <div class="hh-copy">
            <span class="hh-eyebrow">${clientIcon('food')} Bar INTESUD</span>
            <div class="hh-welcome">BIENVENIDO ESTUDIANTE</div>
            <h1>Tu comida, <span class="hl">lista para el receso</span>.</h1>
            <p class="hh-sub">Pídelo en segundos y recógelo calientito en la bar o que te lo lleven a tu aula.</p>
            <div class="hh-actions">
              <a class="hh-btn" href="#" data-nav2="menu">${clientIcon('menu')} Ver el menú</a>
              <a class="hh-btn ghost" href="#" data-nav2="cart">${clientIcon('cart')} Mi pedido</a>
            </div>
            <div class="hh-status">
              <span class="dot" style="background:${open ? '#7df0b0' : '#ffb0a8'}"></span>
              ${open ? 'Abierto · aceptando pedidos' : 'Cerrado ahora — mira el menú igual'}
            </div>
          </div>

        </div>
      </div>
    </div>

    ${statusBanner}

    <div class="cat-banner">
      <div class="cat-banner-inner">
        <div class="cat-banner-left">
          <div class="cat-s"><img src="assets/intesud-white-mark.png" alt="Logo oficial INTESUD"></div>
          <div class="cat-titles">
            <div class="cat-title"><span class="cat-t-white">¿QUÉ SE TE</span><br><span class="cat-t-teal">ANTOJA HOY?</span></div>
            <div class="cat-sub">Elige tu antojo favorito <span class="cat-sub-line"></span></div>
          </div>
        </div>
        <div class="cat-banner-deco" aria-hidden="true"></div>
      </div>
      <div class="cat-pills">
        ${CATEGORIES.map((c) => {
          const n = products.filter((p) => p.category === c).length;
          return `<a class="cat-pill-card" href="#" data-cat="${esc(c)}"><span class="cp-ico">${clientCatIcon(c)}</span><div><div class="cp-name">${esc(c)}</div><div class="cp-count"><span class="cp-badge">${n}</span> opciones</div></div></a>`;
        }).join('')}
      </div>
    </div>

    <div class="reco-head">
      <h2 class="reco-title">RECOMENDADOS DE HOY</h2>
      <a class="reco-btn" href="#" data-nav="menu">Ver menú completo →</a>
    </div>
    <div class="reco-grid" id="featuredGrid"></div>`;

  $$('[data-nav2]', el).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute(a.dataset.nav2); });

  const featuredEl = $('#featuredGrid');
  if (!featured.length) featuredEl.innerHTML = emptyState(clientIcon('empty'), 'Sin productos', 'No hay productos disponibles por ahora.');
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
      <span class="pc-dots"></span>
      <span class="pc-wave"></span>
      <span class="p-emoji">${clientProductIcon(p)}</span>
      ${clientCatIcon(p.category) ? `<span class="p-cat badge badge-primary">${clientCatIcon(p.category)} ${esc(p.category)}</span>` : ''}
      ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
    </div>
    <div class="product-body">
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-desc">${esc(p.desc)}</div>
      <div class="product-foot">
        <span class="product-price">${money(p.price)}</span>
        <span class="prep-tag">${clientIcon('clock')} ${p.prepMin} min</span>
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
    <div class="menu-page">
      <div class="menu-lead">
        <div>
          <div class="ml-title">Nuestro <span>menú</span></div>
          <div class="ml-sub">Todo rico y recién preparado en la cafetería.</div>
        </div>
        <span class="ml-badge" id="menuCount"></span>
      </div>

      <div class="menu-layout">
        <aside class="menu-side">
          <div class="menu-side-head">
            <span class="menu-side-title">Categorías</span>
          </div>
          <div id="menuChips" class="menu-side-list"></div>
        </aside>
        <div class="menu-main">
          <div class="menu-toolbar">
            <div class="mt-search">
              <span class="leading-ico">${clientIcon('search')}</span>
              <input class="input" id="menuSearch" placeholder="Buscar en el menú..." value="${esc(search)}">
            </div>
          </div>
          <div id="menuGrid" class="grid grid-3"></div>
        </div>
      </div>
    </div>`;

  const renderChips = () => {
    const wrap = $('#menuChips');
    const cats = ['Todas', ...CATEGORIES];
    const countFor = (c) => c === 'Todas' ? products.length : products.filter((p) => p.category === c).length;
    wrap.innerHTML = cats.map((c) => `
      <button class="cat-pill ${activeCat === c ? 'active' : ''}" data-cat="${esc(c)}">
        <span class="cp-ico">${clientCatIcon(c)}</span>
        <span class="cp-name">${esc(c)}</span>
        <span class="cp-badge">${countFor(c)}</span>
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
    const mc = $('#menuCount');
    if (mc) mc.textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
    if (!list.length) { grid.innerHTML = emptyState(clientIcon('search'), 'Sin resultados', 'No encontramos productos con ese criterio.'); return; }
    grid.innerHTML = '';
    list.forEach((p) => grid.appendChild(productCard(p)));
  };

  $('#menuSearch').addEventListener('input', (e) => { search = e.target.value; render(); });
  renderChips();
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
          ${clientProductIcon(p)}
          ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
        </div>
        <div style="padding:var(--sp-6)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span class="badge badge-primary">${clientCatIcon(p.category)} ${esc(p.category)}</span>
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

          ${!canPlaceOrder() ? `<div class="alert danger" style="margin:14px 0"><span class="a-ico">${clientIcon('danger')}</span><div><div class="a-title">La cafetería está cerrada.</div>Puedes ver el menú pero no realizar pedidos.</div></div>` : ''}

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
    document.body.classList.toggle('is-adminbar', u.role === 'adminbar');
    document.body.classList.toggle('is-admindev', u.role === 'admindev');
    document.body.classList.remove('has-bottom-nav');
  } else if (u) {
    document.body.classList.add('has-bottom-nav');
    document.body.classList.remove('is-admin', 'is-adminbar', 'is-admindev');
  } else {
    document.body.classList.remove('has-bottom-nav', 'is-admin', 'is-adminbar', 'is-admindev');
  }
}
window.syncBodyClass = syncBodyClass;

window.onhashchange = handleRoute;

window.addEventListener('DOMContentLoaded', () => {
  syncBodyClass();
  handleRoute();
});
