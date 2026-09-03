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

/* ---------- Página de portada (antes del login) ---------- */
function renderLanding() {
  const app = $('#app');
  const cfg = Store.config;
  const svgCup = (w, h) => `<svg viewBox="0 0 24 24" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8.5 4.5c0-1.2.9-1.8.9-3M12 4.5c0-1.2.9-1.8.9-3M15.5 4.5c0-1.2.9-1.8.9-3"/></svg>`;
  const svgMenu = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="10" height="6" rx="1.5"/><path d="M6.5 5h5M17 5h3M17 9h3M7 12h8M7 16h8"/></svg>`;
  const svgCart = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3.5h2.4l2.3 11.5h9.6l2.2-8H6.2"/></svg>`;
  const svgClock = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>`;
  app.innerHTML = `
  <div class="landing">
    <header class="landing-topbar">
      <a class="brand" href="#" data-nav="inicio">
        <span class="brand-mark">${svgCup(22, 22)}</span>
        <span class="brand-name">INTESUD CAFETERÍA</span>
      </a>
      <button class="btn btn-primary" onclick="setRoute('login')">Acceder</button>
    </header>

    <main class="landing-main">
      <section class="landing-hero">
        <div class="hero-media">
          <img src="assets/images/bar-hero.svg" alt="Interior de la cafetería INTESUD">
          <div class="hero-overlay">
            <h1>CAFETERÍA <span>INTESUD</span></h1>
            <p class="hero-tag">Tu comida, antes del receso.</p>
            <div class="hero-actions">
              <button class="btn btn-lg btn-white" onclick="setRoute('login')">Ver menú</button>
              <button class="btn btn-lg btn-hero-accent" onclick="setRoute('login')">Acceder</button>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section how">
        <div class="landing-wrap">
          <h2 class="landing-title">¿Cómo funciona?</h2>
          <div class="steps">
            <div class="step">
              <div class="step-num">01</div>
              <div class="step-ico">${svgMenu}</div>
              <h3>Elige</h3>
              <p>Explora el menú y elige tu almuerzo o snack favorito.</p>
            </div>
            <div class="step">
              <div class="step-num">02</div>
              <div class="step-ico">${svgCart}</div>
              <h3>Pide</h3>
              <p>Haz tu pedido en línea, con retiro en cafetería o delivery interno.</p>
            </div>
            <div class="step">
              <div class="step-num">03</div>
              <div class="step-ico">${svgCup(30, 30)}</div>
              <h3>Retira</h3>
              <p>Recoge tu pedido durante el receso y disfruta tu comida.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section gallery">
        <div class="landing-wrap">
          <h2 class="landing-title">Conoce nuestra cafetería</h2>
          <p class="landing-sub">Un espacio pensado para tu descanso, con atención rápida en el corazón del instituto.</p>
          <div class="gallery-grid">
            <figure class="g-card">
              <img src="assets/images/galeria-1.svg" alt="Barra de atención de la cafetería">
              <figcaption>Barra de atención</figcaption>
            </figure>
            <figure class="g-card">
              <img src="assets/images/galeria-2.svg" alt="Espacio para disfrutar en la cafetería">
              <figcaption>Espacio para disfrutar</figcaption>
            </figure>
            <figure class="g-card">
              <img src="assets/images/galeria-3.svg" alt="Café y snacks de la cafetería">
              <figcaption>Café y snacks</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section class="landing-section hours">
        <div class="landing-wrap">
          <h2 class="landing-title">Horario de atención</h2>
          <div class="hours-grid">
            <div class="hour-card">
              <span class="hour-ico">${svgClock}</span>
              <div><div class="hour-label">Pedidos</div><div class="hour-value">${esc(cfg.orderOpen)} – ${esc(cfg.orderClose)}</div></div>
            </div>
            <div class="hour-card">
              <span class="hour-ico">${svgCup(26, 26)}</span>
              <div><div class="hour-label">Receso</div><div class="hour-value">${esc(cfg.breakStart)} – ${esc(cfg.breakEnd)}</div></div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="foot-brand">
        <span class="brand-mark">${svgCup(22, 22)}</span>
        <div class="foot-brand-text"><div class="foot-name">INTESUD</div><div class="foot-sub">Cafetería INTESUD</div></div>
      </div>
      <p>© ${new Date().getFullYear()} Cafetería INTESUD · Todos los derechos reservados</p>
    </footer>
  </div>`;

  $$('[data-nav]', app).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute(a.dataset.nav); });
}

function handleRoute() {
  const user = Auth.current();
  let r = (window.location.hash || '#inicio').replace('#', '');
  params.product = null;

  // Páginas públicas
  if (r === 'inicio') {
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

  if (r.startsWith('product/')) {
    params.product = r.split('/')[1];
    r = 'product';
  }

  if (!user) { setRoute('inicio'); return; }

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

/* ---------- User shell (header + main + mobile nav) ---------- */
function renderUserShell(page) {
  const app = $('#app');
  const user = currentUser();
  const cartCount = Cart.count();

  const header = `
    <div class="app">
      <header class="user-header">
        <a class="brand" href="#" data-nav="home">
          <span class="brand-mark">☕</span>
          <span class="brand-name">Cafetería INTESUD<span class="brand-sub">Pedidos en línea</span></span>
        </a>
        <div class="header-actions">
          <div class="header-search">
            <span class="ico">🔍</span>
            <input class="input" id="headerSearch" placeholder="Buscar producto..." autocomplete="off">
          </div>
          <button class="header-icon-btn" onclick="setRoute('cart')" title="Carrito">🛒<span class="bubble ${cartCount ? 'show' : ''}" id="cartBubble">${cartCount}</span></button>
          <div class="user-chip" id="userMenu">
            <div class="avatar">${esc(initials(user.name))}</div>
            <span class="chip-info bold" style="font-size:var(--fs-sm)">${esc(user.name.split(' ')[0])}</span>
            <span class="chip-info" style="color:var(--text-3);font-size:.7rem">▾</span>
            <div class="dropdown-menu" id="userDropdown" style="display:none">
              <div class="dropdown-head">
                <div class="bold small">${esc(user.name)}</div>
                <div class="tiny muted">${esc(user.email)}</div>
              </div>
              <a class="dropdown-item" href="#" data-link="profile"><span class="dm-ico">👤</span>Mi perfil</a>
              <a class="dropdown-item" href="#" data-link="orders"><span class="dm-ico">🧾</span>Mis pedidos</a>
              <a class="dropdown-item" href="#" data-link="changepass"><span class="dm-ico">🔒</span>Cambio de contraseña</a>
              <div class="dropdown-sep"></div>
              <a class="dropdown-item danger" href="#" id="btnUserLogout"><span class="dm-ico">⏻</span>Cerrar sesión</a>
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
    ['home', '🏠', 'Inicio'], ['menu', '🍔', 'Menú'],
    ['cart', '🛒', 'Carrito'], ['orders', '🧾', 'Pedidos'],
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
  const hasImg = typeof productHasImage === 'function' ? productHasImage(p) : !!(p.image);
  const mediaInner = hasImg && typeof productMediaHTML === 'function'
    ? productMediaHTML(p, { size })
    : `<span class="p-emoji">${clientProductIcon(p)}</span>`;
  const card = document.createElement('div');
  card.className = 'product-card' + (soldOut ? ' disabled' : '') + (hasImg ? ' has-image' : ' no-image');
  card.innerHTML = `
<<<<<<< Updated upstream
    <div class="product-media">
      ${catIcon(p.category) ? `<span class="p-cat badge badge-primary">${catIcon(p.category)} ${esc(p.category.split(' ')[0])}</span>` : ''}
      ${productIcon(p)}
=======
    <div class="product-media ${hasImg ? 'has-img' : 'no-img'}">
      <span class="pc-dots"></span>
      <span class="pc-wave"></span>
      ${mediaInner}
      ${clientCatIcon(p.category) ? `<span class="p-cat badge badge-primary">${clientCatIcon(p.category)} ${esc(p.category)}</span>` : ''}
>>>>>>> Stashed changes
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

  const hasImg = typeof productHasImage === 'function' ? productHasImage(p) : !!(p.image);
  const detailMedia = hasImg && typeof productImgTag === 'function'
    ? `<div class="product-media-detail-wrap" style="height:100%;min-height:340px;display:flex;align-items:center;justify-content:center;background:var(--surface-2);overflow:hidden;position:relative">${productImgTag(p, 'p-detail-img', p.name)}<span class="p-fallback" style="display:none;font-size:5rem">${clientProductIcon(p)}</span>${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}</div>`
    : `<div class="product-media" style="height:100%;min-height:340px;font-size:5.5rem;align-items:center">
          ${clientProductIcon(p)}
          ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
        </div>`;
  el.innerHTML = `
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="setRoute('menu')">← Volver al menú</button>
    <div class="card card-flush" style="overflow:hidden">
      <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:0" class="prod-detail">
<<<<<<< Updated upstream
        <div class="product-media" style="height:100%;min-height:340px;font-size:5.5rem;align-items:center">
          ${productIcon(p)}
          ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
        </div>
=======
        ${detailMedia}
>>>>>>> Stashed changes
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
