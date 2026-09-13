const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', 'frontend');

let JSDOM;
try {
  JSDOM = require(path.join(root, 'node_modules', 'jsdom')).JSDOM;
} catch (e) {
  console.error('ERROR: falta jsdom. Instala las dependencias del frontend antes de ejecutar las pruebas.');
  process.exit(1);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
let js = scriptSrcs.map((s) => fs.readFileSync(path.join(root, s), 'utf8')).join('\n;\n');
js += '\n;window.__AUTH = Auth; window.__STORE = Store; window.__SESS = SessionStore;';

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  beforeParse(window) {
    window.scrollTo = () => {};
    window.HTMLElement.prototype.scrollTo = function () {};
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

const mockConfig = {
  name: 'Cafetería Test',
  hero_background_url: 'http://127.0.0.1:8000/media/home/fododeledificio.png',
  barra_atencion_image_url: 'http://127.0.0.1:8000/media/home/barra_atencion.webp',
  espacio_disfrutar_image_url: 'http://127.0.0.1:8000/media/home/espacio_disfrutar.webp',
  cafe_snacks_image_url: 'http://127.0.0.1:8000/media/home/cafe_snacks.webp',
  login_background_url: 'http://127.0.0.1:8000/media/site/login/fondo_nuevo.png',
  login_mascot_url: 'http://127.0.0.1:8000/media/site/login/panda_nuevo.png',
  system_logo_url: 'http://127.0.0.1:8000/media/site/logo/logo_nuevo.png',
};

window.eval(js);

// Interceptar la API: la configuración se sirve con las URL de apariencia.
const _earlyGet = window.ApiClient.get.bind(window.ApiClient);
window.ApiClient.get = async (url) => {
  const u = String(url);
  if (u.includes('/api/config/current/')) return { ok: true, data: mockConfig };
  if (u.includes('/api/delivery/')) return { ok: true, data: {} };
  if (u.includes('/api/auth/users/')) return { ok: true, data: { results: [] } };
  if (u.includes('/api/auth/permissions/')) return { ok: true, data: [] };
  if (u.includes('/api/audit/')) return { ok: true, data: { results: [] } };
  if (u.includes('/api/products/')) return { ok: true, data: [] };
  return _earlyGet(u).catch(() => ({ ok: false, data: null }));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function ok(cond, label) {
  if (cond) { console.log('PASS:', label); }
  else { failures++; console.log('FAIL:', label); }
}

(async () => {
  // Dejar que el arranque (landing público + datos iniciales) se resuelva.
  await sleep(150);

  // -- 1) Login usa la configuración guardada cuando está disponible ------
  window.__STORE.config = mockConfig;
  window.renderLogin();
  const mascot = document.querySelector('.login-mascot img');
  ok(mascot && mascot.src === mockConfig.login_mascot_url, 'Login: la mascota usa login_mascot_url');
  const logo = document.querySelector('.login-logo');
  ok(logo && logo.src === mockConfig.system_logo_url, 'Login: el logo usa system_logo_url');
  const screen = document.querySelector('.login-screen.login-screen--auth');
  ok(screen && screen.style.getPropertyValue('--auth-background') === `url('${mockConfig.login_background_url}')`, 'Login: el fondo usa login_background_url');

  // -- 2) bindAssetCssVars aplica la configuración a CSS y favicon --------
  window.bindAssetCssVars(mockConfig);
  const rootStyle = document.documentElement.style;
  ok(rootStyle.getPropertyValue('--auth-background') === `url('${mockConfig.login_background_url}')`, 'CSS var --auth-background configurado');
  ok(rootStyle.getPropertyValue('--login-background') === `url('${mockConfig.login_background_url}')`, 'CSS var --login-background configurado');
  const icon = document.querySelector('link[rel="icon"]');
  ok(icon && icon.href === mockConfig.system_logo_url, 'Favicon usa system_logo_url');

  // -- 3) Fallback si no hay configuración guardada y mejora al recibirla --
  window.__STORE.config = {};
  window.renderLogin();
  let logo2 = document.querySelector('.login-logo');
  ok(logo2 && logo2.src.includes('/api/assets/bar-intesud-logo'), 'Login sin config: logo predeterminado');
  let mascot2 = document.querySelector('.login-mascot img');
  ok(mascot2 && mascot2.src.includes('/api/assets/images/panda-login'), 'Login sin config: mascota predeterminada');
  await sleep(80);
  logo2 = document.querySelector('.login-logo');
  ok(logo2 && logo2.src === mockConfig.system_logo_url, 'Login: al llegar la configuración aplica system_logo_url');
  mascot2 = document.querySelector('.login-mascot img');
  ok(mascot2 && mascot2.src === mockConfig.login_mascot_url, 'Login: al llegar la configuración aplica login_mascot_url');

  // -- 4) Fallback total sin backend: los fallbacks no usan blob: ---------
  window.__STORE.config = {};
  const defaultScreen = document.querySelector('.login-screen.login-screen--auth');
  ok(defaultScreen && !defaultScreen.style.getPropertyValue('--auth-background').includes('blob:'), 'Login: el fondo no depende de blob:');

  // -- 5) Sección Apariencia en DevAdmin (solo admindev) ------------------
  window.__STORE.config = mockConfig;
  window.__AUTH.set({ id: 99, name: 'Dev QA', username: 'devqa', email: 'devqa@intesud.edu.ec', role: 'admindev' });
  window.__SESS.set('access_token', 'fake');
  window.__SESS.set('refresh_token', 'fake');
  await window.renderDevAdmin('appearance');
  await sleep(40);
  const bodyText = document.body.textContent || '';
  ok(bodyText.includes('Apariencia del sistema'), 'DevAdmin: sección Apariencia renderizada');
  ok(bodyText.includes('Fondo del Landing'), 'DevAdmin: tarjeta Fondo del Landing');
  ok(bodyText.includes('Fondo del Login'), 'DevAdmin: tarjeta Fondo del Login');
  ok(bodyText.includes('Mascota del Login'), 'DevAdmin: tarjeta Mascota del Login');
  ok(bodyText.includes('Logo del sistema'), 'DevAdmin: tarjeta Logo del sistema');
  ok(bodyText.includes('Barra de atención'), 'DevAdmin: tarjeta galería Barra de atención');
  const previewCount = document.querySelectorAll('#appGroups .app-thumb img').length;
  ok(previewCount === 7, 'DevAdmin: siete vistas previas de imágenes');
  const resetButtons = document.querySelectorAll('[data-reset]:not([disabled])').length;
  ok(resetButtons === 7, 'DevAdmin: todas las imágenes permiten restaurar predeterminada');

  // -- 6) Sin errores JS durante la sesión --------------------------------
  ok(jsdomErrors.length === 0, 'Sin errores JS: ' + (jsdomErrors[0] || ''));

  console.log(failures
    ? '\nResultado: ' + failures + ' COMPROBACIÓN(ES) FALLARON'
    : '\nResultado: TODOS LOS CHECKS PASARON');
  process.exit(failures ? 1 : 0);
})();
