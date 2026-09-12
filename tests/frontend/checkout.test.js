// Checkout tests (Tarea #1). Carga TODOS los scripts del frontend en jsdom
// (igual que landing-smoke.test.js) y ejercita confirmOrder()/renderConfirmation()
// contra un ApiClient simulado (los mocks solo se usan dentro del test).
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

// Carrito válido sembrado ANTES de que cart.js evalúe Cart.items
const seededCart = [
  { productId: 1, qty: 2, name: 'Café', price: 1.5, basePrice: 1.5, addons: [], note: '', prepMin: 5 },
  { productId: 2, qty: 1, name: 'Sándwich', price: 2.5, basePrice: 2.5, addons: [], note: '', prepMin: 5 },
];

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
    window.localStorage.setItem('int_cart', JSON.stringify(seededCart));
  },
});

const { window } = dom;
const { document } = window;

const jsdomErrors = [];
window.addEventListener('error', (e) => jsdomErrors.push('window.error: ' + (e.message || e.error)));

const mockConfig = {
  total_capacity: 10,
  current_capacity: 4,
  is_open: true,
  order_open_time: '09:00',
  order_close_time: '09:45',
  break_start: '10:00',
  break_end: '10:15',
};

// Respuesta REAL de POST /api/orders/ según OrderSerializer (snake_case)
const mockOrderCreated = {
  id: 42,
  order_number: 'ORD-0042',
  user_name: 'Kevin Test',
  user_email: 'kevin@test.intesud',
  status: 'queue',
  status_label: 'En cola',
  priority: 'normal',
  delivery_method: 'delivery',
  delivery_info: { piso: '2', aula: '2A1' },
  payment_status: 'pending',
  total: '5.50',
  estimated_time: 6,
  note: '',
  items: [
    { product_id: 1, quantity: 2, product_name: 'Café', unit_price: '1.50', addons: [] },
    { product_id: 2, quantity: 1, product_name: 'Sándwich', unit_price: '2.50', addons: [] },
  ],
  created_at: '2026-09-11T12:00:00Z',
  updated_at: '2026-09-11T12:00:00Z',
};

window.eval(js + '\n;window.__Cart = Cart;');

// --- Mocks de red (solo dentro del test) ---
let failCapacity = false;
let failOrder = false;
let orderPostCount = 0;
let lastPostData = null;

window.ApiClient.get = async (url) => {
  const u = String(url);
  if (u.includes('/api/config/current/')) {
    return failCapacity ? { ok: false, data: null } : { ok: true, data: mockConfig };
  }
  if (u.includes('/api/products/')) return { ok: true, data: [] };
  if (u.includes('/api/products/categories/')) return { ok: true, data: [] };
  return { ok: true, data: [] };
};
window.ApiClient.post = async (url, data) => {
  if (String(url).includes('/api/orders/')) {
    orderPostCount += 1;
    lastPostData = data;
    return failOrder
      ? { ok: false, data: { detail: 'Stock insuficiente' } }
      : { ok: true, data: mockOrderCreated };
  }
  return { ok: false, data: null };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function ok(cond, label) {
  if (cond) { console.log('PASS:', label); }
  else { failures++; console.log('FAIL:', label); }
}

function toastText() {
  return Array.from(document.querySelectorAll('.toast-wrap .toast')).map((t) => t.textContent).join(' | ');
}

const cartCount = () => (JSON.parse(window.localStorage.getItem('int_cart') || '[]') || []).length;

function setupConfirmState(payMethod) {
  window._payMethod = payMethod || 'deuna';
  window._payMethodDbId = '1';
  window._payMethodRequiresVoucher = false;
  delete window._deliveryInfo;
  delete window._voucher;
}

async function main() {
  await sleep(80);

  // 1 + 2. Carrito válido + capacidad real desde API
  ok(cartCount() === 2, 'Carrito válido sembrado (2 ítems)');
  const cap = await window.fetchCapacityInfo();
  ok(cap.ok === true, 'fetchCapacityInfo OK contra API real (config/current)');
  ok(cap.total === 10 && cap.used === 4 && cap.pct === 40 && cap.state === 'DISPONIBLE', 'Capacidad real calculada: 4/10 (40%)');

  // 6. Conversión snake_case -> formato frontend (mapApiOrder de orders.js)
  const mapped = window.mapApiOrder(mockOrderCreated);
  ok(mapped.id === 'ORD-0042' && mapped.apiId === 42, 'mapApiOrder: id -> order_number');
  ok(mapped.delivery === 'delivery' && mapped.deliveryInfo.piso === '2' && mapped.deliveryInfo.aula === '2A1', 'mapApiOrder: delivery_method/delivery_info');
  ok(mapped.prepMin === 6 && mapped.paymentStatus === 'pending' && mapped.total === 5.5, 'mapApiOrder: estimated_time/payment_status/total');
  ok(mapped.status === 'queue' && mapped.userName === 'Kevin Test', 'mapApiOrder: status/user_name');

  // 3 + 4 + 5 + 10 + 12. Creación exitosa (delivery) -> confirmación real, carrito limpio, sin ReferenceError
  setupConfirmState('deuna');
  window._deliveryInfo = { piso: '2', aula: '2A1' };
  await window.confirmOrder();
  await sleep(30);
  ok(orderPostCount === 1, 'POST /api/orders/ ejecutado una vez (creación exitosa)');
  ok(cartCount() === 0, 'Carrito limpiado SOLO tras éxito');
  const confText = document.body.textContent;
  ok(!!document.getElementById('confNum'), 'Confirmación renderizada');
  ok((document.getElementById('confNum') || {}).textContent === 'ORD-0042', 'Número/ID real del pedido mostrado');
  ok(confText.includes('6 minutos'), 'Tiempo estimado real (6 min) sin "undefined"');
  ok(confText.includes('Delivery interno') && confText.includes('Piso 2') && confText.includes('Aula 2A1'), 'Delivery mostrado correctamente con piso/aula');
  ok(confText.includes('DEUNA'), 'Método de pago real del usuario mostrado');
  ok(confText.includes('$5.50'), 'Total real devuelto por la API mostrado');
  const itemsEl = document.querySelector('.cart-items-conf');
  ok(itemsEl && itemsEl.textContent.includes('Café') && itemsEl.textContent.includes('2'), 'Productos y cantidades en la confirmación');
  ok(itemsEl && itemsEl.textContent.includes('Sándwich') && itemsEl.textContent.includes('1'), 'Productos y cantidades en la confirmación (2do ítem)');
  ok(!confText.includes('undefined'), 'Sin cadenas "undefined" en la confirmación');
  ok(!confText.includes('Retiro en cafetería'), 'Delivery NO aparece incorrectamente como "Retiro"');
  ok(!jsdomErrors.some((e) => e.includes('ReferenceError') || e.includes('capacityInfo')), 'Sin ReferenceError (capacityInfo) — TAREA 1 CORREGIDA');

  // 5 (pickup). renderConfirmation directo para retiro
  const m2 = window.mapApiOrder({ ...mockOrderCreated, delivery_method: 'pickup', delivery_info: null, order_number: 'ORD-0043' });
  m2.payment = 'efectivo';
  window.renderConfirmation(m2);
  const confPickup = document.body.textContent;
  ok(confPickup.includes('Retiro en cafetería') && !confPickup.includes('Delivery interno'), 'Pickup mostrado como "Retiro en cafetería"');
  ok(!confPickup.includes('undefined'), 'Pickup: sin "undefined"');

  window.__Cart.items = structuredClone(seededCart);
  window.__Cart.save();

  // 7 + 9. Error de capacidad -> NO crea pedido, NO limpia carrito
  failCapacity = true;
  setupConfirmState('deuna');
  window._deliveryInfo = { piso: '2', aula: '2A1' };
  const prevCartCount = cartCount();
  const postBefore = orderPostCount;
  await window.confirmOrder();
  ok(orderPostCount === postBefore, 'Capacidad falla: NO se envía POST de pedido');
  ok(cartCount() === prevCartCount, 'Capacidad falla: carrito NO se limpia');
  ok(toastText().includes('No se pudo consultar la capacidad'), 'Capacidad falla: error visible al usuario');
  failCapacity = false;

  // Re-sembrar carrito para escenarios siguientes
  window.__Cart.items = structuredClone(seededCart);
  window.__Cart.save();

  // 8 + 9. Error de creación -> NO limpia carrito, error visible
  failOrder = true;
  setupConfirmState('deuna');
  await window.confirmOrder();
  ok(orderPostCount === postBefore + 1, 'POST fallido: intento ejecutado pero falla');
  ok(cartCount() === 2, 'Creación falla: carrito NO se limpia');
  ok(toastText().includes('Stock insuficiente'), 'Creación falla: error del detalle API mostrado');
  failOrder = false;

  // 11. Doble envío -> un solo POST
  window.__Cart.items = structuredClone(seededCart);
  window.__Cart.save();
  setupConfirmState('deuna');
  const beforeDouble = orderPostCount;
  const p1 = window.confirmOrder();
  const p2 = window.confirmOrder();
  await Promise.all([p1, p2]);
  ok(orderPostCount === beforeDouble + 1, 'Doble clic: solo 1 POST (guard de doble envío)');

  console.log('\nResultado:', failures === 0 ? 'TODOS LOS CHECKS PASARON' : failures + ' FALLOS');
  if (jsdomErrors.length) console.log(jsdomErrors);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('EXCEPCIÓN', e); process.exit(2); });