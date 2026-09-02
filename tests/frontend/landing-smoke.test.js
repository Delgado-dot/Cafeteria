const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', 'frontend');

// jsdom es dev-dependency no persistente: si no está disponible este smoke
// test se salta (no rompe `npm test`), si está presente ejecuta la verificación.
let JSDOM;
try {
  JSDOM = require(path.join(root, 'node_modules', 'jsdom')).JSDOM;
} catch (e) {
  console.log('SKIP: jsdom no disponible; landing-smoke.test.js omitido.');
  process.exit(0);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
let js = scriptSrcs.map((s) => fs.readFileSync(path.join(root, s), 'utf8')).join('\n;\n');
// Adjuntar referencias a window en el MISMO scope de eval (const no crea props de window).
js += '\n;window.__AUTH = Auth; window.__ROUTE = route; window.__HANDLE = handleRoute; window.__STORE = Store;';

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  beforeParse(window) {
    window.scrollTo = () => {};
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.matchMedia = window.matchMedia || function () {
      return { matches: false, addListener() {}, removeListener() {} };
    };
  },
});

const { window } = dom;
const { document } = window;

const jsdomErrors = [];
window.addEventListener('error', (e) => jsdomErrors.push('window.error: ' + (e.message || e.error)));

window.eval(js);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function ok(cond, label) {
  if (cond) { console.log('PASS:', label); }
  else { failures++; console.log('FAIL:', label); }
}

function clickLogin() {
  document.querySelector('[data-lp-login]').dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
}

async function main() {
  await sleep(150);

  // 1. Initial load => Landing
  ok(!!document.querySelector('.landing'), 'Landing renderizado al cargar sin sesión');
  ok(!!document.querySelector('.lp-hero'), 'Hero presente en Landing');
  ok(!document.querySelector('.lp-header'), 'Header/navbar eliminado de Landing');
  ok(!!document.querySelector('.lp-topbar .lp-brand-mark'), 'Logo visible sin header tradicional');
  ok(!!document.querySelector('.lp-topbar [data-lp-login]'), 'Acceder visible en la esquina superior');
  ok(document.querySelector('link[href*="family=Arvo"]'), 'Arvo importada');
  ok(document.querySelector('link[href*="family=Playfair"]'), 'Playfair Display importada');
  ok(!!document.querySelector('.lp-footer-strip'), 'Footer presente en Landing');
  ok(!!document.getElementById('about'), 'Sección presentación presente');
  ok(!!document.getElementById('how'), 'Sección cómo funciona presente');
  ok(!!document.getElementById('hours'), 'Sección horarios presente');
  ok(!!document.getElementById('menu'), 'Sección menú preview presente');
  ok(!document.getElementById('capacity'), 'Sección capacidad eliminada');
  ok(!document.getElementById('delivery'), 'Sección delivery eliminada');
  ok(!document.querySelector('.landing').textContent.includes('Pedidos organizados para evitar esperas'), 'Contenido de capacidad eliminado');
  ok(!document.querySelector('.landing').textContent.includes('Recibe tu pedido dentro del instituto'), 'Contenido de delivery eliminado');
  ok(!!document.getElementById('cta'), 'Sección CTA final presente');
  ok(document.querySelectorAll('.lp-product').length === 4, '4 productos en vista previa del menú');

  // Sin emojis / pictogramas en el DOM del Landing (usar Boxicons)
  const landingText = document.querySelector('.landing').textContent;
  const emojiRe = /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\uFE0F]|[\u2600-\u27BF]/;
  ok(!emojiRe.test(landingText), 'Landing sin emojis ni pictogramas (Boxicons)');
  ok(document.querySelectorAll('.landing i.bx').length >= 20, 'Landing usa Boxicons (' + document.querySelectorAll('.landing i.bx').length + ')');

  // ACCEDER => login
  clickLogin();
  await sleep(60);
  ok(!!document.querySelector('.login-screen'), 'ACCEDER lleva al login');

  // 2. login as user via real submit handler
  const userRes = window.__AUTH.login('usuario@intesud.edu.ec', 'estudiante123', false);
  ok(userRes.ok === true, 'Auth.login (usuario) ok');
  window.__ROUTE('home');
  await sleep(60);
  ok(!!document.querySelector('.user-header'), 'Usuario entra a su panel (user-header)');
  ok(!!document.querySelector('.app'), 'Usuario: shell de usuario renderizado');
  ok(!document.body.classList.contains('is-landing'), 'is-landing removido tras iniciar sesión');

  // logout -> landing
  window.localStorage.removeItem('int_session');
  window.__HANDLE();
  await sleep(60);
  ok(!!document.querySelector('.landing'), 'Tras logout vuelve al Landing');

  // 3. adminbar
  clickLogin();
  await sleep(60);
  const barRes = window.__AUTH.login('adminbar@intesud.edu.ec', 'adminbar123', false);
  ok(barRes.ok === true && barRes.user.role === 'adminbar', 'Auth.login (adminbar) ok');
  window.__ROUTE('adminbar/dashboard');
  await sleep(60);
  ok(!!document.querySelector('.admin-layout'), 'Admin bar entra a su panel (admin-layout)');
  ok(window.currentUser() && window.currentUser().role === 'adminbar', 'Rol adminbar activo');

  // 4. admindev
  window.localStorage.removeItem('int_session');
  window.__HANDLE();
  await sleep(60);
  clickLogin();
  await sleep(60);
  const devRes = window.__AUTH.login('developer@system.local', 'developer123', false);
  ok(devRes.ok === true && devRes.user.role === 'admindev', 'Auth.login (admindev) ok');
  window.__ROUTE('admindev/dashboard');
  await sleep(60);
  ok(!!document.querySelector('.admin-layout'), 'Admin dev entra a su panel (admin-layout)');
  ok(window.currentUser() && window.currentUser().role === 'admindev', 'Rol admindev activo');

  // 5. Sin sesión, cualquier ruta interna muestra Landing (no rompe rutas)
  window.localStorage.removeItem('int_session');
  window.__HANDLE();
  await sleep(60);
  ok(!!document.querySelector('.landing'), 'Sin sesión se muestra el Landing público');

  // 6. Sin sesión, #login sigue mostrando login directamente
  window.location.hash = 'login';
  window.__HANDLE();
  await sleep(60);
  ok(!!document.querySelector('.login-screen'), '#login sigue mostrando login sin sesión');

  ok(jsdomErrors.length === 0, 'Sin errores JavaScript (' + jsdomErrors.length + ')');

  console.log('\nResultado:', failures === 0 ? 'TODOS LOS CHECKS PASARON' : failures + ' FALLOS');
  if (jsdomErrors.length) console.log(jsdomErrors);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('EXCEPCIÓN', e); process.exit(2); });
