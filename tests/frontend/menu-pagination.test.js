/*
 * menu-pagination.test.js
 * Verifica la corrección del menú del usuario: la categoría "Bebidas" debe
 * mostrar sus productos reales aunque estén situados después de los primeros
 * 20 registros (bug: el frontend solo leía la página 1).
 *
 * Confirma:
 *  - El cliente navega por TODAS las páginas de /api/products/ (sigue "next").
 *  - Los chips usan el id real de Category (no nombres hardcodeados).
 *  - El contador de cada categoría corresponde a sus productos reales.
 *  - Al seleccionar Bebidas se listan sus productos aunque estén fuera de la
 *    primera página.
 *  - La búsqueda funciona sobre el catálogo completo.
 */

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
js += '\n;window.__AUTH = Auth; window.__ROUTE = route; window.__HANDLE = handleRoute; window.__STORE = Store;';

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

const BASE = 'http://127.0.0.1:8000';
const BEBIDAS_ID = 10;
const SNACKS_ID = 20;

// 25 productos: los 20 primeros son snacks y todas las bebidas quedan luego,
// replicando el bug real (Bebidas no estaba en la primera página).
const snacks = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, name: `Snack ${String(i + 1).padStart(2, '0')}`, price: '1.00', category: SNACKS_ID, category_name: 'Snacks', description: '', prep_time: 5, stock: 0, min_stock: 3, available: false, addons: [] }));
const bebidas = [
  { id: 1, name: 'Monster', price: '3.00', category: BEBIDAS_ID, category_name: 'Bebidas', description: 'Bebida energética', prep_time: 5, stock: 0, min_stock: 3, available: false, addons: [] },
  { id: 2, name: 'Cocacola grande', price: '0.85', category: BEBIDAS_ID, category_name: 'Bebidas', description: 'Gaseosa', prep_time: 5, stock: 0, min_stock: 3, available: false, addons: [] },
  { id: 3, name: 'Fuze Tea grande', price: '0.80', category: BEBIDAS_ID, category_name: 'Bebidas', description: 'Té', prep_time: 5, stock: 0, min_stock: 3, available: false, addons: [] },
  { id: 4, name: '220V grande', price: '1.10', category: BEBIDAS_ID, category_name: 'Bebidas', description: 'Energética', prep_time: 5, stock: 0, min_stock: 3, available: false, addons: [] },
  { id: 5, name: 'Agua con gas', price: '0.60', category: BEBIDAS_ID, category_name: 'Bebidas', description: 'Agua', prep_time: 5, stock: 0, min_stock: 3, available: false, addons: [] },
];
const allProducts = [...snacks, ...bebidas];

const categories = [
  { id: BEBIDAS_ID, name: 'Bebidas', order: 4, icon: '' },
  { id: SNACKS_ID, name: 'Snacks', order: 1, icon: '' },
];

const mockConfig = { orderOpen: '09:00', orderClose: '09:45', breakStart: '10:00', breakEnd: '10:15', hero_background_url: 'http://127.0.0.1:8000/media/home/fododeledificio.png' };

const fetchedUrls = [];
window.eval(js);

let meUser = null;
window.ApiClient.get = async (url) => {
  const u = String(url);
  fetchedUrls.push(u);
  if (u.includes('/api/auth/me/')) {
    return { ok: true, data: { id: 1, username: 'user@test', email: 'user@test', first_name: 'T', last_name: 'U', role: 'user' } };
  }
  if (u.includes('/api/config/current/')) return { ok: true, data: mockConfig };
  if (u.includes('/api/products/categories/')) return { ok: true, data: categories };
  if (u.includes('/api/products/')) {
    // Simula la paginación real: 20 por página + enlace "next".
    if (u.includes('?page=2')) {
      return { ok: true, data: { count: allProducts.length, next: null, previous: BASE + '/api/products/', results: bebidas } };
    }
    return { ok: true, data: { count: allProducts.length, next: BASE + '/api/products/?page=2', previous: null, results: snacks } };
  }
  return { ok: true, data: [] };
};
window.ApiClient.post = async (url, data) => {
  if (String(url).includes('/api/auth/login/')) {
    meUser = data.username;
    return { ok: true, data: { access: 'fake-jwt-access', refresh: 'fake-jwt-refresh' } };
  }
  return { ok: false };
};

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
  await sleep(120);

  // Iniciar sesión como usuario y abrir el menú
  const loginRes = await window.__AUTH.login('user@test', 'test-pass', false);
  ok(loginRes.ok === true && loginRes.user.role === 'user', 'Auth.login (usuario) ok');
  window.__ROUTE('menu');
  await sleep(200);

  ok(!!document.querySelector('.menu-page'), 'Página de menú renderizada');
  ok(!!document.querySelector('#menuChips'), 'Lista de chips de categorías presente');

  // El cliente navegó por todas las páginas de /api/products/
  ok(
    fetchedUrls.some((u) => u.includes('/api/products/?page=2')),
    'El cliente siguió el enlace "next" (navegación entre páginas)'
  );

  // Contadores reales: "Todas" cuenta los 25 productos, no solo la página 1
  const todasCount = document.querySelector('#menuCount').textContent;
  ok(todasCount === '25 productos', 'Contador "Todas" = 25 productos reales (' + todasCount + ')');

  const chips = [...document.querySelectorAll('#menuChips [data-cat]')];
  ok(chips.length === 3, 'Chips = Todas + categorías reales de la API (' + chips.length + ')');

  // El chip de Bebidas usa el id real y muestra su conteo real (5)
  const bebChip = chips.find((c) => c.dataset.cat === String(BEBIDAS_ID));
  ok(!!bebChip, 'Chip de Bebidas presente con data-cat = id real (' + BEBIDAS_ID + ')');
  const bebBadge = bebChip ? bebChip.querySelector('.cp-badge').textContent : '';
  ok(bebBadge === '5', 'Contador del chip Bebidas = 5 (productos reales)');

  // Seleccionar Bebidas: aparecen sus 5 productos aunque estaban fuera de la
  // primera página de la lista sin filtrar
  bebChip.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  await sleep(50);

  const bebCards = [...document.querySelectorAll('#menuGrid .product-card')];
  ok(bebCards.length === 5, 'Bebidas muestra sus 5 productos (' + bebCards.length + ')');
  const bebNames = bebCards.map((c) => c.querySelector('.product-name').textContent);
  ok(bebNames.some((n) => n.includes('Cocacola grande')), 'Cocacola grande (después del registro 20) visible en Bebidas');
  ok(bebNames.some((n) => n.includes('Monster')), 'Monster visible en Bebidas');
  ok(document.querySelector('#menuCount').textContent === '5 productos', 'Contador indica 5 productos en Bebidas');

  // Búsqueda dentro de Bebidas
  const search = document.querySelector('#menuSearch');
  search.value = 'monster';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(50);
  ok(document.querySelectorAll('#menuGrid .product-card').length === 1, 'Buscar "monster" en Bebidas devuelve 1 resultado');

  // Búsqueda sobre el catálogo completo (Todas)
  const todasChip = chips.find((c) => c.dataset.cat === 'Todas');
  todasChip.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  await sleep(50);
  search.value = 'cocacola';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(50);
  ok(document.querySelectorAll('#menuGrid .product-card').length === 1, 'Buscar "cocacola" en Todas devuelve 1 resultado');

  // Limpiar búsqueda -> se muestran todos
  search.value = '';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(50);
  ok(document.querySelector('#menuCount').textContent === '25 productos', 'Limpiar búsqueda restaura los 25 productos');

  ok(jsdomErrors.length === 0, 'Sin errores JavaScript (' + jsdomErrors.length + ')');

  console.log('\nResultado:', failures === 0 ? 'TODOS LOS CHECKS PASARON' : failures + ' FALLOS');
  if (jsdomErrors.length) console.log(jsdomErrors);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('EXCEPCIÓN', e); process.exit(2); });