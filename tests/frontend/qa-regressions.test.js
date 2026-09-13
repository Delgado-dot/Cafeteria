// Casos de regresión de QA-01 a QA-07. Ejecuta los scripts reales con API controlada.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../frontend');
const { JSDOM } = require(path.join(root, 'node_modules/jsdom'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const code = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => fs.readFileSync(path.join(root, m[1]), 'utf8')).join('\n;');
const dom = new JSDOM(html, { url: 'http://localhost/#login', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.scrollTo = () => {};
w.HTMLElement.prototype.scrollTo = () => {};
w.HTMLElement.prototype.scrollIntoView = () => {};
const errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.eval(code + '\n;window.qa = {Cart, Store, Auth};');
const { Cart, Store, Auth } = w.qa;
const product = { id: 1, name: 'Café', price: 2, stock: 10, available: true, prepMin: 5 };
const milk = { id: 1, name: 'Leche', price: '0.50' };
const config = { is_open: true, total_capacity: 100, current_capacity: 0, enabled: false };
let methods = [];
let methodsFail = false;
let posts = [];
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS:', label); }
function mockApi() {
  w.ApiClient.get = async url => String(url).includes('/methods/')
    ? methodsFail ? { ok: false, status: 503 } : { ok: true, data: methods }
    : { ok: true, data: config };
  w.ApiClient.post = async (url, data) => { posts.push(data); return { ok: false, data: { detail: 'Rechazo controlado' } }; };
}
function seed() { Store.products = [product]; Cart.items = []; Cart.add(product, 2, [milk], ''); }
async function checkout() { mockApi(); await w.renderCheckout(w.document.querySelector('#app')); }
function choose(code) { w.document.querySelector(`[data-p="${code}"]`).click(); }
function attach(name, type, content = 'QA') {
  const file = new w.File([content], name, { type });
  const input = w.document.querySelector('#voucherInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
}
async function main() {
  await new Promise(resolve => w.addEventListener('load', resolve, { once: true }));
  w.onhashchange = null;
  w.renderLogin();
  w.document.querySelector('#li_email').value = 'qa@intesud.edu.ec';
  w.document.querySelector('#loginForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
  check('QA-06: contraseña vacía muestra error sin excepción', () => {
    assert.match(w.document.querySelector('#li_passErr').textContent, /Ingresa tu contraseña/);
    assert.equal(errors.length, 0);
  });
  w.document.querySelector('#li_pass').value = 'clave';
  w.document.querySelector('#li_pass').dispatchEvent(new w.Event('input'));
  check('QA-06: escribir elimina la validación', () => assert.equal(w.document.querySelector('#li_passErr').textContent, ''));

  const originalPost = w.ApiClient.post;
  w.ApiClient.post = async () => ({ ok: false, status: 401, data: { detail: 'Credenciales incorrectas' } });
  const loginRes = await Auth.login('qa@intesud.edu.ec', 'clave-mala', false);
  check('QA-06: credenciales incorrectas mapean al campo de contraseña', () => {
    assert.equal(loginRes.ok, false);
    assert.equal(loginRes.field, 'password');
  });
  w.document.querySelector('#li_email').value = 'qa@intesud.edu.ec';
  w.document.querySelector('#li_pass').value = 'clave-mala';
  w.document.querySelector('#loginForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 30));
  check('QA-06: 401 del backend muestra error en el campo de contraseña, no en usuario/correo', () => {
    assert.match(w.document.querySelector('#li_passErr').textContent, /Credenciales incorrectas/);
    assert.equal(w.document.querySelector('#li_emailErr').textContent, '');
  });
  w.ApiClient.post = originalPost;
  w.document.querySelector('#li_email').value = '';
  w.document.querySelector('#li_pass').value = '';
  const originalRoute = w.handleRoute;
  let renders = 0;
  w.handleRoute = () => { renders++; };
  w.onhashchange = () => w.handleRoute();
  w.setRoute('qa-routing');
  await new Promise(resolve => setTimeout(resolve, 20));
  check('Navegación: un cambio de ruta produce un solo render', () => assert.equal(renders, 1));
  w.handleRoute = originalRoute;
  w.onhashchange = null;
  const staleContainer = w.document.createElement('div');
  w.document.body.appendChild(staleContainer);
  let finishConfig;
  const configPending = new Promise(resolve => { finishConfig = resolve; });
  w.ApiClient.get = async url => String(url).includes('/config/') ? configPending : { ok: true, data: [] };
  w.userHome(staleContainer);
  staleContainer.remove();
  finishConfig({ ok: true, data: config });
  await new Promise(resolve => setTimeout(resolve, 20));
  check('Navegación: respuesta tardía no escribe en la vista cerrada', () => { assert.equal(staleContainer.innerHTML, ''); assert.deepEqual(errors, []); });
  Auth.set({ id: 1, name: 'QA', email: 'qa@intesud.edu.ec', role: 'user' });
  Store.products = [product]; Cart.items = [];
  Cart.add(product, 1, [milk], 'Con leche'); Cart.add(product, 1, [], 'Sin leche');
  check('QA-02: personalizaciones separadas y total $4.50', () => { assert.equal(Cart.items.length, 2); assert.equal(Cart.total(), 4.5); });
  const plainKey = Cart.lineKey(Cart.items[1]);
  Cart.setQty(plainKey, 2);
  check('QA-02: cambiar una línea conserva la otra', () => { assert.equal(Cart.items[0].qty, 1); assert.equal(Cart.items[1].qty, 2); });
  Cart.remove(plainKey);
  check('QA-02: quitar variante no elimina el resto', () => { assert.equal(Cart.items.length, 1); assert.equal(Cart.items[0].note, 'Con leche'); });
  Cart.add(product, 1, [milk], 'Con leche');
  check('QA-02: selecciones idénticas se combinan', () => { assert.equal(Cart.items.length, 1); assert.equal(Cart.items[0].qty, 2); });
  Cart.add(product, 8, [], '');
  check('QA-02: stock compartido por todas las variantes', () => { assert.equal(Cart.add(product, 1, [], 'Otra').ok, false); Cart.setQty(Cart.lineKey(Cart.items[0]), 3); assert.equal(Cart.items[0].qty, 2); });
  Store.products = [];
  check('QA-07: producto ausente no rompe cantidad ni eliminación', () => { const key = Cart.lineKey(Cart.items[0]); assert.doesNotThrow(() => Cart.setQty(key, 3)); assert.equal(Cart.items[0].qty, 2); Cart.remove(key); assert.equal(Cart.items.length, 1); });
  seed();
  let configReads = 0;
  let finishCapacity;
  const pendingCapacity = new Promise(resolve => { finishCapacity = resolve; });
  w.ApiClient.get = async () => ++configReads === 3 ? pendingCapacity : { ok: true, data: config };
  const cartRendering = w.renderCart(w.document.querySelector('#app'));
  await new Promise(resolve => setTimeout(resolve, 20));
  check('Continuar responde mientras termina de cargar la capacidad', () => assert.equal(typeof w.document.querySelector('#btnCheckout').onclick, 'function'));
  finishCapacity({ ok: true, data: config });
  await cartRendering;
  methods = [{ id: 7, code: 'efectivo', name: 'Efectivo', requires_voucher: false }];
  await checkout(); await w.confirmOrder();
  check('QA-01: dos cafés con leche envían dos adicionales', () => { assert.equal(Cart.total(), 5); assert.equal(posts.at(-1).items[0].addons[0].quantity, 2); assert.equal(posts.at(-1).payment_method, 7); });
  check('Pedido rechazado conserva carrito y reactiva botón', () => { assert.equal(Cart.count(), 2); assert.equal(w.document.querySelector('#btnConfirm').disabled, false); });
  posts = []; methods = []; await checkout(); await w.confirmOrder();
  check('QA-04: lista vacía bloquea confirmación sin inventar medios', () => { assert.equal(w.document.querySelectorAll('[data-p]').length, 0); assert.equal(w.document.querySelector('#btnConfirm').disabled, true); assert.equal(posts.length, 0); });
  methodsFail = true; await checkout(); await w.confirmOrder();
  check('QA-04: caída de métodos muestra error y no envía pedido', () => { assert.match(w.document.querySelector('#payOptions').textContent, /No se pudieron cargar/); assert.equal(posts.length, 0); });
  methodsFail = false;
  methods = [{ id: 7, code: 'deuna', name: 'DEUNA', requires_voucher: true }, { id: 8, code: 'transferencia', name: 'Transferencia', requires_voucher: true }, { id: 9, code: 'otro', name: 'Otro', requires_voucher: true }];
  await checkout();
  check('QA-03: DEUNA tiene control de archivo y no muestra QR falso', () => { assert.ok(w.document.querySelector('#voucherInput')); assert.equal(w.document.querySelector('.qr-pattern'), null); });
  await w.confirmOrder();
  check('QA-03: comprobante obligatorio bloquea antes de adjuntar', () => assert.equal(posts.length, 0));
  attach('recibo.pdf', 'application/pdf'); await w.confirmOrder();
  check('QA-03: archivo DEUNA viaja en multipart junto al pedido', () => { const data = posts.at(-1); assert.ok(data instanceof w.FormData); assert.equal(data.get('voucher').name, 'recibo.pdf'); assert.equal(JSON.parse(data.get('items'))[0].addons[0].quantity, 2); });
  choose('transferencia');
  check('Cambiar método borra comprobante anterior', () => assert.equal(w._voucher, undefined));
  attach('archivo.txt', 'text/plain');
  check('Comprobante con formato inválido rechazado', () => assert.equal(w._voucher, undefined));
  attach('grande.pdf', 'application/pdf', 'x'.repeat(2 * 1024 * 1024 + 1));
  check('Comprobante mayor a 2 MB rechazado', () => assert.equal(w._voucher, undefined));
  choose('otro');
  check('Método personalizado también permite comprobante', () => assert.ok(w.document.querySelector('#voucherInput')));
  attach('nuevo.pdf', 'application/pdf'); await checkout();
  check('Volver al checkout no reutiliza archivo de otro intento', () => assert.equal(w._voucher, undefined));
  const orders = Array.from({ length: 41 }, (_, i) => ({ id: i + 1, order_number: `QA-${i + 1}`, status: 'delivered', total: '5.00', items: [], created_at: new Date().toISOString(), payment_status: 'paid' }));
  let urls = [];
  w.ApiClient.get = async url => {
    urls.push(url); const u = new URL(url);
    if (u.pathname.includes('/products/')) return { ok: true, data: [] };
    const page = Number(u.searchParams.get('page') || 1);
    return { ok: true, data: { count: 41, results: orders.slice((page - 1) * 20, page * 20), next: page < 3 ? `?page=${page + 1}` : null } };
  };
  await w.renderOrders(w.document.querySelector('#app'));
  check('QA-05: 41 pedidos accesibles más allá de los límites 20 y 30', () => { assert.equal(w.document.querySelectorAll('[data-history-detail]').length, 41); assert.equal(urls.length, 3); });
  await w.barSalesDashboard(w.document.querySelector('#app'));
  check('QA-05: ventas incluyen tres páginas ($205 y 41 pedidos)', () => { const totals = [...w.document.querySelectorAll('[data-sales-count]')].map(el => el.dataset.salesCount); assert.ok(totals.includes('205')); assert.ok(totals.includes('41')); });
  w.ApiClient.get = async url => String(url).includes('page=2') ? { ok: false, status: 503 } : { ok: true, data: { results: orders.slice(0, 20), next: '?page=2' } };
  const failed = await w.ApiClient.getAll(w.API_ENDPOINTS.orders.list);
  check('Paginación interrumpida no devuelve un total parcial exitoso', () => assert.equal(failed.ok, false));
  urls = [];
  w.ApiClient.get = async url => { urls.push(url); return { ok: true, data: { results: [], next: 'https://otro.example/page2' } }; };
  const external = await w.ApiClient.getAll(w.API_ENDPOINTS.orders.list);
  check('Paginación no sigue enlaces fuera del servidor', () => { assert.equal(external.ok, false); assert.equal(urls.length, 1); });
  w.ApiClient.get = async url => ({ ok: true, data: { results: [], next: url } });
  const repeated = await w.ApiClient.getAll(w.API_ENDPOINTS.orders.list);
  check('Paginación repetida termina con error', () => assert.equal(repeated.ok, false));
  check('Sin excepciones de JavaScript durante los flujos', () => assert.deepEqual(errors, []));
  console.log(`Resultado: ${checks} comprobaciones QA aprobadas`);
  dom.window.close();
}
main().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
