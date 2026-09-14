/* ============================================================
   cart.js — Carrito, checkout, pagos, delivery, capacidad
   ============================================================ */

const Cart = {
  items: Store.load('int_cart', []),

  save() { Store.save('int_cart', this.items); },

  count() { return this.items.reduce((s, i) => s + i.qty, 0); },

  total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },

  // La identidad de una línea incluye su personalización; también funciona
  // con carritos guardados antes de introducir líneas independientes.
  lineKey(item) {
    return JSON.stringify([String(item.productId), (item.addons || []).map(a => String(a.id)).sort(), item.note || '']);
  },

  findLine(key) {
    return this.items.find(i => this.lineKey(i) === key) || this.items.find(i => i.productId === key);
  },

  add(product, qty, addons, note) {
    if (!product || !product.available) return { ok: false, msg: 'Producto agotado.' };
    if (!Number.isInteger(qty) || qty < 1) return { ok: false, msg: 'Ingresa una cantidad válida.' };
    if (qty > product.stock) return { ok: false, msg: 'La cantidad supera el stock disponible.' };
    const selection = { productId: product.id, addons: addons || [], note: note || '' };
    const ex = this.items.find((i) => this.lineKey(i) === this.lineKey(selection));
    const newQty = (ex?.qty || 0) + qty;
    const reserved = this.items.filter(i => String(i.productId) === String(product.id)).reduce((sum, i) => sum + i.qty, 0);
    if (reserved + qty > product.stock) return { ok: false, msg: 'No puedes agregar más de ' + product.stock + ' unidades (stock).' };
    const name = product.name + ((addons || []).length ? ' + ' + addons.map((a) => a.name).join(', ') : '');
    if (ex) {
      ex.qty = newQty;
      ex.note = note || ex.note;
      ex.addons = addons || ex.addons;
      ex.name = name;
      ex.price = Number(product.price) + (addons?.reduce((s, a) => s + Number(a.price), 0) || 0);
      if (!ex.image && product.image) ex.image = product.image;
      if (!ex.category && product.category) ex.category = product.category;
    } else {
      this.items.push({
        productId: product.id, qty, name, price: Number(product.price) + (addons?.reduce((s, a) => s + Number(a.price), 0) || 0),
        basePrice: product.price, addons: addons || [], note: note || '', emoji: clientProductIcon(product), prepMin: product.prepMin,
        image: product.image || '', category: product.category || '',
      });
    }
    this.save();
    refreshCartBadge();
    return { ok: true };
  },

  setQty(key, qty) {
    const item = this.findLine(key);
    if (!item) return;
    if (qty <= 0) { this.remove(key); return; }
    if (!Number.isInteger(qty)) return;
    const product = Store.products.find(p => String(p.id) === String(item.productId));
    if (!product || !product.available) { toast('Este producto no está disponible. Puedes eliminarlo o volver al menú para actualizar el catálogo.', 'warning'); return; }
    const otherQty = this.items.filter(i => i !== item && String(i.productId) === String(item.productId)).reduce((sum, i) => sum + i.qty, 0);
    if (qty + otherQty > product.stock) { toast('No puedes superar el stock disponible (' + product.stock + ').', 'warning'); return; }
    item.qty = qty;
    this.save();
    refreshCartBadge();
  },

  remove(key) {
    const item = this.findLine(key);
    this.items = this.items.filter(i => i !== item);
    this.save();
    refreshCartBadge();
  },

  clear() { this.items = []; this.save(); refreshCartBadge(); },
};

function refreshCartBadge() {
  const el = $('#cartBubble') || $('#cartCount');
  if (!el) return;
  const c = Cart.count();
  el.textContent = c;
  el.classList.toggle('show', c > 0);
}
window.refreshCartBadge = refreshCartBadge;

/* ---------- Capacidad (desde API) ---------- */
async function fetchCapacityInfo() {
  try {
    const response = await ApiClient.get(API_ENDPOINTS.config.get);
    if (response.ok && response.data) {
      const cfg = response.data;
      const total = cfg.total_capacity || 10;
      const used = Math.min(cfg.current_capacity != null ? cfg.current_capacity : 0, total);
      const pct = total ? Math.round((used / total) * 100) : 0;
      let state = 'DISPONIBLE', stateCls = 'success', warnMsg = '';
      if (pct >= 100) { state = 'CAPACIDAD LLENA'; stateCls = 'danger'; }
      else if (pct >= 70) { state = 'ALTA DEMANDA'; stateCls = 'warning'; warnMsg = 'Alta demanda. Tu pedido podría tardar más de lo habitual.'; }
      return { ok: true, pct, used, total, state, stateCls, warnMsg, cfg };
    }
  } catch (error) {
    console.error('Error fetching capacity info:', error);
  }
  // Fallback ante fallo de consulta (ok:false para que el checkout no cree pedidos a ciegas)
  return { ok: false, pct: 0, used: 0, total: 10, state: 'DISPONIBLE', stateCls: 'success', warnMsg: '', cfg: {} };
}

async function renderCapacityCard(container) {
  if (!container || !container.isConnected) return;
  const info = await fetchCapacityInfo();
  if (!container.isConnected) return;
  let cls = 'bar-fill';
  if (info.stateCls === 'danger') cls += ' danger';
  else if (info.stateCls === 'warning') cls += ' warn';
  container.innerHTML = `
    <div class="capacity-card">
      <div class="capacity-head">
        <h3>Capacidad de preparación</h3>
        <span class="badge ${info.stateCls === 'danger' ? 'badge-danger' : info.stateCls === 'warning' ? 'badge-warning' : 'badge-success'}">${info.state}</span>
      </div>
      <div class="bar-track bar-lg"><div class="${cls}" style="width:${info.pct}%"></div></div>
      <div class="capacity-num"><span id="capText">${info.used} / ${info.total} pedidos</span><b>${info.pct}%</b></div>
      ${info.warnMsg ? `<div class="alert warning" style="margin-top:12px;padding:8px 12px"><span class="a-ico">${clientIcon('warning')}</span><div>${info.warnMsg}</div></div>` : ''}
    </div>`;
}
window.renderCapacityCard = renderCapacityCard;

async function capacityAllows() {
  const info = await fetchCapacityInfo();
  return info.pct < 100;
}
window.capacityAllows = capacityAllows;

/* ---------- Estado de cafetería / hora (desde API) ---------- */
async function fetchCafeStatus() {
  try {
    const response = await ApiClient.get(API_ENDPOINTS.config.get);
    if (response.ok && response.data) {
      return {
        open: response.data.is_open,
        orderOpen: response.data.order_open_time,
        orderClose: response.data.order_close_time,
        breakStart: response.data.break_start,
        breakEnd: response.data.break_end,
      };
    }
  } catch (error) {
    console.error('Error fetching cafe status:', error);
  }
  return { open: true, orderOpen: '09:00', orderClose: '09:45', breakStart: '10:00', breakEnd: '10:15' };
}

async function canPlaceOrder() {
  const s = await fetchCafeStatus();
  return s.open;
}
window.canPlaceOrder = canPlaceOrder;

function cafeStatus() {
  // Función síncrona para compatibilidad, devuelve valores por defecto
  // Usar fetchCafeStatus() para valores reales
  return { open: true, orderOpen: '09:00', orderClose: '09:45', breakStart: '10:00', breakEnd: '10:15' };
}
window.cafeStatus = cafeStatus;

/* ============================================================
   PÁGINA: Carrito
   ============================================================ */
async function renderCart(el) {
  const app = el || $('#mainContent') || $('#app');
  if (!currentUser()) return route('login');
  const canOrder = await canPlaceOrder();
  const cap = await fetchCapacityInfo();
  if (!app.isConnected) return;

  let banner = '';
  if (!canOrder) {
    const s = await fetchCafeStatus();
    banner = `<div class="alert danger"><span class="a-ico">${clientIcon('danger')}</span><div><div class="a-title">Cafetería cerrada.</div>Puedes revisar tu carrito, pero no se aceptan pedidos en este momento<br>(Receso: ${s.breakStart} - ${s.breakEnd} o fuera del horario ${s.orderOpen}-${s.orderClose}).</div></div>`;
  } else if (cap.stateCls === 'warning') {
    banner = `<div class="alert warning"><span class="a-ico">${clientIcon('warning')}</span><div><div class="a-title">Alta demanda.</div>Tu pedido podría tardar más de lo habitual.</div></div>`;
  } else if (cap.stateCls === 'danger') {
    banner = `<div class="alert danger"><span class="a-ico">${clientIcon('capacity')}</span><div><div class="a-title">Capacidad llena.</div>La capacidad de preparación está completa. Intenta nuevamente más tarde.</div></div>`;
  }

  app.innerHTML = `
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="setRoute('menu')"><i class="bx bx-arrow-back"></i> Seguir comprando</button>
    <div class="page-title"><h1>Mi carrito</h1><span class="badge badge-primary" id="cartTotalTop">${money(Cart.total())}</span></div>
    ${banner}
    <div style="margin-bottom:18px" id="cartCapacity"></div>
    <div class="cart-layout">
      <div class="card card-flush">
        <div class="card-header"><div><div class="card-title">Productos</div><div class="card-sub">${Cart.count()} artículo(s)</div></div></div>
        <div class="card-body" id="cartItems" style="padding-top:0"></div>
      </div>
      <aside class="summary-card">
        <h3 class="card-title" style="margin-bottom:14px">Resumen del pedido</h3>
        <div id="summaryRows"></div>
        <div class="summary-row total"><span>Total</span><span id="sumTotal">${money(Cart.total())}</span></div>
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:16px" id="btnCheckout" ${(!Cart.items.length || cap.stateCls === 'danger' || !canOrder) ? 'disabled' : ''}>Continuar</button>
        <p class="tiny muted text-center" style="margin-top:10px">Se aplica capacidad: ${cap.used}/${cap.total}</p>
      </aside>
    </div>`;

  const itemsWrap = $('#cartItems');
  if (!Cart.items.length) {
    itemsWrap.innerHTML = emptyState(clientIcon('cart'), 'Tu carrito está vacío', 'Agrega productos desde el menú para continuar.');
  }

  Cart.items.forEach((item) => {
    const product = Store.products.find((p) => String(p.id) === String(item.productId));
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="ci-media" style="display:flex;align-items:center;justify-content:center;flex-shrink:0">${cartItemThumbHtml(item, product)}</div>
      <div class="ci-body">
        <div class="ci-name">${esc(item.name)}</div>
        <div class="ci-meta">${money(item.price)} c/u${item.note ? ` · Nota: ${esc(item.note)}` : ''}</div>
        <div class="ci-line">
          <div class="qty-stepper">
            <button data-dec><i class="bx bx-minus"></i></button>
            <span class="qty-val" data-qty>${item.qty}</span>
            <button data-inc>+</button>
          </div>
          <button class="remove-link" data-del>Eliminar</button>
          <span class="bold" style="margin-left:auto">${money(item.price * item.qty)}</span>
        </div>
      </div>`;
    const lineKey = Cart.lineKey(item);
    $('[data-inc]', row).onclick = () => { Cart.setQty(lineKey, item.qty + 1); renderCart(); };
    $('[data-dec]', row).onclick = () => { Cart.setQty(lineKey, item.qty - 1); renderCart(); };
    $('[data-del]', row).onclick = () => { Cart.remove(lineKey); renderCart(); };
    itemsWrap.appendChild(row);
  });

  $('#summaryRows').innerHTML = Cart.items.map((i) =>
    `<div class="summary-row"><span>${esc(i.name)} <i class="bx bx-x"></i> ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('');

  $('#btnCheckout').onclick = () => setRoute('checkout');
  await renderCapacityCard($('#cartCapacity'));
}

/* ============================================================
   CHECKOUT
   ============================================================ */
async function renderCheckout(el) {
  const app = el || $('#mainContent') || $('#app');
  if (!currentUser()) return route('login');
  if (!Cart.items.length) { toast('Tu carrito está vacío.', 'warning'); setRoute('menu'); return; }
  
  delete window._voucher;
  delete window._deliveryInfo;
  window._payMethod = '';
  window._payMethodDbId = '';
  window._payMethodRequiresVoucher = false;
  const cap = await fetchCapacityInfo();
  if (!app.isConnected) return;
  if (cap.stateCls === 'danger') { toast('La capacidad de preparación está completa. Intenta más tarde.', 'error'); setRoute('cart'); return; }
  
  const [configRes, deliveryConfigRes] = await Promise.all([
    ApiClient.get(API_ENDPOINTS.config.get),
    ApiClient.get(API_ENDPOINTS.delivery.config),
  ]);
  const cfg = configRes.ok ? configRes.data : {};
  const deliveryCfg = deliveryConfigRes.ok ? deliveryConfigRes.data : {};
  const canOrder = await canPlaceOrder();
  const deliveryOn = !!deliveryCfg.enabled && canOrder;
  
  // Obtener métodos de pago desde API
  let payOptions = [];

  const payMethodsRes = await ApiClient.get(API_ENDPOINTS.payments.methods);
  if (!app.isConnected) return;
  if (payMethodsRes.ok && payMethodsRes.data) {
    const list = payMethodsRes.data.results || payMethodsRes.data;
    if (Array.isArray(list) && list.length) {
      payOptions = list.filter(pm => pm.active !== false && Number.isInteger(Number(pm.id)) && Number(pm.id) > 0).map(pm => ({
        id: pm.code,
        dbId: pm.id,
        name: pm.name,
        desc: pm.description || '',
        icon: clientIcon({ deuna: 'mobile', transferencia: 'transfer', efectivo: 'cash' }[pm.code] || 'credit-card'),
        requires_voucher: pm.requires_voucher,
        instructions: pm.instructions || '',
        bank_name: pm.bank_name || '',
        account_holder: pm.account_holder || '',
        account_type: pm.account_type || '',
        account_number: pm.account_number || '',
        holder_id: pm.holder_id || '',
        phone: pm.phone || '',
        qr_info: pm.qr_info || '',
        qr_image: pm.qr_image_url || '',
      }));
    }
  }

  app.innerHTML = `
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" onclick="setRoute('cart')"><i class="bx bx-arrow-back"></i> Volver al carrito</button>
    <div class="page-title"><h1>Confirmar pedido</h1><span class="muted">${money(Cart.total())}</span></div>
    <p class="page-sub">Verifica el resumen antes de confirmar.</p>

    <div class="progress-steps">
      <div class="ps-step done"><div class="ps-circle">${clientIcon('check')}</div><div class="ps-label">Carrito</div></div>
      <div class="ps-step current"><div class="ps-circle">2</div><div class="ps-label">Confirmar</div></div>
      <div class="ps-step"><div class="ps-circle">3</div><div class="ps-label">Realizado</div></div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><div><div class="card-title">1 · Método de entrega</div></div></div>
      <div class="card-body">
        <div style="display:grid;gap:12px" id="deliveryOptions"></div>
        <div id="deliveryDetail" style="margin-top:16px"></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><div><div class="card-title">2 · Método de pago</div></div></div>
      <div class="card-body">
        <div style="display:grid;gap:12px" id="payOptions"></div>
        <div id="payDetail" style="margin-top:16px"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div><div class="card-title">3 · Resumen</div></div></div>
      <div class="card-body">
        <div id="checkoutItems" style="margin-bottom:8px"></div>
        <div class="divider"></div>
        <div class="flex justify-between items-center">
          <div>
            <div class="muted small">Tiempo estimado</div>
            <div class="bold" style="font-size:1.1rem">${estimatedTime()} min</div>
          </div>
          <div style="text-align:right">
            <div class="muted small">Total a pagar</div>
            <div class="bold" style="font-size:1.6rem;color:var(--primary-strong)">${money(Cart.total())}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:18px" id="btnConfirm" ${!payOptions.length ? 'disabled' : ''}>Confirmar pedido</button>
      </div>
    </div>`;

  /* entrega */
  const deliveryWrap = $('#deliveryOptions');
  const mkDelivery = (id, name, desc, icon) => `
    <div class="select-card ${id === 'pickup' ? 'active' : ''}" data-d="${id}">
      <div class="sc-ico">${icon}</div>
      <div><div class="sc-name">${name}</div><div class="sc-desc">${desc}</div></div>
    </div>`;
  let dHtml = mkDelivery('pickup', 'Retiro en cafetería', 'Retiras tu pedido durante el receso 10:00 - 10:15.', clientIcon('pickup'));
  if (deliveryOn) dHtml += mkDelivery('delivery', 'Delivery interno', 'Entrega dentro del edificio INTESUD.', clientIcon('delivery'));
  deliveryWrap.innerHTML = (deliveryOn ? '' : `<div class="alert neutral" style="margin-bottom:12px"><span class="a-ico">${clientIcon('danger')}</span><div><div class="a-title">Delivery no disponible.</div>No se aceptan pedidos de delivery en este momento.</div></div>`) + dHtml;

  deliveryWrap.querySelectorAll('[data-d]').forEach((el) => {
    el.onclick = () => {
      deliveryWrap.querySelectorAll('[data-d]').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
      if (el.dataset.d === 'delivery') renderAulaSelector();
      else $('#deliveryDetail').innerHTML = '';
    };
  });

  function renderAulaSelector() {
    const detail = $('#deliveryDetail');
    const pisos = cfg.delivery_days && cfg.delivery_days.length ? [1, 2, 3] : [1, 2, 3];
    let state = { piso: '1', aula: '' };
    detail.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;margin:12px 0 0;padding:2px 0;background:transparent;border:none;box-shadow:none;border-radius:0"><span style="width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.18);display:grid;place-items:center;flex-shrink:0;color:#fff;font-size:1.35rem">${clientIcon('delivery')}</span><div style="min-width:0"><div style="font-weight:800;color:#fff;letter-spacing:-0.01em;margin-bottom:4px">Delivery interno</div><div style="color:rgba(255,255,255,0.88);font-size:0.88rem;line-height:1.5">Selecciona el piso y el aula dentro del edificio.<span style="display:inline-flex;align-items:center;margin-left:8px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.18);font-size:0.78rem;font-weight:700;color:#fff;white-space:nowrap">Cobertura: Piso 1 - 3</span></div></div></div>
      <div class="floor-selector" id="floorTabs" style="margin-bottom:8px;gap:8px;background:transparent;border:none;box-shadow:none;padding:0"></div>
      <div class="aula-grid" id="aulaGrid" style="gap:8px;background:transparent;border:none;box-shadow:none;padding:0"></div>
      <div id="aulaConfirm" style="margin-top:6px;display:none;padding:4px 0;background:transparent;border:none;box-shadow:none;border-radius:0"></div>`;
    const floorTabs = $('#floorTabs');
    pisos.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'floor-tab' + (p === 1 ? ' active' : '');
      b.textContent = 'Piso ' + p;
      b.onclick = () => {
        floorTabs.querySelectorAll('.floor-tab').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.piso = String(p); state.aula = '';
        renderAulas(); updateConfirm();
      };
      floorTabs.appendChild(b);
    });
    function renderAulas() {
      const grid = $('#aulaGrid');
      const letters = ['A', 'B', 'C', 'D'];
      grid.innerHTML = '';
      letters.forEach((l) => {
        for (let n = 1; n <= 6; n++) {
          const cell = document.createElement('button');
          cell.className = 'aula-cell';
          cell.textContent = state.piso + l + n;
          cell.onclick = () => {
            grid.querySelectorAll('.aula-cell').forEach((x) => x.classList.remove('active'));
            cell.classList.add('active');
            state.aula = cell.textContent;
            updateConfirm();
          };
          grid.appendChild(cell);
        }
      });
    }
    function updateConfirm() {
      const box = $('#aulaConfirm');
      if (state.aula) {
        box.style.display = 'flex';
        box.style.alignItems = 'center';
        box.style.gap = '10px';
        box.innerHTML = `<span style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.18);display:grid;place-items:center;flex-shrink:0;color:#fff;font-size:1.1rem">${clientIcon('location')}</span><div style="min-width:0"><div style="font-weight:700;color:#fff;font-size:0.88rem">Delivery interno</div><div style="color:rgba(255,255,255,0.88);font-size:0.84rem">Piso: <b style="color:#fff">${state.piso}</b> · Aula: <b style="color:#fff">${state.aula}</b></div></div>`;
        window._deliveryInfo = { piso: state.piso, aula: state.aula };
      } else { box.style.display = 'none'; delete window._deliveryInfo; }
    }
    renderAulas();
  }

  /* pagos */
  const payWrap = $('#payOptions');
  payWrap.innerHTML = payOptions.length ? payOptions.map((p, index) => `
    <div class="select-card ${index === 0 ? 'active' : ''}" data-p="${esc(p.id)}" data-db-id="${p.dbId || ''}" data-requires-voucher="${p.requires_voucher || false}">
      <div class="sc-ico">${p.icon}</div>
      <div><div class="sc-name">${esc(p.name)}</div><div class="sc-desc">${esc(p.desc)}</div></div>
    </div>`).join('') : `<div class="alert warning" role="alert">${payMethodsRes.ok ? 'No hay métodos de pago disponibles. Contacta a la cafetería.' : 'No se pudieron cargar los métodos de pago. Vuelve al carrito e inténtalo de nuevo.'}</div>`;
  payWrap.querySelectorAll('[data-p]').forEach((el) => {
    el.onclick = () => {
      payWrap.querySelectorAll('[data-p]').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
      window._payMethod = el.dataset.p;
      window._payMethodDbId = el.dataset.dbId || payOptions.find(x=>x.id===el.dataset.p)?.dbId || '';
      window._payMethodRequiresVoucher = el.dataset.requiresVoucher === 'true';
      renderPayDetail(el.dataset.p);
    };
  });
  window._payMethod = payOptions[0]?.id || '';
  window._payMethodDbId = payOptions[0]?.dbId || '';
  window._payMethodRequiresVoucher = payOptions[0]?.requires_voucher || false;
  renderPayDetail(window._payMethod);

  function renderPayDetail(method) {
    delete window._voucher;
    const detail = $('#payDetail');
    const payOpt = payOptions.find(p => p.id === method);
    if (!payOpt) { detail.innerHTML = ''; return; }
    if (method === 'deuna') {
      detail.innerHTML = `
        <div class="alert info" style="margin-bottom:16px"><span class="a-ico">${clientIcon('mobile')}</span><div><div class="a-title">Pago con ${esc(payOpt.name)}.</div>${payOpt.instructions ? esc(payOpt.instructions) + '<br>' : ''}<div class="tiny muted" style="margin-top:4px">${esc(payOpt.desc || '')}</div>Usa los datos de pago indicados por la cafetería para abonar <b>${money(Cart.total())}</b>.</div></div>
        ${payOpt.qr_image ? `
          <div class="card" style="margin-top:12px;text-align:center;background:var(--surface-2)">
            <div class="muted small" style="margin-bottom:10px">Escanea el QR ${esc(payOpt.name)}</div>
            <img src="${esc(payOpt.qr_image)}" alt="QR ${esc(payOpt.name)}" style="max-width:280px;width:100%;height:auto;display:block;margin:0 auto;border-radius:12px">
          </div>` : '<div class="alert warning" style="margin-top:12px">QR no configurado. Solicita los datos de pago antes de transferir.</div>'}
        ${payOpt.account_holder ? `<div class="card" style="background:var(--primary-soft);border-color:var(--primary-soft)"><div class="muted small">Titular</div><div class="bold">${esc(payOpt.account_holder)}</div>${payOpt.phone ? `<div class="muted small">Celular / Identificador: ${esc(payOpt.phone)}</div>` : ''}</div>` : ''}
        ${payOpt.qr_info ? `<div class="card" style="margin-top:12px;background:var(--surface-2)"><div class="muted small">QR / Código</div><div class="bold" style="word-break:break-all">${esc(payOpt.qr_info)}</div></div>` : ''}
        ${payOpt.phone && !payOpt.account_holder ? `<div class="muted small" style="text-align:center;margin-top:10px">Identificador: <b>${esc(payOpt.phone)}</b> — Total: <b>${money(Cart.total())}</b></div>` : `<div style="text-align:center" class="muted small" style="margin-top:10px">Total: <b>${money(Cart.total())}</b></div>`}
        `;
    } else if (method === 'transferencia') {
      detail.innerHTML = `
        <div class="alert info" style="margin-bottom:16px"><span class="a-ico">${clientIcon('transfer')}</span><div><div class="a-title">Transferencia.</div>Realiza una transferencia por <b>${money(Cart.total())}</b> y adjunta el comprobante.${payOpt.instructions ? '<br><span class="tiny">' + esc(payOpt.instructions) + '</span>' : ''}</div></div>
        <div class="card" style="background:var(--primary-soft);border-color:var(--primary-soft)">
          ${payOpt.bank_name ? `<div class="muted small">${esc(payOpt.bank_name)}${payOpt.account_type ? ' · ' + esc(payOpt.account_type) : ''}</div>` : '<div class="muted small">Banco</div>'}
          ${payOpt.account_number ? `<div class="bold" style="font-size:1.15rem">${esc(payOpt.account_number)}</div>` : '<div class="tiny muted">Número no configurado</div>'}
          ${payOpt.account_holder ? `<div class="muted small">Titular: ${esc(payOpt.account_holder)}</div>` : ''}
          ${payOpt.holder_id ? `<div class="muted small">Identificación: ${esc(payOpt.holder_id)}</div>` : ''}
        </div>
        `;
    } else if (method === 'efectivo') {
      detail.innerHTML = `
        <div style="margin-bottom:8px;padding:0;background:transparent;border:none;box-shadow:none;border-radius:0;display:flex;gap:10px;align-items:flex-start"><span style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.12);display:grid;place-items:center;flex-shrink:0;color:#fff;font-size:1.1rem">${clientIcon('cash')}</span><div style="min-width:0"><div style="font-weight:700;color:#fff;font-size:0.88rem">Pago en cafetería durante el receso.</div><div style="color:rgba(255,255,255,0.88);font-size:0.84rem">Horario: <b style="color:#fff">10:00 - 10:15</b>${payOpt.instructions ? '<br><span style="color:rgba(255,255,255,0.78);font-size:0.78rem">' + esc(payOpt.instructions) + '</span>' : ''}</div></div></div>
        <div style="margin-top:8px;padding:0;background:transparent;border:none;box-shadow:none;border-radius:0;text-align:center"><span class="badge badge-warning" style="background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.18);color:#fff">Pendiente de pago</span><div style="color:rgba(255,255,255,0.88);font-size:0.84rem;text-align:center;margin-top:6px">Abona tu pedido al retirarlo en la cafetería. Total: <b style="color:#fff">${money(Cart.total())}</b>${payOpt.instructions ? '<br><span style="color:rgba(255,255,255,0.78)">'+ esc(payOpt.instructions) + '</span>' : ''}</div></div>`;
    } else {
      detail.innerHTML = `<div class="alert info"><div><b>${esc(payOpt.name)}</b><p>${esc(payOpt.instructions || 'Sigue las indicaciones de la cafetería para realizar el pago.')}</p><p>Total: ${money(Cart.total())}</p></div></div>`;
    }
    if (payOpt.requires_voucher || method === 'transferencia') {
      detail.insertAdjacentHTML('beforeend', `
        <div style="margin-top:12px">
          <label class="label" for="voucherInput">Comprobante${payOpt.requires_voucher ? ' (obligatorio)' : ' (opcional)'}</label>
          <button type="button" class="file-drop" id="fu">Haz clic para cargar tu comprobante</button>
          <input id="voucherInput" type="file" accept="image/png,image/jpeg,application/pdf" hidden>
          <div class="tiny muted">PNG, JPG o PDF — máx 2 MB</div>
          <div class="tiny muted" id="fuName" style="margin-top:6px" aria-live="polite"></div>
        </div>`);
      const fu = $('#fu');
      const input = $('#voucherInput');
      fu.onclick = () => input.click();
      input.onchange = () => {
        delete window._voucher;
        fu.classList.remove('success', 'err');
        fu.textContent = 'Haz clic para cargar tu comprobante';
        $('#fuName').textContent = '';
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
          input.value = '';
          fu.classList.add('err');
          toast('Selecciona un PNG, JPG o PDF de máximo 2 MB.', 'warning');
          return;
        }
        window._voucher = file;
        fu.classList.add('success');
        fu.textContent = 'Comprobante cargado';
        $('#fuName').textContent = file.name;
      };
    }
  }

  /* resumen items - con miniatura real si existe */
  $('#checkoutItems').innerHTML = Cart.items.map((i) => {
    const product = Store.products.find((p) => String(p.id) === String(i.productId));
    const thumbProduct = { name: i.name, category: i.category || product?.category, image: i.image || product?.image || '' };
    const thumb = productThumbHtml(thumbProduct, 'sm');
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="flex-shrink:0">${thumb}</div><div style="flex:1;min-width:0"><div class="bold" style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(i.name)}">${esc(i.name)}</div><div class="tiny muted">Cantidad: ${i.qty} · ${money(i.price)} c/u</div></div><span class="bold">${money(i.price * i.qty)}</span></div>`;
  }).join('');

  $('#btnConfirm').onclick = confirmOrder;
}

function estimatedTime() {
  const maxPrep = Cart.items.reduce((m, i) => Math.max(m, Store.products.find((p) => p.id === i.productId)?.prepMin || i.prepMin || 5), 0);
  return maxPrep;
}
window.estimatedTime = estimatedTime;

let _confirmingOrder = false;

async function confirmOrder() {
  if (_confirmingOrder) return;
  if (!Cart.items.length) { toast('Tu carrito está vacío.', 'warning'); return; }
  const pmId = Number(window._payMethodDbId);
  if (!Number.isInteger(pmId) || pmId <= 0) { toast('Selecciona un método de pago disponible.', 'warning'); return; }
  const delivery = $('[data-d].active') ? $('[data-d].active').dataset.d : 'pickup';

  if (delivery === 'delivery') {
    if (!window._deliveryInfo) { toast('Selecciona el piso y el aula para el delivery interno.', 'warning'); return; }
  }
  if (window._payMethodRequiresVoucher && !window._voucher) { toast('Carga el comprobante requerido.', 'warning'); $('#fu')?.classList.add('err'); return; }

  const btn = $('[id="btnConfirm"]');
  _confirmingOrder = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Confirmando...'; }

  try {
    // Capacidad real desde la API: si falla NO se crea el pedido
    const cap = await fetchCapacityInfo();
    if (!cap.ok) { toast('No se pudo consultar la capacidad. Intenta nuevamente.', 'error'); return; }
    if (cap.stateCls === 'danger') { toast('La capacidad está completa. No se puede confirmar el pedido.', 'error'); return; }

    // Construir datos del pedido para la API - payment_method dinámico desde métodos activos
    const orderData = {
      items: Cart.items.map((i) => ({
        product_id: typeof i.productId === 'string' ? parseInt(i.productId.replace('p', '')) : i.productId,
        quantity: i.qty,
        addons: i.addons ? i.addons.map(a => ({ addon_id: a.id, quantity: i.qty })) : [],
        note: i.note || '',
      })),
      delivery_method: delivery === 'delivery' ? 'delivery' : 'pickup',
      delivery_info: delivery === 'delivery' ? window._deliveryInfo : undefined,
      payment_method: pmId,
      priority: 'normal',
      note: '',
    };

    let requestData = orderData;
    if (window._voucher instanceof File) {
      requestData = new FormData();
      Object.entries(orderData).forEach(([key, value]) => {
        if (value === undefined) return;
        requestData.append(
          key,
          key === 'items' || key === 'delivery_info' ? JSON.stringify(value) : String(value),
        );
      });
      requestData.append('voucher', window._voucher, window._voucher.name);
    }

    // Hacer POST a la API
    const response = await ApiClient.post(API_ENDPOINTS.orders.create, requestData);

    if (!response.ok) {
      const errorValue = response.data?.detail || response.data?.items || response.data?.payment_method || response.data?.voucher;
      const errMsg = (Array.isArray(errorValue) ? errorValue[0] : errorValue) || 'Error al crear el pedido';
      toast('Error: ' + errMsg, 'error');
      return;
    }

    // Pedido creado exitosamente: mapear la respuesta snake_case de la API al
    // formato del frontend y limpiar el carrito SOLO después del éxito.
    const mapped = mapApiOrder(response.data);
    mapped.payment = window._payMethod || '';
    mapped.cartTotal = Cart.total();
    Cart.clear();
    delete window._voucher;
    delete window._deliveryInfo;
    renderConfirmation(mapped);
  } catch (error) {
    toast('Error de conexión: ' + error.message, 'error');
  } finally {
    _confirmingOrder = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
  }
}

function nextOrderNumber() {
  const orders = Store.orders;
  let max = 0;
  orders.forEach((o) => { const n = parseInt((o.id.match(/\d+/) || [0])[0]); if (n > max) max = n; });
  return 'PED-' + String(max + 1).padStart(3, '0');
}

function renderConfirmation(order) {
  const app = $('#mainContent') || $('#app');
  const total = Number.isFinite(Number(order.total)) ? Number(order.total) : (order.cartTotal || 0);
  const itemsConf = (order.items || []).map((i) => {
    const product = Store.products.find((p) => String(p.id) === String(i.productId));
    const img = i.image || i.product_image || product?.image || '';
    const thumb = img ? `<img src="${esc(resolveMediaUrl(img))}" alt="${esc(i.name)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--surface-2)" loading="lazy" onerror="this.style.display='none'">` : `<span style="width:36px;height:36px;border-radius:8px;background:var(--primary-soft);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${clientProductIcon(product || { category: '' })}</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">${thumb}<span>${esc(i.name)} <span class="muted">× ${i.qty}</span></span></div>`;
  }).join('');
  app.innerHTML = `
    <div class="card" style="text-align:center;padding:44px 24px;max-width:560px;margin:0 auto">
      <div style="font-size:3.4rem;margin-bottom:8px">${clientIcon('celebrate')}</div>
      <h1 style="color:var(--success)">¡Pedido realizado!</h1>
      <p class="muted" style="margin:6px 0 18px">Tu pedido está en cola y comenzará a prepararse.</p>
      <div style="font-size:1.6rem;font-weight:800;color:var(--primary-strong)" id="confNum">${esc(order.id)}</div>
      <div class="card" style="background:var(--surface-2);margin-top:22px;text-align:left">
        <div class="kv">
          <dt>Tiempo estimado</dt><dd>${order.prepMin != null ? order.prepMin + ' minutos' : '—'}</dd>
          <dt>Entrega</dt><dd>${deliveryMeta(order)}</dd>
          <dt>Pago</dt><dd>${paymentMethodLabel(order.payment) || '—'}</dd>
          <dt>Productos</dt><dd class="cart-items-conf">${itemsConf || '—'}</dd>
          <dt>Total a pagar</dt><dd>${money(total)}</dd>
          <dt>Estado</dt><dd>${statusMeta(order.status)}</dd>
        </div>
      </div>
      <div style="margin-top:28px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" onclick="setRoute('orders')">Ver mi pedido</button>
        <button class="btn btn-outline btn-lg" onclick="setRoute('menu')">Seguir pidiendo</button>
      </div>
    </div>`;
}
