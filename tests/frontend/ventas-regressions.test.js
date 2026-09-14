// Regresiones de las correcciones quirúrgicas:
//  1) Ventas por hora con hora local real (no todo en cero)
//  2) Fecha local (localDateKey) en el dashboard de Ventas
//  3) Historial de ventas paginado a 20 sin recargar ni perder ventas
//  4) Modal de métodos de pago conserva el scope visual .pm-config-modal
//  5) Delivery interno mantiene funcionalidad sin el cuadro padre glass
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../frontend');
const { JSDOM } = require(path.join(root, 'node_modules/jsdom'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const code = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => fs.readFileSync(path.join(root, m[1]), 'utf8')).join('\n;\n');
const adminSrc = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const cartSrc = fs.readFileSync(path.join(root, 'js/cart.js'), 'utf8');
const mainCss = fs.readFileSync(path.join(root, 'css/main.css'), 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/#adminbar/sales-dashboard', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.scrollTo = () => {};
w.HTMLElement.prototype.scrollTo = () => {};
w.HTMLElement.prototype.scrollIntoView = () => {};
const errors = [];
w.addEventListener('error', (e) => errors.push(e.message));
w.eval(code + '\n;window.__barVentas = { barSalesDashboard, barSalesHistory, openPaymentMethodConfig, renderCheckout, localDateKey, apiDateToLocalKey, apiDateToLocalTime, Cart, Store };');

let checks = 0;
const failures = [];
function check(label, fn) {
  try {
    fn();
    checks++;
    console.log('PASS:', label);
  } catch (err) {
    failures.push({ label, err });
    console.log('FAIL:', label, '-', err.message);
  }
}

// Crea un pedido del día de HOY (hora local) en la franja indicada.
function localOrder(id, hour, minute, total) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return {
    id,
    order_number: `V-${id}`,
    total: String(total),
    items: [],
    created_at: d.toISOString(),
    payment_method_code: 'efectivo',
    payment_status: 'paid',
    status: 'delivered',
  };
}

function freshEl() {
  const el = w.document.createElement('div');
  el.id = 'test-sales-container';
  w.document.body.appendChild(el);
  return el;
}

async function main() {
  // ---- 1 + 2) Dashboard de Ventas: hora local real y no-cero en "Ventas por hora" ----
  {
    const orders = [
      ...Array.from({ length: 10 }, (_, i) => localOrder(i + 1, 10, 30, 5)),
      ...Array.from({ length: 10 }, (_, i) => localOrder(100 + i, 11, 15, 5)),
      ...Array.from({ length: 10 }, (_, i) => localOrder(200 + i, 14, 0, 5)),
      ...Array.from({ length: 11 }, (_, i) => localOrder(300 + i, 8, 10, 5)),
    ];
    let getAllCalls = 0;
    w.ApiClient.getAll = async (url) => {
      getAllCalls++;
      if (String(url).includes('/orders/all/')) return { ok: true, data: orders };
      return { ok: true, data: [] };
    };
    const el = freshEl();
    await w.__barVentas.barSalesDashboard(el);

    check('Ventas: los 41 pedidos del día se cuentan ($205) con fecha local', () => {
      const totals = [...el.querySelectorAll('[data-sales-count]')].map((e) => e.dataset.salesCount);
      assert.ok(totals.includes('205'));
      assert.ok(totals.includes('41'));
    });
    check('Ventas por hora: el gráfico del día muestra valores no cero cuando hay ventas', () => {
      const chart = el.querySelector('#salesHourChart');
      assert.ok(chart, 'existe el contenedor #salesHourChart');
      const amounts = [...chart.innerHTML.matchAll(/\$(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
      assert.ok(amounts.length >= 7, 'hay una barra por franja');
      assert.ok(amounts.some((v) => v > 0), 'al menos una franja horaria tiene ventas (no todo en cero)');
      assert.ok(amounts.reduce((s, v) => s + v, 0) === 205, 'la suma de franjas es el total del día');
    });
    check('Ventas: fuente usa helpers de fecha local, sin toISOString UTC en el dashboard', () => {
      const dash = adminSrc.slice(adminSrc.indexOf('async function barSalesDashboard'), adminSrc.indexOf('function renderSalesLineChart'));
      assert.ok(!/toISOString\(\)\.slice\(0\s*,\s*10\)/.test(dash), 'no usa UTC toISOString para fechas');
      assert.match(dash, /const today = localDateKey\(\)/);
      assert.match(dash, /apiDateToLocalKey\(/);
      assert.match(dash, /apiDateToLocalTime\(/);
    });
    check('Ventas: sin excepciones de JavaScript', () => assert.deepEqual(errors.slice(), []));
    el.remove();
  }

  // ---- Helper de hora local: estable en cualquier zona horaria del runner ----
  check('apiDateToLocalTime devuelve la hora local real del created_at', () => {
    const when = new Date(2026, 0, 1, 10, 30, 0, 0);
    assert.equal(w.__barVentas.apiDateToLocalTime(when.toISOString()), '10:30');
    assert.equal(w.__barVentas.apiDateToLocalTime(''), '');
    const date = new Date(2026, 0, 1, 23, 0, 0, 0);
    assert.equal(w.__barVentas.apiDateToLocalKey(date.toISOString()), '2026-01-01');
    assert.equal(w.__barVentas.localDateKey(date), '2026-01-01');
  });

  // ---- 3) Historial de ventas paginado ----
  {
    const orders = Array.from({ length: 41 }, (_, i) => localOrder(i + 1, 9, 0 + (i % 20), 5));
    let getAllCalls = 0;
    w.ApiClient.getAll = async (url) => {
      getAllCalls++;
      if (String(url).includes('/orders/all/')) return { ok: true, data: orders };
      return { ok: true, data: [] };
    };
    const el = freshEl();
    await w.__barVentas.barSalesHistory(el);

    check('Historial: primera página muestra 20 filas de 41 ventas', () => {
      const rows = el.querySelectorAll('#salesHistoryRows tr');
      assert.equal(rows.length, 20);
      assert.match(el.querySelector('#salesHistoryPagination').textContent, /41 ventas/);
      assert.match(el.querySelector('#salesHistoryPagination').textContent, /Página 1 de 3/);
    });
    check('Historial: paginar no vuelve a pedir las páginas a la API', () => {
      assert.equal(getAllCalls, 1);
      el.querySelector('[data-shpage="next"]').click();
      assert.match(el.querySelector('#salesHistoryPagination').textContent, /Página 2 de 3/);
      assert.equal(el.querySelectorAll('#salesHistoryRows tr').length, 20);
      el.querySelector('[data-shpage="next"]').click();
      assert.match(el.querySelector('#salesHistoryPagination').textContent, /Página 3 de 3/);
      assert.equal(el.querySelectorAll('#salesHistoryRows tr').length, 1);
      assert.equal(getAllCalls, 1, 'la API no se vuelve a consultar al navegar');
    });
    check('Historial: botón Anterior regresa de página y selección funcional', () => {
      el.querySelector('[data-shpage="prev"]').click();
      assert.match(el.querySelector('#salesHistoryPagination').textContent, /Página 2 de 3/);
      assert.equal(el.querySelectorAll('#salesHistoryRows tr').length, 20);
    });
    check('Historial: no conserva slice(0,20) en la fuente', () => {
      const history = adminSrc.slice(adminSrc.indexOf('async function barSalesHistory'), adminSrc.indexOf('async function barDelivery'));
      assert.ok(!/\.slice\(0,\s*20\)/.test(history), 'no limita a 20 pedidos en memoria');
      assert.match(history, /PAGE_SIZE/);
    });
    check('Historial: sin excepciones de JavaScript', () => assert.deepEqual(errors.slice(), []));
    el.remove();
  }

  // ---- 4) Modal de métodos de pago conserva scope visual .pm-config-modal ----
  {
    w.ApiClient.get = async (url) => {
      if (String(url).includes('/methods/admin/')) {
        return { ok: true, data: { results: [{ id: 2, code: 'deuna', name: 'DEUNA', active: true, requires_voucher: true, account_holder: 'INTESUD', phone: '0991234567', instructions: 'Pague y confirme', description: 'Pago móvil DEUNA' }] } };
      }
      return { ok: true, data: {} };
    };
    await w.__barVentas.openPaymentMethodConfig('deuna');
    const wrapper = w.document.querySelector('.pm-config-modal');

    check('Modal pagos: el contenido está envuelto en .pm-config-modal', () => {
      assert.ok(wrapper, 'wrapper .pm-config-modal existe');
      assert.match(wrapper.querySelector('h3').textContent, /Configurar DEUNA/);
      assert.ok(wrapper.querySelector('#pmActive'), 'estructura de campos conservada');
      assert.ok([...wrapper.querySelectorAll('.checkbox-row')].some((r) => r.textContent.includes('Requiere comprobante')), 'envuelve el checkbox de comprobante');
    });
    check('Modal pagos: CSS scoped solo dentro de .pm-config-modal', () => {
      assert.match(mainCss, /\.pm-config-modal h3\s*\{/);
      assert.match(mainCss, /\.pm-config-modal \.label\s*\{/);
      assert.match(mainCss, /\.pm-config-modal \.checkbox-row\s*\{/);
      assert.match(mainCss, /\.pm-config-modal \.tiny\.muted/);
      assert.match(mainCss, /\.pm-config-modal input\[type="file"\]/);
      assert.ok(!mainCss.includes('.pm-config-modal h3, .modal h3'), 'no agrupa selectores con otros modales');
    });
    check('Modal pagos: sin excepciones de JavaScript', () => assert.deepEqual(errors.slice(), []));
    w.document.querySelector('.modal-overlay')?.remove();
  }

  // ---- 5) Delivery interno sin cuadro padre glass, funcionalidad intacta ----
  {
    const product = { id: 1, name: 'Café', price: 2, stock: 10, available: true, prepMin: 5 };
    w.__barVentas.Store.products = [product];
    w.__barVentas.Cart.items = [];
    w.__barVentas.Cart.add(product, 1, [], '');
    w.ApiClient.get = async (url) => {
      const u = String(url);
      if (u.includes('/payments/methods/')) {
        return { ok: true, data: { results: [{ id: 1, code: 'efectivo', name: 'Efectivo', active: true, requires_voucher: false }] } };
      }
      if (u.includes('/delivery/config/')) {
        return { ok: true, data: { enabled: true, delivery_days: [0, 1, 2, 3, 4], start_time: '09:00', end_time: '09:45', max_capacity: 4 } };
      }
      return { ok: true, data: { is_open: true, total_capacity: 100, current_capacity: 0, enabled: false } };
    };
    w.sessionStorage.setItem('int_session', JSON.stringify({ id: 1, name: 'Test', email: 'test@intesud.edu.ec', role: 'user' }));
    const el = freshEl();
    await w.__barVentas.renderCheckout(el);
    const deliveryOption = el.querySelector('[data-d="delivery"]');
    assert.ok(deliveryOption, 'existe la opción Delivery interno');
    deliveryOption.click();
    const wrapper = el.querySelector('#deliveryDetail').firstElementChild;

    check('Delivery: el contenedor padre quedó transparente sin caja glass', () => {
      assert.ok(wrapper, 'existe el contenedor padre');
      const st = wrapper.getAttribute('style') || '';
      assert.match(st, /background:transparent/);
      assert.match(st, /border:none/);
      assert.match(st, /box-shadow:none/);
      assert.match(st, /border-radius:0/);
      assert.ok(!/--glass-bg|--glass-border|--glass-shadow/.test(st), 'no usa variables glass en el padre');
    });
    check('Delivery: el contenido interno y selector de piso/aulas siguen integrados', () => {
      assert.match(wrapper.textContent, /Delivery interno/);
      assert.match(wrapper.textContent, /Selecciona el piso y el aula/);
      const floorTabs = el.querySelectorAll('#floorTabs .floor-tab');
      assert.equal(floorTabs.length, 3);
    });
    check('Delivery: selección de piso/aula sigue funcionando (lógica intacta)', () => {
      el.querySelectorAll('#floorTabs .floor-tab')[1].click();
      const aulas = [...el.querySelectorAll('#aulaGrid .aula-cell')].map((c) => c.textContent);
      assert.ok(aulas.length >= 24 && aulas.every((a) => a.startsWith('2')), 'aulas del piso 2 renderizadas');
      const cell = [...el.querySelectorAll('#aulaGrid .aula-cell')].find((c) => c.textContent === '2A1');
      assert.ok(cell);
      cell.click();
      assert.equal(w._deliveryInfo && w._deliveryInfo.piso, '2');
      assert.equal(w._deliveryInfo && w._deliveryInfo.aula, '2A1');
      assert.match(el.querySelector('#aulaConfirm').textContent, /Piso: 2 · Aula: 2A1/);
    });
    check('Delivery: sin excepciones de JavaScript', () => assert.deepEqual(errors.slice(), []));
    el.remove();
  }

  check('Regresiones: no se usa location.reload', () => assert.doesNotMatch(code, /location\.reload\s*\(/));

  if (failures.length) {
    console.error(`Resultado: ${checks - failures.length}/${checks} comprobaciones OK, ${failures.length} fallaron`);
    dom.window.close();
    process.exitCode = 1;
    return;
  }
  console.log(`Resultado: ${checks} comprobaciones de regresión de Ventas/Modal/Delivery aprobadas`);
  dom.window.close();
}

main().catch((error) => {
  console.error(error);
  dom.window.close();
  process.exitCode = 1;
});