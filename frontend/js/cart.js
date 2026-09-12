/* ============================================================
   cart.js — Carrito, checkout, pagos, delivery, capacidad
   ============================================================ */

const Cart = {
  items: Store.load('int_cart', []),

  save() { Store.save('int_cart', this.items); },

  count() { return this.items.reduce((s, i) => s + i.qty, 0); },

  total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },

  add(product, qty, addons, note) {
    if (!product.available) return { ok: false, msg: 'Producto agotado.' };
    if (qty > product.stock) return { ok: false, msg: 'La cantidad supera el stock disponible.' };
    const ex = this.items.find((i) => i.productId === product.id);
    const newQty = (ex?.qty || 0) + qty;
    if (newQty > product.stock) return { ok: false, msg: 'No puedes agregar más de ' + product.stock + ' unidades (stock).' };
    const addonsTotal = (addons || []).reduce((s, a) => s + a.price, 0) * qty;
    const name = product.name + ((addons || []).length ? ' + ' + addons.map((a) => a.name).join(', ') : '');
    if (ex) {
      ex.qty = newQty;
      ex.note = note || ex.note;
      ex.addons = addons || ex.addons;
      ex.name = name;
      ex.price = product.price + (addons?.reduce((s, a) => s + a.price, 0) || 0);
    } else {
      this.items.push({
        productId: product.id, qty, name, price: product.price + (addons?.reduce((s, a) => s + a.price, 0) || 0),
        basePrice: product.price, addons: addons || [], note: note || '', emoji: clientProductIcon(product), prepMin: product.prepMin,
      });
    }
    this.save();
    refreshCartBadge();
    return { ok: true };
  },

  setQty(productId, qty) {
    const item = this.items.find((i) => i.productId === productId);
    const product = Store.products.find((p) => p.id === productId);
    if (!item) return;
    if (qty <= 0) { this.remove(productId); return; }
    if (qty > product.stock) { toast('No puedes superar el stock disponible (' + product.stock + ').', 'warning'); return; }
    item.qty = qty;
    this.save();
    refreshCartBadge();
  },

  remove(productId) {
    this.items = this.items.filter((i) => i.productId !== productId);
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
      const total = cfg.total_capacity;
      const used = Math.min(cfg.current_capacity, total);
      const pct = total ? Math.round((used / total) * 100) : 0;
      let state = 'DISPONIBLE', stateCls = 'success', warnMsg = '';
      if (pct >= 100) { state = 'CAPACIDAD LLENA'; stateCls = 'danger'; }
      else if (pct >= 70) { state = 'ALTA DEMANDA'; stateCls = 'warning'; warnMsg = 'Alta demanda. Tu pedido podría tardar más de lo habitual.'; }
      return { pct, used, total, state, stateCls, warnMsg, cfg };
    }
  } catch (error) {
    console.error('Error fetching capacity info:', error);
  }
  // Fallback
  return { pct: 0, used: 0, total: 10, state: 'DISPONIBLE', stateCls: 'success', warnMsg: '', cfg: {} };
}

async function renderCapacityCard(container) {
  const info = await fetchCapacityInfo();
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

  await renderCapacityCard($('#cartCapacity'));

  const itemsWrap = $('#cartItems');
  if (!Cart.items.length) {
    itemsWrap.innerHTML = emptyState(clientIcon('cart'), 'Tu carrito está vacío', 'Agrega productos desde el menú para continuar.');
  }

  Cart.items.forEach((item) => {
    const product = Store.products.find((p) => p.id === item.productId);
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="ci-media">${clientProductIcon(product)}</div>
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
    $('[data-inc]', row).onclick = () => { Cart.setQty(item.productId, item.qty + 1); renderCart(); };
    $('[data-dec]', row).onclick = () => { Cart.setQty(item.productId, item.qty - 1); renderCart(); };
    $('[data-del]', row).onclick = () => { Cart.remove(item.productId); renderCart(); };
    itemsWrap.appendChild(row);
  });

  $('#summaryRows').innerHTML = Cart.items.map((i) =>
    `<div class="summary-row"><span>${esc(i.name)} <i class="bx bx-x"></i> ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('');

  $('#btnCheckout').onclick = () => setRoute('checkout');
}

/* ============================================================
   CHECKOUT
   ============================================================ */
async function renderCheckout(el) {
  const app = el || $('#mainContent') || $('#app');
  if (!currentUser()) return route('login');
  if (!Cart.items.length) { toast('Tu carrito está vacío.', 'warning'); setRoute('menu'); return; }
  
  const cap = await fetchCapacityInfo();
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
  let payOptions = [
    { id: 'deuna', name: 'DEUNA', desc: 'Pago con código QR. Aprobación en línea.', icon: clientIcon('mobile') },
    { id: 'transferencia', name: 'Transferencia', desc: 'Carga tu comprobante. Revisión manual.', icon: clientIcon('transfer') },
    { id: 'efectivo', name: 'Efectivo', desc: 'Paga en cafetería durante el receso (10:00 - 10:15).', icon: clientIcon('cash') },
  ];
  
  const payMethodsRes = await ApiClient.get(API_ENDPOINTS.payments.methods);
  if (payMethodsRes.ok && payMethodsRes.data) {
    const list = payMethodsRes.data.results || payMethodsRes.data;
    if (Array.isArray(list) && list.length) {
      payOptions = list.map(pm => ({
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
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:18px" id="btnConfirm">Confirmar pedido</button>
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
      <div class="alert info"><span class="a-ico">${clientIcon('delivery')}</span><div><div class="a-title">Delivery interno.</div>Selecciona el piso y el aula dentro del edificio. Cobertura: Piso 1 - 3.</div></div>
      <div class="floor-selector" id="floorTabs"></div>
      <div class="aula-grid" id="aulaGrid"></div>
      <div id="aulaConfirm" style="margin-top:14px;display:none" class="alert success"></div>`;
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
        box.style.display = 'block';
        box.innerHTML = `<span class="a-ico">${clientIcon('location')}</span><div><div class="a-title">Delivery interno.</div>Piso: <b>${state.piso}</b> · Aula: <b>${state.aula}</b></div>`;
        window._deliveryInfo = { piso: state.piso, aula: state.aula };
      } else { box.style.display = 'none'; delete window._deliveryInfo; }
    }
    renderAulas();
  }

  /* pagos */
  const payWrap = $('#payOptions');
  payWrap.innerHTML = payOptions.map((p) => `
    <div class="select-card" data-p="${p.id}" data-db-id="${p.dbId || ''}" data-requires-voucher="${p.requires_voucher || false}">
      <div class="sc-ico">${p.icon}</div>
      <div><div class="sc-name">${p.name}</div><div class="sc-desc">${p.desc}</div></div>
    </div>`).join('');
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
  window._payMethod = payOptions[0]?.id || 'deuna';
  window._payMethodDbId = payOptions[0]?.dbId || '';
  window._payMethodRequiresVoucher = payOptions[0]?.requires_voucher || false;
  renderPayDetail(window._payMethod);

  function renderPayDetail(method) {
    const detail = $('#payDetail');
    const payOpt = payOptions.find(p => p.id === method);
    if (!payOpt) { detail.innerHTML = ''; return; }
    if (method === 'deuna') {
      const hasData = payOpt.account_holder || payOpt.phone || payOpt.qr_info || payOpt.instructions;
      detail.innerHTML = `
        <div class="alert info" style="margin-bottom:16px"><span class="a-ico">${clientIcon('mobile')}</span><div><div class="a-title">Pago con ${esc(payOpt.name)}.</div>${payOpt.instructions ? esc(payOpt.instructions) + '<br>' : ''}Escanea el código QR para pagar <b>${money(Cart.total())}</b>.</div></div>
        ${payOpt.account_holder ? `<div class="card" style="background:var(--primary-soft);border-color:var(--primary-soft)"><div class="muted small">Titular</div><div class="bold">${esc(payOpt.account_holder)}</div>${payOpt.phone ? `<div class="muted small">Celular: ${esc(payOpt.phone)}</div>` : ''}</div>` : ''}
        ${payOpt.qr_info ? `<div class="card" style="margin-top:12px;background:var(--surface-2)"><div class="muted small">QR / Código</div><div class="bold" style="word-break:break-all">${esc(payOpt.qr_info)}</div></div>` : '<div class="qr-box"><div class="qr-pattern"></div></div>'}
        ${payOpt.phone && !payOpt.account_holder ? `<div class="muted small" style="text-align:center;margin-top:10px">Identificador: <b>${esc(payOpt.phone)}</b> — Total: <b>${money(Cart.total())}</b></div>` : `<div style="text-align:center" class="muted small" style="margin-top:10px">Total: <b>${money(Cart.total())}</b></div>`}
        ${!hasData ? `<div class="tiny muted" style="text-align:center;margin-top:8px">Configurado por administradora del bar</div>` : ''}`;
    } else if (method === 'transferencia') {
      detail.innerHTML = `
        <div class="alert info" style="margin-bottom:16px"><span class="a-ico">${clientIcon('transfer')}</span><div><div class="a-title">Transferencia.</div>Realiza una transferencia por <b>${money(Cart.total())}</b> y adjunta el comprobante.${payOpt.instructions ? '<br><span class="tiny">' + esc(payOpt.instructions) + '</span>' : ''}</div></div>
        <div class="card" style="background:var(--primary-soft);border-color:var(--primary-soft)">
          ${payOpt.bank_name ? `<div class="muted small">${esc(payOpt.bank_name)}${payOpt.account_type ? ' · ' + esc(payOpt.account_type) : ''}</div>` : '<div class="muted small">Banco</div>'}
          ${payOpt.account_number ? `<div class="bold" style="font-size:1.15rem">${esc(payOpt.account_number)}</div>` : '<div class="tiny muted">Número no configurado</div>'}
          ${payOpt.account_holder ? `<div class="muted small">Titular: ${esc(payOpt.account_holder)}</div>` : ''}
          ${payOpt.holder_id ? `<div class="muted small">Identificación: ${esc(payOpt.holder_id)}</div>` : ''}
        </div>
        <div style="margin-top:12px">
          <label class="label">Comprobante</label>
          <div class="file-drop" id="fu"><div class="fd-ico">${clientIcon('clip')}</div><div>Haz clic para cargar tu comprobante</div><div class="tiny">PNG, JPG o PDF — máx 2MB</div></div>
          <input id="voucherInput" type="file" accept="image/png,image/jpeg,application/pdf" hidden>
          <div class="tiny muted" id="fuName" style="margin-top:6px"></div>
        </div>`;
      const fu = $('#fu');
      const voucherInput = $('#voucherInput');
      fu.onclick = () => voucherInput.click();
      voucherInput.onchange = () => {
        const file = voucherInput.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          voucherInput.value = '';
          delete window._voucher;
          toast('El comprobante supera el máximo de 2 MB.', 'warning');
          return;
        }
        fu.classList.add('success');
        fu.innerHTML = `<span class="fd-ico" style="color:var(--success)">${clientIcon('check')}</span><div style="color:var(--success)">Comprobante cargado</div>`;
        $('#fuName').textContent = file.name;
        window._voucher = file;
      };
    } else if (method === 'efectivo') {
      detail.innerHTML = `
        <div class="alert warning" style="margin-bottom:16px"><span class="a-ico">${clientIcon('cash')}</span><div><div class="a-title">Pago en cafetería durante el receso.</div>Horario: <b>10:00 - 10:15</b>${payOpt.instructions ? '<br><span class="tiny">' + esc(payOpt.instructions) + '</span>' : ''}</div></div>
        <div class="capacity-card"><div style="text-align:center"><span class="badge badge-warning">Pendiente de pago</span></div><div class="muted small" style="text-align:center;margin-top:8px">Abona tu pedido al retirarlo en la cafetería. Total: <b>${money(Cart.total())}</b>${payOpt.instructions ? '<br>' + esc(payOpt.instructions) : ''}</div></div>`;
    }
  }

  /* resumen items */
  $('#checkoutItems').innerHTML = Cart.items.map((i) => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <span>${esc(i.name)} <span class="muted"><i class="bx bx-x"></i> ${i.qty}</span></span><span>${money(i.price * i.qty)}</span>
    </div>`).join('');

  $('#btnConfirm').onclick = confirmOrder;
}

function estimatedTime() {
  const maxPrep = Cart.items.reduce((m, i) => Math.max(m, Store.products.find((p) => p.id === i.productId)?.prepMin || i.prepMin || 5), 0);
  return maxPrep;
}
window.estimatedTime = estimatedTime;

async function confirmOrder() {
  const delivery = $('[data-d].active') ? $('[data-d].active').dataset.d : 'pickup';
  const pay = window._payMethod || 'deuna';
  const cap = capacityInfo();
  if (cap.stateCls === 'danger') { toast('La capacidad está completa. No se puede confirmar el pedido.', 'error'); return; }

  if (delivery === 'delivery') {
    if (!window._deliveryInfo) { toast('Selecciona el piso y el aula para el delivery interno.', 'warning'); return; }
  }
  if (window._payMethodRequiresVoucher && !window._voucher) { toast('Carga el comprobante requerido.', 'warning'); $('#fu')?.classList.add('err'); return; }

  const btn = $('[id="btnConfirm"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Confirmando...'; }

  try {
    // Construir datos del pedido para la API - payment_method dinámico desde métodos activos
    const pmId = window._payMethodDbId ? parseInt(window._payMethodDbId) : 1;
    const orderData = {
      items: Cart.items.map((i) => ({
        product_id: typeof i.productId === 'string' ? parseInt(i.productId.replace('p', '')) : i.productId,
        quantity: i.qty,
        addons: i.addons ? i.addons.map(a => ({ addon_id: a.id, quantity: 1 })) : [],
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
      const errMsg = response.data?.detail || response.data?.items?.[0] || 'Error al crear el pedido';
      toast('Error: ' + errMsg, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
      return;
    }

    // Pedido creado exitosamente
    const order = response.data;
    Cart.clear();
    renderConfirmation(order);
  } catch (error) {
    toast('Error de conexión: ' + error.message, 'error');
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
  app.innerHTML = `
    <div class="card" style="text-align:center;padding:44px 24px;max-width:560px;margin:0 auto">
      <div style="font-size:3.4rem;margin-bottom:8px">${clientIcon('celebrate')}</div>
      <h1 style="color:var(--success)">¡Pedido realizado!</h1>
      <p class="muted" style="margin:6px 0 18px">Tu pedido está en cola y comenzará a prepararse.</p>
      <div style="font-size:1.6rem;font-weight:800;color:var(--primary-strong)" id="confNum">${order.id}</div>
      <div class="card" style="background:var(--surface-2);margin-top:22px;text-align:left">
        <div class="kv">
          <dt>Tiempo estimado</dt><dd>${order.prepMin} minutos</dd>
          <dt>Entrega</dt><dd>${order.delivery === 'delivery' ? 'Delivery interno · Piso ' + (order.deliveryInfo?.piso || '') + ' · Aula ' + (order.deliveryInfo?.aula || '—') : 'Retiro en cafetería'}</dd>
          <dt>Pago</dt><dd>${paymentMethodLabel(order.payment)}</dd>
          <dt>Estado</dt><dd>${statusMeta('queue')}</dd>
        </div>
      </div>
      <div style="margin-top:28px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" onclick="setRoute('orders')">Ver mi pedido</button>
        <button class="btn btn-outline btn-lg" onclick="setRoute('menu')">Seguir pidiendo</button>
      </div>
    </div>`;
}
