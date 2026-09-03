/* ============================================================
   landing.js — Landing Page público de la Cafetería INTESUD
   Puerta de entrada pública -> ACCEDER -> login existente.
   Rediseño minimalista inspirado en la rama Dylan.
   No modifica la lógica de roles ni los paneles internos.
   ============================================================ */

/* ---------- Iconos compartidos con Admin Bar ---------- */
function lpIcon(name, extra = '') {
  const map = {
    cup: 'bx-coffee', burger: 'bx-food-menu', hotdog: 'bx-food-menu', sandwich: 'bx-food-menu',
    fries: 'bx-food-menu', drink: 'bx-drink', snack: 'bx-cookie', plate: 'bx-restaurant',
    check: 'bx-check', clock: 'bx-time', hourglass: 'bx-time-five', bag: 'bx-shopping-bag',
    grad: 'bx-graduation', building: 'bx-building', zap: 'bx-bolt', clipboard: 'bx-clipboard',
    flag: 'bx-flag', pencil: 'bx-edit-alt', chef: 'bx-restaurant', pin: 'bx-map', scooter: 'bx-cycling',
    arrow: 'bx-right-arrow-alt', bulb: 'bx-bulb', list: 'bx-list-ul', clock2: 'bx-time-five', eye: 'bx-show',
  };
  return `<i class="bx ${map[name] || map.plate}" aria-hidden="true" ${extra}></i>`;
}
window.lpIcon = lpIcon;

/* Icono por categoría/producto (para la vista previa del menú). */
function lpProductIcon(cat) {
  const map = {
    Hamburguesas: 'burger',
    'Hot Dogs': 'hotdog',
    Sándwiches: 'sandwich',
    'Papas y Salchipapas': 'fries',
    Bebidas: 'drink',
    Snacks: 'snack',
  };
  return lpIcon(map[cat] || 'plate');
}
window.lpProductIcon = lpProductIcon;

/* ---------- Datos del menú preview (demo, tomados de Store) ---------- */
function lpMenuProducts() {
  const list = Store.products || [];
  const ids = ['p01', 'p04', 'p11', 'p16'];
  const items = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean);
  return items.slice(0, 4);
}

function lpSection(id, cls, inner) {
  return `<section class="lp-slide lp-section ${cls}" id="${id}"><div class="lp-wrap">${inner}</div></section>`;
}

function renderLanding() {
  const app = $('#app');
  const cfg = Store.config;
  const menuItems = lpMenuProducts();

  const menuCards = menuItems.map((p) => {
    const soldOut = !p.available || p.stock === 0;
    return `
      <div class="lp-product">
        <div class="lp-p-media">
          <span class="badge badge-primary lp-p-tag">${lpProductIcon(p.category)} ${esc(p.category.split(' ')[0])}</span>
          <span style="display:inline-flex">${lpProductIcon(p.category)}</span>
          ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
        </div>
        <div class="lp-p-body">
          <div class="lp-p-name">${esc(p.name)}</div>
          <div class="lp-p-desc">${esc(p.desc)}</div>
          <div class="lp-p-foot">
            <span class="lp-p-price">${money(p.price)}</span>
            <span class="lp-p-meta"><span class="lp-p-prep-time">${p.prepMin} min</span> · ${soldOut ? 'Agotado' : p.stock + ' disp.'}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  app.innerHTML = `
  <div class="landing">

    <!-- ======= CAPA DE FONDO FIJA (siempre visible, nunca cambia) ======= -->
    <div class="lp-bg" aria-hidden="true">
      <img src="assets/images/Cafeteria1.jpg" alt="">
      <div class="lp-bg-overlay"></div>
    </div>

    <!-- ======= IDENTIDAD Y ACCESO ======= -->
    <div class="lp-topbar">
      <a class="lp-brand" href="#" data-lp-scroll="home">
        <span class="lp-brand-mark"><img class="lp-brand-img" src="assets/bar-intesud-logo.png" alt="Logo INTESUD"></span>
        <span class="lp-brand-name">Bar INTESUD<small>Pedidos en línea</small></span>
      </a>
      <button class="lp-btn-acceder" data-lp-login>ACCEDER</button>
    </div>

    <!-- ======= VIEWPORT HORIZONTAL (desplaza el contenido sobre el fondo fijo) ======= -->
    <div class="lp-viewport">
      <div class="lp-track">

    <!-- ======= SLIDE 1 · PORTADA ======= -->
    <section class="lp-slide lp-hero" id="home">
      <div class="lp-hero-wrap">
        <span class="lp-eyebrow centered">Bar INTESUD del Instituto Tecnológico Superior Sudamericano</span>
        <h1 class="lp-hero-title">Tu comida, <span class="hl">lista para el receso</span></h1>
        <p class="lp-hero-tag">Realiza tu pedido antes del receso y recógelo listo de ${esc(cfg.breakStart || '10:00')} a ${esc(cfg.breakEnd || '10:15')}.</p>
        <div class="lp-hero-actions">
          <button class="lp-btn-white" data-lp-scroll="menu">VER MENÚ ${lpIcon('arrow')}</button>
          <button class="lp-btn-hero" data-lp-login>ACCEDER ${lpIcon('arrow')}</button>
        </div>
        <div class="lp-hero-stats">
          <div class="lp-hero-stat"><div class="v">15 min</div><div class="l">de receso para retirar</div></div>
          <div class="lp-hero-stat"><div class="v">${esc(cfg.orderOpen || '09:00')}–${esc(cfg.orderClose || '09:45')}</div><div class="l">horario de pedidos</div></div>
          <div class="lp-hero-stat"><div class="v">Delivery</div><div class="l">dentro del instituto</div></div>
        </div>
      </div>
    </section>

    <!-- ======= PRESENTACIÓN ======= -->
    ${lpSection('about', 'lp-about', `
      <div class="lp-center">
        <div class="lp-eyebrow centered">Presentación</div>
        <h2 class="lp-h2">La cafetería de tu instituto</h2>
        <p class="lp-lead">El Bar INTESUD está ubicado dentro de las instalaciones del Instituto Tecnológico Superior Sudamericano y está pensado para facilitar los pedidos de los estudiantes durante el corto periodo de receso.</p>
      </div>
      <ul class="lp-about-points">
        <li><span class="pi">${lpIcon('grad')}</span><div><div class="pt">Pensada para estudiantes</div><div class="ps">Pedidos rápidos y organizados para aprovechar tu receso.</div></div></li>
        <li><span class="pi">${lpIcon('building')}</span><div><div class="pt">Dentro de las instalaciones</div><div class="ps">Retiro en cafetería o delivery interno en el edificio.</div></div></li>
        <li><span class="pi">${lpIcon('zap')}</span><div><div class="pt">Rapidez y organización</div><div class="ps">Tu pedido listo para cuando empiece el receso.</div></div></li>
      </ul>
      <figure class="lp-gallery">
        <div class="lp-g-card"><img src="assets/images/galeria-1.svg" alt="Barra de atención de la cafetería"><figcaption>Barra de atención</figcaption></div>
        <div class="lp-g-card"><img src="assets/images/galeria-2.svg" alt="Espacio para disfrutar en la cafetería"><figcaption>Espacio para disfrutar</figcaption></div>
        <div class="lp-g-card"><img src="assets/images/galeria-3.svg" alt="Café y snacks de la cafetería"><figcaption>Café y snacks</figcaption></div>
      </figure>
    `)}

    <!-- ======= CÓMO FUNCIONA ======= -->
    ${lpSection('how', 'lp-how', `
      <div class="lp-center">
        <div class="lp-eyebrow centered">Cómo funciona</div>
        <h2 class="lp-h2">Pide antes del receso</h2>
        <p class="lp-lead">Tres pasos sencillos para que tu comida esté lista justo a tiempo.</p>
      </div>
      <div class="lp-steps">
        <div class="lp-step">
          <span class="lp-step-num">01</span>
          <span class="lp-step-ico">${lpIcon('burger')}</span>
          <h3>Elige</h3>
          <p>Selecciona tus productos favoritos del menú antes de que cierre el horario de pedidos.</p>
        </div>
        <div class="lp-step">
          <span class="lp-step-num">02</span>
          <span class="lp-step-ico">${lpIcon('check')}</span>
          <h3>Realiza tu pedido</h3>
          <p>Confirma tu pedido en línea con retiro en cafetería o delivery interno.</p>
        </div>
        <div class="lp-step">
          <span class="lp-step-num">03</span>
          <span class="lp-step-ico">${lpIcon('bag')}</span>
          <h3>Recibe o retira</h3>
          <p>Retira tu pedido en la cafetería o recíbelo dentro del instituto cuando empiece el receso.</p>
        </div>
      </div>
    `)}

    <!-- ======= MENÚ PREVIEW ======= -->
    ${lpSection('menu', 'lp-menu', `
      <div class="lp-menu-head">
        <div>
          <div class="lp-eyebrow">Vista previa</div>
          <h2 class="lp-h2">Conoce nuestro menú</h2>
        </div>
        <button class="btn btn-primary" data-lp-login>VER TODO EL MENÚ</button>
      </div>
      <p class="lp-lead">Una pequeña selección de lo que puedes pedir. El catálogo completo está disponible dentro del sistema.</p>
      <div class="lp-product-grid">
        ${menuCards}
      </div>
    `)}

    <!-- ======= HORARIOS ======= -->
    ${lpSection('hours', 'lp-hours', `
      <div class="lp-center">
        <div class="lp-eyebrow centered">Horarios</div>
        <h2 class="lp-h2">Organiza tu pedido a tiempo</h2>
        <p class="lp-lead">No confundas el horario para hacer tu pedido con el horario para retirarlo. El receso es corto: solo 15 minutos.</p>
      </div>
      <div class="lp-hours-grid">
        <div class="lp-hour-card">
          <span class="hc-ico">${lpIcon('pencil')}</span>
          <div>
            <div class="hc-label">Pedidos</div>
            <div class="hc-value">${esc(cfg.orderOpen || '09:00')} — ${esc(cfg.orderClose || '09:45')}</div>
            <div class="hc-note">${lpIcon('clock')} Cierra a las ${esc(cfg.orderClose || '09:45')}</div>
          </div>
        </div>
        <div class="lp-hour-card">
          <span class="hc-ico">${lpIcon('flag')}</span>
          <div>
            <div class="hc-label">Receso de entrega</div>
            <div class="hc-value">${esc(cfg.breakStart || '10:00')} — ${esc(cfg.breakEnd || '10:15')}</div>
            <div class="hc-note">${lpIcon('clock2')} El receso dura 15 minutos</div>
          </div>
        </div>
      </div>
    `)}

    <!-- ======= CTA FINAL ======= -->
    ${lpSection('cta', 'lp-cta', `
      <div class="lp-center">
        <div class="lp-eyebrow centered">Tu café, listo antes del receso</div>
        <h2 class="lp-h2">¿Listo para pedir?</h2>
        <p class="lp-lead">Haz tu pedido antes de las ${esc(cfg.orderClose || '09:45')} y aprovecha tu receso.</p>
        <div class="lp-cta-row">
          <button class="lp-btn-access" data-lp-login>ACCEDER A BAR INTESUD ${lpIcon('arrow')}</button>
        </div>
      </div>
      <!-- ======= FOOTER (fila compacta dentro del slide de cierre) ======= -->
      <div class="lp-footer-strip">
        <div class="lp-f-brand">
          <a class="lp-brand" href="#" data-lp-scroll="home">
            <span class="lp-brand-mark"><img class="lp-brand-img" src="assets/bar-intesud-logo.png" alt="Logo INTESUD"></span>
            <span class="lp-brand-name">Bar INTESUD</span>
          </a>
        </div>
        <div class="lp-f-col">
          <h4>El servicio</h4>
          <ul>
            <li><a href="#" data-lp-scroll="how">¿Cómo funciona?</a></li>
            <li><a href="#" data-lp-scroll="menu">Vista previa del menú</a></li>
            <li><a href="#" data-lp-scroll="hours">Horarios</a></li>
          </ul>
        </div>
        <div class="lp-f-col">
          <h4>Contacto</h4>
          <ul>
            <li><span>Campus INTESUD</span></li>
            <li><span>Bar institucional</span></li>
            <li><span>Instituto Tecnológico Superior Sudamericano</span></li>
          </ul>
        </div>
        <div class="lp-f-bottom">
          <span>© ${new Date().getFullYear()} Bar INTESUD. Todos los derechos reservados.</span>
        </div>
      </div>
    `)}

      </div><!-- /lp-track -->
    </div><!-- /lp-viewport -->

    <!-- ======= NAVEGACIÓN (flechas + indicadores) ======= -->
    <button class="lp-arrow lp-arrow-prev" data-lp-prev aria-label="Sección anterior">${lpIcon('arrow', 'style="transform:rotate(180deg)"')}</button>
    <button class="lp-arrow lp-arrow-next" data-lp-next aria-label="Sección siguiente">${lpIcon('arrow')}</button>
    <div class="lp-dots" data-lp-dots aria-label="Secciones"></div>

  </div>`;

  // ---------- Comportamiento del landing ----------
  document.body.classList.add('is-landing');

  const viewport = $('.lp-viewport');
  const track = $('.lp-track');
  if (!viewport || !track) return;

  const slides = $$('.lp-slide', track);
  const dotsWrap = $('[data-lp-dots]');
  let current = 0;

  // Indicadores de sección
  slides.forEach((s, i) => {
    const dot = document.createElement('button');
    dot.className = 'lp-dot';
    dot.setAttribute('aria-label', 'Ir a sección ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = $$('.lp-dot', dotsWrap);

  const goTo = (i) => {
    if (i < 0 || i >= slides.length) return;
    current = i;
    viewport.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
  };
  window.__lpGoTo = goTo;

  // Sincroniza el estado activo con la posición del scroll
  const updateState = () => {
    const w = viewport.clientWidth || 1;
    const idx = Math.round(viewport.scrollLeft / w);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    slides.forEach((s, i) => s.classList.toggle('active', i === idx));
    const prev = $('[data-lp-prev]');
    const next = $('[data-lp-next]');
    if (prev) prev.classList.toggle('disabled', idx === 0);
    if (next) next.classList.toggle('disabled', idx === slides.length - 1);
  };
  viewport.addEventListener('scroll', updateState, { passive: true });
  updateState();

  // Flechas
  $('[data-lp-prev]')?.addEventListener('click', () => goTo(current - 1));
  $('[data-lp-next]')?.addEventListener('click', () => goTo(current + 1));

  // Teclado ← →
  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('is-landing')) return;
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  // Botón "Explora" / enlaces de navegación → cada atributo apunta a una slide
  const idToIndex = {};
  slides.forEach((s, i) => { if (s.id) idToIndex[s.id] = i; });
  const scrollTo = (id) => {
    const mnav = $('[data-lp-mnav]');
    if (mnav) mnav.classList.remove('open');
    goTo(idToIndex[id] != null ? idToIndex[id] : 0);
  };

  $$('[data-lp-scroll]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTo(a.dataset.lpScroll);
  }));

  $$('[data-lp-login]').forEach((b) => b.addEventListener('click', () => setRoute('login')));

}
window.renderLanding = renderLanding;