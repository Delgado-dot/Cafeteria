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

  // Logout: la UI y sessionStorage deben cambiar antes de que responda el backend.
  async function verifyAdminLogout({ role, page, renderName, menuId, dropdownId, logoutId }) {
    const adminDom = new JSDOM(html, { url: `http://localhost/#${role}/${page}`, runScripts: 'outside-only', pretendToBeVisual: true });
    const adminWindow = adminDom.window;
    adminWindow.scrollTo = () => {};
    adminWindow.HTMLElement.prototype.scrollTo = () => {};
    adminWindow.HTMLElement.prototype.scrollIntoView = () => {};
    const adminErrors = [];
    adminWindow.addEventListener('error', event => adminErrors.push(event.message));
    adminWindow.eval(code + '\n;window.adminQa={Auth, SessionStore, ApiClient, renderBarAdmin, renderDevAdmin};');
    await new Promise(resolve => adminWindow.addEventListener('load', resolve, { once: true }));
    const qa = adminWindow.adminQa;
    qa.Auth.set({ id: 99, name: 'Gaby Test', username: 'gaby', email: 'gaby@intesud.edu.ec', role });
    qa.SessionStore.set('access_token', 'fake-token');
    qa.SessionStore.set('refresh_token', 'fake-refresh');
    qa.ApiClient.get = async () => ({ ok: true, data: [] });
    qa.ApiClient.getAll = async () => ({ ok: true, data: [] });

    await qa[renderName](page);
    await new Promise(resolve => setTimeout(resolve, 0));
    const menu = adminWindow.document.querySelector(menuId);
    const dropdown = adminWindow.document.querySelector(dropdownId);
    const logout = adminWindow.document.querySelector(logoutId);
    assert.ok(menu && dropdown && logout, `controles de logout ${role}`);
    menu.click();
    assert.equal(dropdown.style.display, 'block');

    let finishRevocation;
    let revocationRequests = 0;
    const pendingRevocation = new Promise(resolve => { finishRevocation = resolve; });
    qa.ApiClient.post = async url => {
      if (String(url).includes('/logout/')) revocationRequests++;
      return pendingRevocation;
    };
    logout.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    check(`Regresión logout ${role}: limpia sessionStorage antes de la respuesta`, () => {
      assert.equal(qa.SessionStore.get('int_session'), null);
      assert.equal(qa.SessionStore.get('access_token'), null);
      assert.equal(qa.SessionStore.get('refresh_token'), null);
    });
    check(`Regresión logout ${role}: cierra dropdown y desmonta admin-layout`, () => {
      assert.equal(dropdown.style.display, 'none');
      assert.equal(adminWindow.document.querySelector('.admin-layout'), null);
    });
    check(`Regresión logout ${role}: Login visible sin F5 ni esperar al backend`, () => {
      assert.equal(adminWindow.location.hash, '#login');
      assert.ok(adminWindow.document.querySelector('.login-screen'));
      assert.equal(revocationRequests, 1);
    });
    check(`Regresión logout ${role}: 0 errores JS`, () => assert.deepEqual(adminErrors, []));
    finishRevocation({ ok: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    adminDom.window.close();
  }

  await verifyAdminLogout({ role: 'adminbar', page: 'products', renderName: 'renderBarAdmin', menuId: '#barUserMenu', dropdownId: '#barUserDropdown', logoutId: '#btnBarLogout' });
  await verifyAdminLogout({ role: 'admindev', page: 'dashboard', renderName: 'renderDevAdmin', menuId: '#devUserMenu', dropdownId: '#devUserDropdown', logoutId: '#btnDevLogout' });

  // Guardar producto: un solo PATCH, refresco real de lista y toast posterior al refresco.
  await (async () => {
    const productDom = new JSDOM(html, { url: 'http://localhost/#adminbar/products', runScripts: 'outside-only', pretendToBeVisual: true });
    const productWindow = productDom.window;
    productWindow.scrollTo = () => {};
    productWindow.HTMLElement.prototype.scrollTo = () => {};
    productWindow.HTMLElement.prototype.scrollIntoView = () => {};
    const productErrors = [];
    productWindow.addEventListener('error', event => productErrors.push(event.message));
    productWindow.eval(code + '\n;window.productQa={Auth, SessionStore, ApiClient, productFormModal};');
    await new Promise(resolve => productWindow.addEventListener('load', resolve, { once: true }));
    const qa = productWindow.productQa;
    qa.Auth.set({ id: 100, name: 'Gaby Test', username: 'gaby', email: 'gaby@intesud.edu.ec', role: 'adminbar' });
    qa.SessionStore.set('access_token', 'fake');
    productWindow.document.querySelector('#app').innerHTML = '<div class="admin-layout"><div id="barContent"></div></div>';

    const cat = { id: 1, name: 'Snacks' };
    const product = { id: 99, name: 'Test Product', price: 1, stock: 5, minStock: 2, prepMin: 5, available: true, category: 'Snacks', image: '/media/original.webp', desc: 'Original' };
    const updatedProduct = { id: 99, name: 'Test Product Edit', price: '1.50', stock: 8, min_stock: 3, prep_time: 7, available: false, category: 1, category_name: 'Snacks', image: '/media/original.webp', description: 'Actualizado' };
    let patchCount = 0;
    let patchPayload = null;
    let productListReads = 0;
    let finishPatch;
    const pendingPatch = new Promise(resolve => { finishPatch = resolve; });
    qa.ApiClient.get = async url => String(url).includes('/categories') ? { ok: true, data: [cat] } : { ok: true, data: {} };
    qa.ApiClient.post = async () => ({ ok: true, data: { id: 1 } });
    qa.ApiClient.getAll = async () => {
      productListReads++;
      return { ok: true, data: [updatedProduct] };
    };
    qa.ApiClient.patch = async (url, data) => {
      patchCount++;
      patchPayload = data;
      return pendingPatch;
    };

    await qa.productFormModal(product);
    const modal = productWindow.document.querySelector('.modal-overlay');
    assert.ok(modal, 'modal existe');
    const btnSave = productWindow.document.querySelector('#btnSaveProduct');
    assert.ok(btnSave, 'botón Guardar existe');
    const changes = { pfName: 'Test Product Edit', pfPrice: '1.50', pfStock: '8', pfPrep: '7', pfMin: '3', pfDesc: 'Actualizado' };
    Object.entries(changes).forEach(([id, value]) => {
      const field = productWindow.document.querySelector(`#${id}`);
      field.value = value;
      field.dispatchEvent(new productWindow.Event('input', { bubbles: true }));
    });
    const active = productWindow.document.querySelector('#pfActive');
    active.checked = false;
    active.dispatchEvent(new productWindow.Event('change', { bubbles: true }));
    assert.equal(btnSave.disabled, false);

    btnSave.click();
    btnSave.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    check('Regresión guardar: botón muestra Guardando y deshabilitado', () => {
      assert.match(btnSave.textContent, /Guardando/);
      assert.equal(btnSave.disabled, true);
      assert.equal(btnSave.dataset.saving, '1');
      assert.equal(patchCount, 1);
    });
    finishPatch({ ok: true, status: 200, data: updatedProduct });
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    check('Regresión guardar: exactamente 1 PATCH', () => assert.equal(patchCount, 1));
    check('Regresión guardar: PATCH contiene nombre, precio, stock y estado', () => {
      assert.equal(patchPayload.name, 'Test Product Edit');
      assert.equal(patchPayload.price, 1.5);
      assert.equal(patchPayload.stock, 8);
      assert.equal(patchPayload.available, false);
      assert.equal(patchPayload.image, undefined, 'conserva la imagen existente sin reenviarla');
    });
    check('Regresión guardar: modal desaparece', () => assert.equal(productWindow.document.querySelector('.modal-overlay'), null));
    check('Regresión guardar: lista actualizada', () => {
      assert.equal(productListReads, 1);
      assert.match(productWindow.document.querySelector('#prodRows').textContent, /Test Product Edit/);
      assert.match(productWindow.document.querySelector('#prodRows').textContent, /Inactivo/);
    });
    check('Regresión guardar: mensaje de éxito visible', () => {
      const successToast = productWindow.document.querySelector('.toast.success');
      assert.ok(successToast);
      assert.match(successToast.textContent, /producto actualizado correctamente/i);
    });
    check('Regresión guardar: botón restaurado', () => {
      assert.equal(btnSave.disabled, false);
      assert.equal(btnSave.textContent, 'Guardar cambios');
      assert.equal(btnSave.dataset.saving, undefined);
    });

    const replacementProduct = { ...product, name: updatedProduct.name, price: 1.5, stock: 8, minStock: 3, prepMin: 7, available: false, desc: 'Actualizado' };
    let multipartPayload = null;
    qa.ApiClient.patch = async (url, data) => {
      multipartPayload = data;
      return { ok: true, status: 200, data: { ...updatedProduct, image: '/media/reemplazo.webp' } };
    };
    await qa.productFormModal(replacementProduct);
    const imageInput = productWindow.document.querySelector('#pfImage');
    const replacementFile = new productWindow.File(['imagen'], 'reemplazo.webp', { type: 'image/webp' });
    Object.defineProperty(imageInput, 'files', { configurable: true, value: [replacementFile] });
    imageInput.dispatchEvent(new productWindow.Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    const imageSave = productWindow.document.querySelector('#btnSaveProduct');
    imageSave.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    check('Regresión guardar: reemplazo de imagen usa multipart y cierra modal', () => {
      assert.ok(multipartPayload instanceof productWindow.FormData);
      assert.equal(multipartPayload.get('image').name, 'reemplazo.webp');
      assert.equal(productWindow.document.querySelector('.modal-overlay'), null);
    });

    for (const status of [400, 403, 409, 500]) {
      qa.ApiClient.patch = async () => ({ ok: false, status, data: { detail: `Error ${status}` } });
      await qa.productFormModal(replacementProduct);
      const stockField = productWindow.document.querySelector('#pfStock');
      stockField.value = String(status);
      stockField.dispatchEvent(new productWindow.Event('input', { bubbles: true }));
      const errorSave = productWindow.document.querySelector('#btnSaveProduct');
      errorSave.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));
      check(`Regresión guardar: error ${status} conserva modal y restaura botón`, () => {
        assert.ok(productWindow.document.querySelector('.modal-overlay'));
        assert.equal(errorSave.disabled, false);
        assert.equal(errorSave.textContent, 'Guardar cambios');
        assert.equal(errorSave.dataset.saving, undefined);
        assert.ok(productWindow.document.querySelector('.toast.error'));
      });
      productWindow.document.querySelector('.modal-overlay').remove();
    }
    check('Regresión guardar: 0 errores JS', () => assert.deepEqual(productErrors, []));
    productDom.window.close();
  })();

  check('Regresiones: no se usa location.reload', () => assert.doesNotMatch(code, /location\.reload\s*\(/));

  console.log(`Resultado: ${checks} comprobaciones QA aprobadas`);
  dom.window.close();
}
main().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
