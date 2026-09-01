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
  if (r === 'landing' || r === 'login' || r === 'forgot') return 'public';
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
  let raw = (window.location.hash || '').replace('#', '');
  // hash vacío -> landing para no autenticados, home para autenticados
  let r = raw;
  if (!r) r = user ? homeRouteFor(user.role) : 'landing';
  params.product = null;

  // Páginas públicas (accesibles sin sesión)
  if (r === 'landing') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    return renderLanding();
  }
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

  // landing después de alias también debe respetarse
  if (r === 'landing') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    return renderLanding();
  }
  if (r === 'login') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    return renderLogin();
  }
  if (r === 'forgot') {
    if (user) { setRoute(homeRouteFor(user.role)); return; }
    return renderForgot();
  }

  if (r.startsWith('product/')) {
    params.product = r.split('/')[1];
    r = 'product';
  }

  if (!user) { setRoute('landing'); return; }

  // Separación por rol: cada rol vive en su propia interfaz.
  // Para roles personalizados, no forzar redirect por rol; permitir home + control por permisos granulares
  const isKnownAdmin = ['adminbar','admindev'].includes(user.role);
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

  if (r.startsWith('adminbar')) return renderBarAdmin(r.split('/')[1] || 'dashboard');
  if (r.startsWith('admindev')) {
    // Guard granular por sección dentro de admindev
    const sec = r.split('/')[1] || 'dashboard';
    const needMap = { dashboard:'dashboard.view', users:'users.view', roles:'roles.view', audit:'audit.view', cafe:'cafe.view', config:'config.view', design:'dashboard.view' };
    const need = needMap[sec];
    if (need && typeof can === 'function' && !can(need)) {
      // No romper: mostrar mensaje en lugar de pantalla en blanco
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.innerHTML = `<div class="admin-layout dev-layout"><div class="admin-main"><div class="admin-content"><div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:32px"><div style="font-size:2rem">🔒</div><h2>Acceso denegado</h2><p class="muted">Tu rol <b>${esc(user.role)}</b> no tiene permiso <code>${esc(need)}</code> para ver <b>${esc(sec)}</b>.</p><p class="tiny muted">Contacta al administrador para que active el permiso en Roles y permisos.</p><button class="btn btn-primary" onclick="setRoute('admindev/dashboard')">Volver al dashboard</button></div></div></div></div>`;
        return;
      }
      toast('Acceso denegado: falta '+need, 'error');
      setRoute('admindev/dashboard');
      return;
    }
    return renderDevAdmin(sec);
  }

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
        <a class="brand" href="#" data-nav="home" aria-label="Cafetería INTESUD inicio">
          <span class="brand-mark" style="background:linear-gradient(140deg,var(--primary),var(--primary-strong))">${svgIcon('coffee')}</span>
          <span class="brand-name">Cafetería INTESUD<span class="brand-sub">Pedidos en línea</span></span>
        </a>
        <nav class="user-nav" aria-label="Navegación principal">
          <a class="nav-link ${page==='home'?'active':''}" href="#" data-nav="home"><span class="nav-ico">${svgIcon('home')}</span>Inicio</a>
          <a class="nav-link ${page==='menu'?'active':''}" href="#" data-nav="menu"><span class="nav-ico">${svgIcon('menu')}</span>Menú</a>
          <a class="nav-link ${page==='orders'?'active':''}" href="#" data-nav="orders"><span class="nav-ico">${svgIcon('orders')}</span>Pedidos</a>
        </nav>
        <div class="header-actions">
          <div class="header-search">
            <span class="ico">${svgIcon('search')}</span>
            <input class="input" id="headerSearch" placeholder="Buscar producto..." autocomplete="off" aria-label="Buscar producto">
          </div>
          <button class="header-icon-btn" onclick="setRoute('cart')" title="Carrito" aria-label="Carrito">${svgIcon('cart')}<span class="bubble ${cartCount ? 'show' : ''}" id="cartBubble">${cartCount}</span></button>
          <div class="user-chip" id="userMenu" role="button" tabindex="0" aria-haspopup="true">
            <div class="avatar">${esc(initials(user.name))}</div>
            <span class="chip-info bold" style="font-size:var(--fs-sm)">${esc(user.name.split(' ')[0])}</span>
            <span class="chip-info" style="color:var(--text-3);font-size:.7rem">▾</span>
            <div class="dropdown-menu" id="userDropdown" style="display:none">
              <div class="dropdown-head">
                <div class="bold small">${esc(user.name)}</div>
                <div class="tiny muted">${esc(user.email)}</div>
              </div>
              <a class="dropdown-item" href="#" data-link="profile"><span class="dm-ico">${svgIcon('user')}</span>Mi perfil</a>
              <a class="dropdown-item" href="#" data-link="orders"><span class="dm-ico">${svgIcon('orders')}</span>Mis pedidos</a>
              <a class="dropdown-item" href="#" data-link="changepass"><span class="dm-ico">${svgIcon('orders')}</span>Cambio de contraseña</a>
              <div class="dropdown-sep"></div>
              <a class="dropdown-item danger" href="#" id="btnUserLogout"><span class="dm-ico">${svgIcon('x')}</span>Cerrar sesión</a>
            </div>
          </div>
        </div>
      </header>
      <main class="page${page === 'product' ? ' page-wide' : page === 'cart' ? ' page-narrow' : page === 'checkout' ? ' page-narrow' : ''}" id="mainContent"></main>
      <nav class="mobile-nav" id="mobileNav" aria-label="Navegación móvil"></nav>
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
    ['home', 'home', 'Inicio'], ['menu', 'grid', 'Menú'],
    ['cart', 'cart', 'Carrito'], ['orders', 'orders', 'Pedidos'], ['profile', 'user', 'Perfil'],
  ];
  const cartCount = Cart.count();
  nav.innerHTML = `<div class="mn-grid">` + items.map(([k, ic, l]) => `
    <a class="mn-item ${page === k ? 'active' : ''}" href="#" data-nav="${k}" aria-label="${l}">
      <span class="mn-ico">${svgIcon(ic)}</span>${l}
      ${k === 'cart' && cartCount ? `<span class="mn-badge">${cartCount}</span>` : ''}
    </a>`).join('') + `</div>`;
  $$('[data-nav]', nav).forEach((a) => a.onclick = (e) => { e.preventDefault(); const tgt = a.dataset.nav; if (tgt==='profile') setRoute('profile'); else setRoute(tgt); });
}

/* ---------- Home (usuario) ---------- */
function userHome(el) {
  const cfg = Store.config;
  const cap = capacityInfo();
  const products = Store.products;
  const featured = products.filter((p) => p.available).slice(0, 4);
  const open = canPlaceOrder();
  const firstName = esc(currentUser().name.split(' ')[0]);

  let statusBanner = '';
  if (!open) {
    statusBanner = `<div class="alert danger"><span class="a-ico">${svgIcon('alert')}</span><div><div class="a-title">Cafetería cerrada.</div>Puedes ver el menú, pero no se aceptan pedidos en este momento<br>(Receso: ${cfg.breakStart} - ${cfg.breakEnd}).</div></div>`;
  } else if (cap.stateCls === 'warning') {
    statusBanner = `<div class="alert warning"><span class="a-ico">${svgIcon('alert')}</span><div><div class="a-title">Alta demanda.</div>Tu pedido podría tardar más de lo habitual.</div></div>`;
  } else if (cap.stateCls === 'danger') {
    statusBanner = `<div class="alert danger"><span class="a-ico">${svgIcon('alert')}</span><div><div class="a-title">Capacidad llena.</div>La capacidad de preparación está completa. Intenta más tarde.</div></div>`;
  }

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:2px">
      <div>
        <h1 style="font-size:1.9rem;line-height:1.1;letter-spacing:-0.02em">Hola, ${firstName} <span style="color:var(--primary)">👋</span></h1>
        <p class="muted" style="margin-top:2px;font-size:var(--fs-md)">¿Qué te gustaría comer hoy?</p>
      </div>
      <span class="badge ${open ? 'badge-success' : 'badge-danger'}">${open ? '● Abierta' : '● Cerrada'}</span>
    </div>

    <!-- Buscador grande -->
    <div class="home-search-wrap" style="margin:12px 0 14px">
      <div class="input-wrap" style="max-width:640px">
        <span class="leading-ico">${svgIcon('search')}</span>
        <input class="input" id="homeSearch" placeholder="Buscar hamburguesas, café, snacks..." autocomplete="off" style="padding:13px 16px 13px 44px;border-radius:var(--r-pill);font-size:var(--fs-md);box-shadow:var(--shadow-sm)">
      </div>
      <div class="tiny muted" style="margin-top:6px">Pedidos hasta ${cfg.orderClose} · Receso ${cfg.breakStart}–${cfg.breakEnd}</div>
    </div>

    ${statusBanner}

    <div class="grid grid-2" style="margin:12px 0 18px;grid-template-columns:1.35fr 1fr;gap:14px">
      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-header" style="padding:14px 18px">
          <div><div class="card-title" style="font-size:1rem">Horario de hoy</div><div class="card-sub">Planea tu receso</div></div>
          <span class="tiny muted">${cap.pct}% capacidad</span>
        </div>
        <div class="card-body" style="display:grid;gap:8px;font-size:var(--fs-md);padding:14px 18px">
          <div class="kv" style="font-size:0.9rem"><dt>Pedidos</dt><dd>${cfg.orderOpen} – ${cfg.orderClose}</dd></div>
          <div class="kv" style="font-size:0.9rem"><dt>Entrega</dt><dd>${cfg.breakStart} – ${cfg.breakEnd}</dd></div>
          <div class="kv" style="font-size:0.9rem"><dt>Capacidad</dt><dd>${cap.used}/${cap.total}</dd></div>
        </div>
      </div>
      <div id="homeCap"></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <h2 class="section-title" style="margin:0">Categorías</h2>
      <a class="small muted" href="#" data-nav="menu" style="font-weight:600;color:var(--primary)">Ver todo</a>
    </div>
    <div class="grid grid-3" style="margin-bottom:12px">
      ${CATEGORIES.map((c) => {
        const count = products.filter((p) => p.category === c).length;
        return `<a class="cat-card" href="#" data-cat="${esc(c)}"><span class="cc-ico">${svgIcon(catSvg(c))}</span><div><div class="cc-name">${esc(c)}</div><div class="cc-count">${count} productos</div></div><span style="margin-left:auto;color:var(--text-3)">${svgIcon('chevronRight')}</span></a>`;
      }).join('')}
    </div>

    <div class="flex justify-between items-center" style="margin:16px 0 12px">
      <h2 class="section-title" style="margin:0">Productos destacados</h2>
      <a class="btn btn-outline btn-sm" href="#" data-nav="menu">Ver menú completo ${svgIcon('chevronRight')}</a>
    </div>
    <div class="grid grid-4" id="featuredGrid"></div>`;

  const capWrap = $('#homeCap');
  if (capWrap) {
    renderCapacityCard(capWrap);
    // Evitar duplicar alerta: capacidad ya muestra barra, top banner es la única alerta
    if (statusBanner) {
      const dup = capWrap.querySelector('.alert');
      if (dup) dup.remove();
    }
  }

  const featuredEl = $('#featuredGrid');
  if (!featured.length) featuredEl.innerHTML = emptyState('🍽️', 'Sin productos', 'No hay productos disponibles por ahora.');
  featured.forEach((p) => featuredEl.appendChild(productCard(p, 'featured')));

  $$('[data-cat]', el).forEach((a) => a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('int_cat', a.dataset.cat); setRoute('menu'); });
  const hs = $('#homeSearch', el);
  if (hs) hs.addEventListener('keydown', (e) => { if (e.key === 'Enter' && hs.value.trim()) { sessionStorage.setItem('int_search', hs.value.trim()); setRoute('menu'); } });
}

/* ---------- Card de producto — profesional, sin exceso de emojis ---------- */
function productCard(p, size = '') {
  const soldOut = !p.available || p.stock === 0;
  const low = !soldOut && p.stock <= p.minStock;
  const card = document.createElement('div');
  card.className = 'product-card' + (soldOut ? ' disabled' : low ? ' low' : '');
  const catLabel = esc(p.category.split(' ')[0]);
  card.innerHTML = `
    <div class="product-media">
      <span class="p-cat badge ${soldOut?'badge-danger':low?'badge-warning':'badge-neutral'}" style="background:var(--surface);border:1px solid var(--border);color:var(--text-2)">${svgIcon(catSvg(p.category))} ${catLabel}</span>
      <span class="product-media-icon" aria-hidden="true">${productIcon(p)}</span>
      ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : low ? `<div class="sold-flag low"><span>STOCK BAJO</span></div>` : ''}
    </div>
    <div class="product-body">
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-desc">${esc(p.desc)}</div>
      <div class="product-foot">
        <span class="product-price">${money(p.price)}</span>
        <span class="prep-tag">${svgIcon('clock')} ${p.prepMin} min</span>
      </div>
      <div class="tiny" style="margin-bottom:10px;display:flex;gap:6px;align-items:center">
        ${soldOut ? `<span class="badge badge-danger">Agotado</span>` : low ? `<span class="badge badge-warning">Quedan ${p.stock}</span><span class="tiny muted">· Disponible</span>` : `<span class="badge badge-success">Disponible</span><span class="tiny muted">· ${p.stock} en stock</span>`}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" style="flex:1" ${soldOut ? 'disabled' : ''} data-view="${p.id}">Ver detalle</button>
        <button class="btn btn-sm btn-primary" style="flex:1" ${soldOut ? 'disabled' : ''} ${canPlaceOrder() ? '' : 'disabled'} data-add="${p.id}">${soldOut ? 'No disponible' : `${svgIcon('plus')} Agregar`}</button>
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

/* ---------- Landing pública — Referencia exacta ---------- */
function renderLanding() {
  const app = $('#app');
  const cfg = Store.config;
  syncBodyClass();
  app.innerHTML = `
    <div class="landing">
      <nav class="landing-nav">
        <a class="brand" href="#" onclick="setRoute('landing');return false">
          <span class="brand-mark">☕</span>
          <span class="brand-name">Cafetería INTESUD<span class="brand-sub">Instituto Tecnológico Superior Sudamericano</span></span>
        </a>
        <div style="display:flex;gap:12px;align-items:center">
          <span class="badge-abierta">● ABIERTA</span>
          <a class="btn-acceder" href="#" id="btnLandingAcceder">Acceder al sistema →</a>
        </div>
      </nav>

      <div class="landing-hero-wrap">
        <div class="landing-hero">
          <div class="landing-hero-badge">☕ CAFETERÍA INSTITUCIONAL · INTESUD</div>
          <h1>Cafetería <span class="accent">INTESUD</span>,<br>tu pausa, <span class="accent underline">a tiempo</span>.</h1>
          <p class="lead">Pide tu desayuno o snack en línea y retíralo durante el receso sin filas. Delivery interno dentro del edificio, pagos con DEUNA, transferencia o efectivo y preparación prioritaria en barra.</p>
          <div class="landing-hero-actions">
            <a class="btn-pedir" href="#" id="btnHeroPedir">${svgIcon('coffee')} Pedir ahora</a>
            <a class="btn-servicios" href="#" id="btnHeroServicios">${svgIcon('orders')} Ver servicios</a>
          </div>
          <div class="landing-info-row">
            <div class="info-item"><span class="ico">${svgIcon('clock')}</span><div><b>Pedidos</b><span>${cfg.orderOpen}–${cfg.orderClose}</span></div></div>
            <div class="sep"></div>
            <div class="info-item"><span class="ico">${svgIcon('coffee')}</span><div><b>Receso</b><span>${cfg.breakStart}–${cfg.breakEnd}</span></div></div>
            <div class="sep"></div>
            <div class="info-item"><span class="ico">${svgIcon('cart')}</span><div><b>Delivery</b><span>P1–P3</span></div></div>
          </div>
        </div>

        <div class="landing-hero-img">
          <img src="assets/images/image.png" alt="Tres mascotas INTESUD compartiendo en la cafetería" loading="eager" onerror="this.style.display='none'">
          <div class="landing-hero-overlay">
            <div class="ov-item"><span class="ov-ico">${svgIcon('orders')}</span><b>8/10</b><span>CAPACIDAD</span></div>
            <div class="ov-item"><span class="ov-ico">${svgIcon('clock')}</span><b>~6 min</b><span>PREP. MEDIO</span></div>
            <div class="ov-item"><span class="ov-ico">${svgIcon('bag')}</span><b>3 pisos</b><span>DELIVERY</span></div>
            <div class="ov-item"><span class="ov-ico">${svgIcon('orders')}</span><b>DEUNA</b><span>Y MÁS PAGOS</span></div>
          </div>
        </div>
      </div>

      <div class="landing-bottom">
        <h2><span class="leaf">🍃</span> Todo listo para tu receso <span class="leaf">🍃</span></h2>
        <p class="sub">Servicio pensado para estudiantes y docentes: pide antes del receso y retira sin esperar.</p>
        <div class="landing-bottom-grid">
          <div class="b-item">
            <span class="b-ico">${svgIcon('bag')}</span>
            <div><h3>Pide en línea</h3><p>Elige tu desayuno o snack favorito en segundos.</p></div>
          </div>
          <div class="b-item">
            <span class="b-ico">${svgIcon('clock')}</span>
            <div><h3>Retira a tiempo</h3><p>Tu pedido estará listo en el receso, sin filas.</p></div>
          </div>
          <div class="b-item">
            <span class="b-ico">${svgIcon('cart')}</span>
            <div><h3>Te lo llevamos</h3><p>Delivery interno rápido en 3 pisos (P1–P3).</p></div>
          </div>
        </div>
      </div>

      <footer class="landing-footer" style="display:none"></footer>
    </div>
  `;
  const goLogin = (e) => { e.preventDefault(); setRoute('login'); };
  const goServicios = (e) => { e.preventDefault(); document.querySelector('.landing-bottom')?.scrollIntoView({behavior:'smooth'}); };
  $('#btnLandingAcceder')?.addEventListener('click', goLogin);
  $('#btnHeroPedir')?.addEventListener('click', goLogin);
  $('#btnHeroServicios')?.addEventListener('click', goServicios);
}

/* ---------- Inicialización ---------- */
function syncBodyClass() {
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
