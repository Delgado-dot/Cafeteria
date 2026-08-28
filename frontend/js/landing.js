/* ============================================================
   landing.js — Landing Page público de la Cafetería INTESUD
   Puerta de entrada pública -> ACCEDER -> login existente.
   No modifica la lógica de roles ni los paneles internos.
   ============================================================ */

/* ---------- Iconos SVG simples (inline, currentColor) ----------
   Reemplazan todos los emojis del Landing. */
function lpIcon(name, extra = '') {
  const common = 'width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + extra;
  const P = {
    cup: '<path d="M17 8h1a3 3 0 0 1 0 6h-1"/><path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    burger: '<path d="M3 11h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2z"/><path d="M26 17.5a4 4 0 0 1-8 0 4 4 0 0 1-16 0h24z"/><path d="M5 20h14"/><path d="M7 3h10"/><path d="M7 3v3h10V3"/>',
    hotdog: '<path d="M8 5l11 14"/><path d="M5.5 8.5l1-1M4 12l1-1M4.5 15l1-1M7.5 5.5l-1 1M12 4l2.5-1.5"/><rect x="3" y="19" width="18" height="5" rx="2" transform="rotate(-22 3 19)"/>',
    sandwich: '<path d="M2 12h20"/><path d="M4 8c1-2 4-2 5 0s4 2 5 0 4-2 5 0"/><path d="M4 16c1 2 4 2 5 0s4 2 5 0 4 2 5 0"/><path d="M4 6h16"/>',
    fries: '<path d="M16 3l5 5-4 12-7-1L5 9l5-2"/><path d="M8 8l8 8M11 5l4-2M13 9l3 3"/>',
    drink: '<path d="M5 3h14l-1 14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path d="M5 3v5h14V3"/><path d="M9 8l1 7M12 8l1 7"/>',
    snack: '<path d="M4 8c3-1.5 13-1.5 16 0v4c-3 1.5-13 1.5-16 0z"/><path d="M6 12v3M10 12v3M14 12v3M18 12v3M4 8c1-2 4-2 5 0M15 8c1-2 4-2 5 0"/>',
    plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hourglass: '<path d="M6 2h12v3l-4 7 4 7v3H6v-3l4-7-4-7z"/><path d="M6 5h12"/>',
    bag: '<path d="M6 3h12l1.5 17h-15z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/><path d="M22 9v6"/>',
    building: '<path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9h3a1 1 0 0 1 1 1v11H15"/><path d="M8 7h3M8 11h3M8 15h3"/>',
    zap: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a2 2 0 0 1 6 0"/><path d="M9 11h6M9 15h6"/>',
    flag: '<path d="M5 21V4"/><path d="M5 5c6-3 12 3 16 0v9c-4 3-10-3-16 0"/>',
    pencil: '<path d="M4 20l1-4L17 4l3 3L8 19z"/><path d="M15 6l3 3"/>',
    chef: '<path d="M7 20h10M8 17a4 4 0 1 1 8 0"/><path d="M6 13a4 4 0 0 1 6-3.5M12 9.5A4 4 0 0 1 18 13v4H6z"/>',
    pin: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    scooter: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17L9 8h4l2 5h4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9l-.9.6V17h-5v-2.5l-.9-.6A6 6 0 0 1 12 3z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    clock2: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M12 1v2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  const body = P[name] ? P[name] : P.plate;
  return `<svg ${common} aria-hidden="true">${body}</svg>`;
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

/* Ilustración hero: estudiante con su teléfono y el pedido.
   Estilo flat 2D / vector / moderno sobre el bloque orgánico. */
const LP_HERO_ART = `
  <div class="lp-hero-art">
    <div class="lp-blob-2"></div>
    <div class="lp-blob-3"></div>
    <div class="lp-blob"></div>
    <svg width="360" height="360" viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Estudiante realizando un pedido desde su teléfono" style="position:relative;z-index:2;width:min(88%,360px);height:auto">
      <!-- teléfono -->
      <g>
        <rect x="214" y="112" width="72" height="140" rx="16" fill="#ffffff" stroke="#40807E" stroke-width="3"/>
        <rect x="222" y="122" width="56" height="104" rx="7" fill="#e7f1f0"/>
        <rect x="230" y="130" width="40" height="9" rx="4.5" fill="#40807E"/>
        <rect x="230" y="148" width="40" height="6" rx="3" fill="#b9d3d1"/>
        <rect x="230" y="160" width="26" height="6" rx="3" fill="#b9d3d1"/>
        <rect x="230" y="182" width="40" height="16" rx="4" fill="#40807E"/>
        <rect x="230" y="202" width="40" height="6" rx="3" fill="#cfe0de"/>
        <circle cx="250" cy="248" r="5" fill="#40807E"/>
      </g>
      <!-- mano apoyada en el teléfono -->
      <g fill="#8a6b4f">
        <rect x="208" y="240" width="26" height="12" rx="6"/>
        <rect x="232" y="238" width="24" height="12" rx="6"/>
      </g>
      <!-- brazo -->
      <path d="M206 258 C196 236 200 214 220 198" stroke="#8a6b4f" stroke-width="20" stroke-linecap="round" fill="none"/>
      <!-- cabeza -->
      <circle cx="180" cy="168" r="44" fill="#c89a6e"/>
      <circle cx="180" cy="168" r="44" fill="#c89a6e"/>
      <!-- pelo -->
      <path d="M136 158 C134 120 226 120 224 158 C226 138 196 132 180 132 C164 132 134 138 136 158 Z" fill="#2e2520"/>
      <!-- torso -->
      <path d="M152 212 C150 232 150 258 150 258 L210 258 C210 258 210 232 208 212 C204 236 156 236 152 212 Z" fill="#40807E"/>
      <rect x="150" y="232" width="60" height="6" rx="3" fill="#2f605e"/>
      <!-- mochila -->
      <rect x="138" y="196" width="30" height="34" rx="9" fill="#2f605e"/>
      <!-- bolsa de pedido -->
      <rect x="252" y="268" width="52" height="40" rx="10" fill="none" stroke="#fff" stroke-width="4"/>
      <path d="M258 268 C258 250 296 250 296 268" stroke="#fff" stroke-width="4" fill="none"/>
      <path d="M262 290 L290 296" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <!-- estrellitas -->
      <path d="M150 110 l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#40807E" opacity="0.7"/>
      <path d="M116 204 l2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1z" fill="#ffffff" opacity="0.9"/>
      <path d="M296 82 l3 7 8 1-6 6 1 8-6-4-6 4 1-8-6-6 8-1z" fill="#40807E" opacity="0.6"/>
    </svg>
    <div class="lp-badge-float lp-bf-1">
      <div class="bf-ico">${lpIcon('bag')}</div>
      <div><div class="bf-t">Pedido listo</div><div class="bf-s">Prepárate para el receso</div></div>
    </div>
    <div class="lp-badge-float lp-bf-2">
      <div class="bf-ico">${lpIcon('clock2')}</div>
      <div><div class="bf-t">15 minutos</div><div class="bf-s">De 10:00 a 10:15</div></div>
    </div>
  </div>`;

/* ---------- Datos del menú preview (demo, tomados de Store) ---------- */
function lpMenuProducts() {
  const list = Store.products || [];
  const ids = ['p01', 'p04', 'p11', 'p16'];
  const items = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean);
  return items.slice(0, 4);
}

function lpSection(id, cls, inner) {
  return `<section class="lp-section ${cls}" id="${id}"><div class="lp-wrap">${inner}</div></section>`;
}

function renderLanding() {
  const app = $('#app');
  const cfg = Store.config;
  const menuItems = lpMenuProducts();

  const cap = (function () {
    const total = cfg.capacity || 10;
    const used = Math.min(cfg.currentCapacity != null ? cfg.currentCapacity : 8, total);
    const pct = total ? Math.round((used / total) * 100) : 0;
    return { used, total, pct };
  })();

  const menuCards = menuItems.map((p) => {
    const soldOut = !p.available || p.stock === 0;
    return `
      <div class="lp-product">
        <div class="lp-p-media">
          <span class="badge badge-primary lp-p-tag">${lpProductIcon(p.category)} ${esc(p.category.split(' ')[0])}</span>
          <span style="font-size:2.4rem">${lpProductIcon(p.category)}</span>
          ${soldOut ? `<div class="sold-flag"><span>AGOTADO</span></div>` : ''}
        </div>
        <div class="lp-p-body">
          <div class="lp-p-name">${esc(p.name)}</div>
          <div class="lp-p-desc">${esc(p.desc)}</div>
          <div class="lp-p-foot">
            <span class="lp-p-price">${money(p.price)}</span>
            <span class="lp-p-meta">${lpIcon('clock')} ${p.prepMin} min · ${soldOut ? 'Agotado' : p.stock + ' disp.'}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  const steps = [
    { n: '01', name: 'Elige', ico: 'burger', txt: 'Selecciona tus productos favoritos del menú.' },
    { n: '02', name: 'Realiza tu pedido', ico: 'check', txt: 'Confirma tu pedido antes de que cierre el horario de pedidos.' },
    { n: '03', name: 'Espera', ico: 'hourglass', txt: 'Consulta el estado y el tiempo estimado de preparación.' },
    { n: '04', name: 'Recibe o retira', ico: 'bag', txt: 'Retira tu pedido en la cafetería o recíbelo dentro del instituto mediante delivery.' },
  ];

  const capBlocks = [
    { ico: 'chef', t: 'Una sola persona prepara los pedidos', s: 'El sistema organiza el flujo para que todo esté listo a tiempo.' },
    { ico: 'clipboard', t: 'Sin acumulación', s: 'Se evita que se acumulen demasiados pedidos al mismo tiempo.' },
    { ico: 'clock', t: 'Listo para el receso', s: 'Tu pedido estará esperándote cuando comience tu receso.' },
  ];

  const delPoints = [
    { ico: 'building', t: 'Solo dentro de INTESUD', s: 'El delivery está limitado exclusivamente a las instalaciones del instituto.' },
    { ico: 'pin', t: 'Elige Piso → Aula', s: 'Indica tu piso y tu aula: ' + '<b>1A · 2B · 3C</b>' + ', por ejemplo, y recibe en tu ubicación cuando esté disponible.' },
  ];

  app.innerHTML = `
  <div class="landing"><div class="landing-page">

    <!-- ======= HEADER ======= -->
    <header class="lp-header">
      <div class="lp-wrap">
        <a class="lp-brand" href="#" data-lp-scroll="home">
          <span class="lp-brand-mark">${lpIcon('cup')}</span>
          <span class="lp-brand-name">INTESUD Cafetería<small>Pedidos en línea</small></span>
        </a>
        <nav class="lp-nav">
          <a href="#" data-lp-scroll="home">Inicio</a>
          <a href="#" data-lp-scroll="menu">Menú</a>
          <a href="#" data-lp-scroll="how">¿Cómo funciona?</a>
          <a href="#" data-lp-scroll="hours">Horarios</a>
        </nav>
        <div class="lp-header-actions">
          <button class="lp-btn-acceder" data-lp-login>ACCEDER</button>
          <button class="lp-burger" data-lp-burger aria-label="Abrir menú">${lpIcon('list')}</button>
        </div>
        
      </div>
    </header>

    <!-- ======= HERO ======= -->
    <section class="lp-hero" id="home">
      <div class="lp-wrap">
        <div class="lp-hero-copy">
          <div class="lp-eyebrow">Cafetería del Instituto Tecnológico Superior Sudamericano</div>
          <h1 class="lp-hero-title">Tu comida <span class="hl">lista para el receso.</span></h1>
          <p class="lp-hero-sub">Realiza tu pedido antes del receso y recógelo listo de 10:00 a 10:15.</p>
          <div class="lp-cta-row">
            <a class="btn btn-primary btn-lg" href="#" data-lp-scroll="menu">VER MENÚ</a>
            <button class="btn btn-outline btn-lg" data-lp-login>ACCEDER</button>
          </div>
          <div class="lp-hero-stats">
            <div class="lp-hero-stat"><div class="v">15 min</div><div class="l">de receso para retirar</div></div>
            <div class="lp-hero-stat"><div class="v">09:00–09:45</div><div class="l">horario de pedidos</div></div>
            <div class="lp-hero-stat"><div class="v">Delivery</div><div class="l">dentro del instituto</div></div>
          </div>
        </div>
        ${LP_HERO_ART}
      </div>
    </section>

    <!-- ======= PRESENTACIÓN ======= -->
    ${lpSection('about', 'lp-present', `
      <div class="lp-present-grid">
        <div class="lp-reveal" style="animation-delay:.05s">
          <div class="lp-eyebrow">Presentación</div>
          <h2 class="lp-h2">La cafetería de tu instituto</h2>
          <p class="lp-lead">La Cafetería INTESUD está ubicada dentro de las instalaciones del Instituto Tecnológico Superior Sudamericano y está pensada para facilitar los pedidos de los estudiantes durante el corto periodo de receso.</p>
          <ul class="lp-points">
            <li><span class="pi">${lpIcon('grad')}</span><div><div class="pt">Pensada para estudiantes</div><div class="ps">Pedidos rápidos y organizados para aprovechar tu receso.</div></div></li>
            <li><span class="pi">${lpIcon('building')}</span><div><div class="pt">Dentro de las instalaciones</div><div class="ps">Retiro en cafetería o delivery interno en el edificio.</div></div></li>
            <li><span class="pi">${lpIcon('zap')}</span><div><div class="pt">Rapidez y organización</div><div class="ps">Tu pedido listo para cuando empiece el receso.</div></div></li>
          </ul>
        </div>
        <div class="lp-photo lp-reveal" style="animation-delay:.15s">
          <div class="lp-photo-ph">
            <span class="p-ico">${lpIcon('cup')}</span>
            <span class="p-t">La Cafetería INTESUD</span>
            <span class="p-s">Imagen representativa del espacio del bar del instituto. Se actualizará con una fotografía real cuando esté disponible.</span>
          </div>
        </div>
      </div>
    `)}

    <!-- ======= CÓMO FUNCIONA ======= -->
    ${lpSection('how', 'lp-how', `
      <div class="lp-eyebrow">Cómo funciona</div>
      <h2 class="lp-h2">Pide antes del receso</h2>
      <p class="lp-lead">Cuatro pasos sencillos para que tu comida esté lista justo a tiempo.</p>
      <div class="lp-steps">
        ${steps.map((s, i) => `
          <div class="lp-step lp-reveal" style="animation-delay:${i * 0.08}s">
            ${i < steps.length - 1 ? `<span class="lp-step-arrow">${lpIcon('arrow')}</span>` : ''}
            <div class="lp-step-num">${s.n}</div>
            <div class="lp-step-ico">${lpIcon(s.ico)}</div>
            <h3>${s.name}</h3>
            <p>${s.txt}</p>
          </div>`).join('')}
      </div>
    `)}

    <!-- ======= HORARIOS ======= -->
    ${lpSection('hours', 'lp-hours', `
      <div class="lp-eyebrow">Horarios</div>
      <h2 class="lp-h2">Organiza tu pedido a tiempo</h2>
      <p class="lp-lead">No confundas el horario para hacer tu pedido con el horario para retirarlo. El receso es corto: solo 15 minutos.</p>
      <div class="lp-hours-grid">
        <div class="lp-hour-card lp-reveal">
          <span class="hc-label">${lpIcon('pencil')} Pedidos</span>
          <h3>${esc(cfg.orderOpen || '09:00')} — ${esc(cfg.orderClose || '09:45')}</h3>
          <p>Realiza tu pedido antes del cierre.</p>
          <div class="lp-hour-note">${lpIcon('clock')} Cierra a las ${esc(cfg.orderClose || '09:45')}</div>
        </div>
        <div class="lp-hour-card hl lp-reveal" style="animation-delay:.1s">
          <span class="hc-label">${lpIcon('flag')} Receso de entrega</span>
          <h3>${esc(cfg.breakStart || '10:00')} — ${esc(cfg.breakEnd || '10:15')}</h3>
          <p>Retira tu pedido o recibe tu delivery.</p>
          <div class="lp-hour-note"><span class="lp-15min">${lpIcon('clock2')} El receso dura <b>&nbsp;15 minutos</b></span></div>
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
        <button class="btn btn-outline" data-lp-login>VER TODO EL MENÚ</button>
      </div>
      <p class="lp-lead">Una pequeña selección de lo que puedes pedir. El catálogo completo está disponible dentro del sistema.</p>
      <div class="lp-product-grid">
        ${menuCards}
      </div>
    `)}

    <!-- ======= CAPACIDAD ======= -->
    ${lpSection('capacity', 'lp-capacity', `
      <div class="lp-capacity-grid">
        <div class="lp-reveal">
          <div class="lp-eyebrow">Capacidad de preparación</div>
          <h2 class="lp-h2">Pedidos organizados para evitar esperas</h2>
          <p class="lp-lead">El sistema organiza los pedidos considerando la capacidad de preparación de la cafetería, para evitar que se acumulen demasiados pedidos al mismo tiempo. Como el bar lo prepara una sola persona, cada pedido cuenta.</p>
          <ul class="lp-cap-tags">
            ${capBlocks.map((b) => `<li><span class="pi" style="width:40px;height:40px;border-radius:12px;background:var(--primary-soft);color:var(--lp-primary);display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0">${lpIcon(b.ico)}</span><div><div class="pt">${b.t}</div><div class="ps" style="color:var(--text-2);font-size:var(--fs-sm);margin-top:2px">${b.s}</div></div></li>`).join('')}
          </ul>
        </div>
        <div class="lp-reveal" style="animation-delay:.1s">
          <div class="lp-cap-gauge">
            <div class="cg-head">
              <span class="cg-label">Capacidad de preparación</span>
              <span class="badge badge-primary">${cap.used}/${cap.total}</span>
            </div>
            <div class="cg-track"><div class="cg-fill" style="width:${cap.pct}%"></div></div>
            <div class="cg-num"><span>${cap.used} / ${cap.total} pedidos</span><b>${cap.pct}%</b></div>
            <div class="lp-cap-foot">${lpIcon('bulb')} Capacidad disponible. Indicador demostrativo: la capacidad se gestiona en el panel de la administradora del bar.</div>
          </div>
        </div>
      </div>
    `)}

    <!-- ======= DELIVERY ======= -->
    ${lpSection('delivery', 'lp-delivery', `
      <div class="lp-delivery-grid">
        <div class="lp-reveal">
          <div class="lp-eyebrow">Delivery interno</div>
          <h2 class="lp-h2">Recibe tu pedido dentro del instituto</h2>
          <p class="lp-lead">El delivery está limitado exclusivamente a las instalaciones de INTESUD. Elige tu piso y tu aula para recibir tu pedido cuando el servicio esté disponible.</p>
          <ul class="lp-del-flow">
            ${delPoints.map((d) => `<li><span class="df-ico">${lpIcon(d.ico)}</span><div>${d.t}<div style="font-size:var(--fs-sm);color:var(--text-3)">${d.s}</div></div></li>`).join('')}
          </ul>
        </div>
        <div class="lp-reveal" style="animation-delay:.1s">
          <div class="lp-building">
            <div class="lp-bldg-frame">
              <div class="lp-floor">
                <span class="lp-floor-label">Piso 3</span>
                <span class="lp-aula">3A</span><span class="lp-aula">3B</span><span class="lp-aula sel">3C</span>
              </div>
              <div class="lp-floor">
                <span class="lp-floor-label">Piso 2</span>
                <span class="lp-aula">2A</span><span class="lp-aula sel">2B</span><span class="lp-aula">2C</span>
              </div>
              <div class="lp-floor">
                <span class="lp-floor-label">Piso 1</span>
                <span class="lp-aula sel">1A</span><span class="lp-aula">1B</span><span class="lp-aula">1C</span>
              </div>
            </div>
            <span class="badge badge-success lp-del-tag">${lpIcon('scooter')} Piso → Aula</span>
          </div>
        </div>
      </div>
    `)}

    <!-- ======= CTA FINAL ======= -->
    ${lpSection('cta', 'lp-cta', `
      <div class="lp-eyebrow" style="color:rgba(255,255,255,0.85);justify-content:center">Tu café, listo antes del receso</div>
      <h2 class="lp-h2" style="text-align:center">¿Listo para pedir?</h2>
      <p class="lp-lead" style="text-align:center">Haz tu pedido antes de las ${esc(cfg.orderClose || '9:45')} y aprovecha tu receso.</p>
      <div class="lp-cta-row">
        <button class="lp-btn-access" data-lp-login>ACCEDER A LA CAFETERÍA ${lpIcon('arrow')}</button>
      </div>
    `)}

    <!-- ======= FOOTER ======= -->
    <footer class="lp-footer">
      <div class="lp-wrap">
        <div class="lp-footer-top">
          <div class="lp-footer-brand">
            <a class="lp-brand" href="#" data-lp-scroll="home">
              <span class="lp-brand-mark">${lpIcon('cup')}</span>
              <span class="lp-brand-name">INTESUD — Cafetería</span>
            </a>
            <div style="margin-top:12px;max-width:320px;font-size:var(--fs-sm);color:rgba(255,255,255,0.6)">Instituto Tecnológico Superior Sudamericano — INTESUD</div>
          </div>
          <div class="lp-footer-col">
            <h4>Navegación</h4>
            <ul>
              <li><a href="#" data-lp-scroll="home">Inicio</a></li>
              <li><a href="#" data-lp-scroll="menu">Menú</a></li>
              <li><a href="#" data-lp-scroll="hours">Horarios</a></li>
              <li><a href="#" data-lp-login>Acceder</a></li>
            </ul>
          </div>
          <div class="lp-footer-col">
            <h4>El servicio</h4>
            <ul>
              <li><a href="#" data-lp-scroll="how">¿Cómo funciona?</a></li>
              <li><a href="#" data-lp-scroll="capacity">Capacidad de preparación</a></li>
              <li><a href="#" data-lp-scroll="delivery">Delivery interno</a></li>
            </ul>
          </div>
          <div class="lp-footer-col">
            <h4>Contacto</h4>
            <ul>
              <li><span style="color:rgba(255,255,255,0.7)">Campus INTESUD</span></li>
              <li><span style="color:rgba(255,255,255,0.7)">Bar institucional</span></li>
            </ul>
          </div>
        </div>
        <div class="lp-footer-bottom">
          <span>© 2026 Cafetería INTESUD. Todos los derechos reservados.</span>
          <span>Instituto Tecnológico Superior Sudamericano</span>
        </div>
      </div>
    </footer>

  </div></div>`;

  // ---------- Comportamiento del landing ----------
  document.body.classList.add('is-landing');

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  $$('[data-lp-scroll]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const mnav = $('[data-lp-mnav]');
    if (mnav) mnav.classList.remove('open');
    scrollTo(a.dataset.lpScroll);
  }));

  $$('[data-lp-login]').forEach((b) => b.addEventListener('click', () => setRoute('login')));

  const burger = $('[data-lp-burger]');
  const mnav = $('[data-lp-mnav]');
  if (burger && mnav) {
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      mnav.classList.toggle('open');
    });
  }
}
window.renderLanding = renderLanding;
