/* ============================================================
   orders.js — Pedidos del usuario, seguimiento, cancelación
   ============================================================ */

const ORDER_FLOW = ['queue', 'confirmed', 'prep', 'ready', 'delivered'];
const ORDER_FLOW_LABEL = { queue: 'En cola', confirmed: 'Confirmado', prep: 'En preparación', ready: 'Listo', delivered: 'Entregado' };

function myOrders() {
  const u = currentUser();
  if (!u) return [];
  return Store.orders.filter((o) => o.userEmail === u.email);
}
window.myOrders = myOrders;

function renderOrders(el) {
  const app = el || $('#mainContent') || $('#app');
  if (!currentUser()) return route('login');
  const orders = myOrders();

  const active = orders.filter((o) => ['queue', 'confirmed', 'prep', 'ready'].includes(o.status));
  const history = orders.filter((o) => ['delivered', 'cancelled', 'nopickup', 'refunded'].includes(o.status));

  app.innerHTML = `
    <div class="page">
      <div class="page-title"><h1>Mis pedidos</h1></div>
      <p class="page-sub">Sigue el estado de tus pedidos activos y consulta tu historial.</p>
      <h2 class="section-title">Pedidos actuales</h2>
      <div id="currentOrders"></div>
      <h2 class="section-title">Historial</h2>
      <div id="historyOrders"></div>
    </div>`;

  const activeWrap = $('#currentOrders');
  if (!active.length) activeWrap.innerHTML = emptyState('📭', 'No tienes pedidos activos', 'Cuando realices un pedido, aparecerá aquí.');

  active.sort((a, b) => (b.time || '').localeCompare(a.time || '')).forEach((o) => {
    activeWrap.appendChild(orderTrackingCard(o));
  });

  const histWrap = $('#historyOrders');
  if (!history.length) histWrap.innerHTML = emptyState('🗂️', 'Sin historial', 'No hay pedidos anteriores.');
  histWrap.innerHTML = history.slice(0, 30).map((o) => historyCard(o)).join('');
}

function orderTrackingCard(o) {
  const card = document.createElement('div');
  card.className = 'order-card';
  const flowIdx = ORDER_FLOW.indexOf(o.status);
  const current = o.status === 'cancelled' ? -1 : flowIdx >= 0 ? flowIdx : 0;
  const showFlow = !['cancelled', 'nopickup'].includes(o.status);

  let timeline = '';
  if (showFlow) {
    timeline = `<div class="timeline">` + ORDER_FLOW.map((st, i) => {
      const label = ORDER_FLOW_LABEL[st];
      let cls = 'pending';
      if (i < current) cls = 'done';
      else if (i === current) cls = 'current';
      const icon = i < current ? '✓' : (i === current ? '●' : '');
      const isLast = i === ORDER_FLOW.length - 1;
      return `<div class="tl-step ${cls}">
          <div class="tl-dot">${icon}</div>
          <div class="tl-body"><div class="tl-label">${label}</div>
            ${i === current ? `<div class="tl-time">Estado actual</div>` : ''}
          </div>
          ${isLast ? '' : '<div class="tl-rail"></div>'}
        </div>`;
    }).join('') + `</div>`;
  } else {
    timeline = `<div class="alert ${o.status === 'cancelled' ? 'danger' : 'warning'}" style="margin-top:10px"><span class="a-ico">${o.status === 'cancelled' ? '✕' : '⏰'}</span><div><div class="a-title">${o.status === 'cancelled' ? 'Pedido cancelado' : 'Pedido no retirado'}</div>${o.status === 'cancelled' ? (o.note || 'El pedido fue cancelado.') : (o.paymentStatus === 'refunded' ? 'Se procesó un reembolso.' : 'El pedido no fue retirado en el receso.')}</div></div>`;
  }

  card.innerHTML = `
    <div class="order-head">
      <div>
        <div class="order-num">#${o.id}</div>
        <div class="order-meta">${fmtDate(o.date)} · ${o.time}</div>
      </div>
      ${statusMeta(o.status)}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between">
      <div>
        ${o.items.map((i) => `<div class="small">${esc(i.name)} <span class="muted">× ${i.qty}</span></div>`).join('')}
      </div>
      <div style="text-align:right">
        <div class="small muted">Total</div>
        <div class="bold" style="color:var(--primary-strong)">${money(o.total)}</div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="kv" style="font-size:var(--fs-sm)">
      <dt>Entrega</dt><dd>${o.delivery === 'delivery' ? 'Delivery · Piso ' + (o.deliveryInfo?.piso || '') + ' Aula ' + (o.deliveryInfo?.aula || '') : 'Retiro en cafetería'}</dd>
      <dt>Pago</dt><dd>${paymentMethodLabel(o.payment)} ${paymentMeta(o.paymentStatus)}</dd>
      <dt>Tiempo est.</dt><dd>${o.prepMin} min</dd>
      ${o.note ? `<dt>Nota</dt><dd>${esc(o.note)}</dd>` : ''}
    </div>
    ${timeline}
    ${['queue', 'confirmed'].includes(o.status) ? `
      <div style="margin-top:12px"><button class="btn btn-danger-outline btn-sm" data-cancel>Cancelar pedido</button></div>` : o.status === 'prep' ? `
      <div class="alert neutral" style="margin-top:12px"><span class="a-ico">🔧</span><div>Este pedido ya está siendo preparado y no puede cancelarse.</div></div>` : ''}
  `;

  const cancelBtn = $('[data-cancel]', card);
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      const ok = await confirmDialog('Cancelar pedido', '¿Seguro que deseas cancelar este pedido? Solo puedes cancelar mientras no esté en preparación.', 'Cancelar pedido', true);
      if (!ok) return;
      o.status = 'cancelled';
      o.eta = 'Cancelado';
      o.paymentStatus = o.payment !== 'efectivo' ? 'refunded' : o.paymentStatus;
      Store.orders = Store.orders;
      logAudit('Canceló pedido', o.id);
      toast('Pedido cancelado.', 'success');
      renderOrders();
    };
  }
  return card;
}

function historyCard(o) {
  return `
    <div class="order-card" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
      <div>
        <div class="order-num" style="font-size:var(--fs-md)">#${o.id} <span class="badge badge-outline">${fmtDate(o.date)} · ${o.time}</span></div>
        <div class="small muted" style="margin-top:6px">${o.items.slice(0, 3).map((i) => esc(i.name)).join(', ')}${o.items.length > 3 ? ` +${o.items.length - 3} más` : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${statusMeta(o.status)}
          ${o.paymentStatus === 'refunded' ? '<span class="badge badge-info">Reembolso</span>' : ''}
        </div>
        <div class="bold" style="color:var(--primary-strong)">${money(o.total)} <span class="tiny muted">· ${o.delivery === 'delivery' ? 'Delivery' : 'Retiro'}</span></div>
      </div>
    </div>`;
}

function saveOrders() { Store.orders = Store.orders; }

function fmtDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
  } catch (e) { return d; }
}
window.fmtDate = fmtDate;

/* ============================================================
   PERFIL
   ============================================================ */
function renderProfile(el) {
  const app = el || $('#mainContent') || $('#app');
  const u = currentUser();
  if (!u) return route('login');
  const user = Store.users.find((x) => x.email === u.email) || { name: u.name, email: u.email, cargo: u.cargo, aula: u.aula, registeredAt: '—' };

  app.innerHTML = `
    <div class="page-title"><h1>Mi perfil</h1></div>
    <div class="card" style="display:flex;gap:18px;align-items:center;margin-bottom:18px">
      <div class="avatar lg">${esc(initials(u.name))}</div>
      <div>
        <h2>${esc(u.name)}</h2>
        <div class="muted small">${esc(user.cargo || 'Usuario')} · ${esc(user.aula || '')}</div>
        <div class="muted small">${esc(u.email)}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">Información institucional</div></div></div>
      <div class="card-body">
        <div class="kv" style="margin-bottom:8px">
          <dt>Nombre</dt><dd>${esc(u.name)}</dd>
          <dt>Correo</dt><dd>${esc(u.email)}</dd>
          <dt>Usuario</dt><dd>${esc(u.username || u.email)}</dd>
          <dt>Cargo</dt><dd>${esc(user.cargo || '—')}</dd>
          <dt>Aula / Ubicación</dt><dd>${esc(user.aula || '—')}</dd>
          <dt>Fecha de registro</dt><dd>${esc(user.registeredAt || '—')}</dd>
        </div>
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
          <button class="btn btn-outline" id="btnEditProfile">Editar perfil</button>
          <button class="btn btn-outline" id="btnChangePass">Cambiar contraseña</button>
          <button class="btn btn-danger-outline" id="btnLogout">Cerrar sesión</button>
        </div>
      </div>
    </div>`;

  $('#btnLogout').onclick = () => {
    Auth.logout();
    toast('Sesión cerrada.', 'info');
    route('login');
  };

  $('#btnEditProfile').onclick = () => {
    const ov = modal(`
      <h3>Editar perfil</h3>
      <div class="field"><label class="label">Nombre</label><input class="input" id="epName" value="${esc(u.name)}"></div>
      <div class="field"><label class="label">Cargo</label><input class="input" id="epCargo" value="${esc(user.cargo || '')}"></div>
      <div class="field"><label class="label">Aula / Ubicación</label><input class="input" id="epAula" value="${esc(user.aula || '')}"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-neutral" data-close>Cancelar</button>
        <button class="btn" data-save>Guardar</button>
      </div>`);
    $('[data-close]', ov).onclick = () => ov.remove();
    $('[data-save]', ov).onclick = () => {
      user.name = $('#epName', ov).value || user.name;
      user.cargo = $('#epCargo', ov).value;
      user.aula = $('#epAula', ov).value;
      const sess = Auth.current();
      sess.name = user.name;
      Auth.set(sess);
      Store.users = Store.users;
      toast('Perfil actualizado.', 'success');
      ov.remove();
      renderProfile();
    };
  };

  $('#btnChangePass').onclick = () => changePasswordModal();
}

function changePasswordModal() {
  const ov = modal(`
    <h3>Cambiar contraseña</h3>
    <p class="muted small" style="margin-bottom:14px">Cambio simulado — no se modifica nada real.</p>
    <div class="field"><label class="label">Contraseña actual</label><input class="input" type="password" id="cpOld"></div>
    <div class="field"><label class="label">Nueva contraseña</label><input class="input" type="password" id="cpNew"></div>
    <div class="field"><label class="label">Confirmar contraseña</label><input class="input" type="password" id="cpNew2"><div class="input-err-msg" id="cpErr"></div></div>
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button class="btn btn-neutral" data-close>Cancelar</button>
      <button class="btn" data-save>Guardar</button>
    </div>`);
  $('[data-close]', ov).onclick = () => ov.remove();
  $('[data-save]', ov).onclick = () => {
    const a = $('#cpOld', ov).value, b = $('#cpNew', ov).value, c = $('#cpNew2', ov).value;
    const err = $('#cpErr', ov);
    if (!a || !b || !c) { err.textContent = 'Completa todos los campos.'; return; }
    if (b.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
    if (b !== c) { err.textContent = 'Las contraseñas no coinciden.'; return; }
    toast('Contraseña actualizada (simulado).', 'success');
    logAudit('Cambió su contraseña', '');
    ov.remove();
  };
}

/* Perfil en modal — para roles administrativos (sin salir del propio panel) */
function renderProfileModal() {
  const u = currentUser();
  if (!u) return route('login');
  const user = Store.users.find((x) => x.email === u.email) || {};
  const ov = modal(`
    <div class="card" style="display:flex;gap:16px;align-items:center;margin-bottom:16px;box-shadow:none;padding:16px">
      <div class="avatar lg">${esc(initials(u.name))}</div>
      <div>
        <div class="bold" style="font-size:var(--fs-lg)">${esc(u.name)}</div>
        <div class="muted small">${esc(user.cargo || ROLE_LABELS[u.role] || 'Usuario')}</div>
        <div class="muted small">${esc(u.email)}</div>
      </div>
    </div>
    <div class="kv">
      <dt>Rol</dt><dd>${esc(ROLE_LABELS[u.role] || u.role)}</dd>
      ${user.aula ? `<dt>Aula / Ubicación</dt><dd>${esc(user.aula)}</dd>` : ''}
      ${user.registeredAt ? `<dt>Registro</dt><dd>${esc(user.registeredAt)}</dd>` : ''}
      ${user.lastAccess ? `<dt>Último acceso</dt><dd>${esc(user.lastAccess)}</dd>` : ''}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;flex-wrap:wrap">
      <button class="btn btn-outline" id="pmChangePass">Cambiar contraseña</button>
      <button class="btn btn-danger-outline" id="pmLogout">Cerrar sesión</button>
    </div>`, { title: 'Mi perfil' });
  $('#pmChangePass', ov).onclick = () => changePasswordModal();
  $('#pmLogout', ov).onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); location.hash = 'login'; handleRoute(); };
}
window.renderProfileModal = renderProfileModal;

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}
window.initials = initials;

