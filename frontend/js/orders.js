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
      <div class="page-title"><div><h1>Mis pedidos</h1><p class="page-sub">Lo importante de cada pedido, de un vistazo.</p></div></div>
      <div class="orders-overview" aria-label="Resumen de pedidos">
        <div><span class="orders-overview-num">${active.length}</span><span class="muted"> activos</span></div>
        <span class="small muted">${history.length} en historial</span>
      </div>
      <h2 class="section-title">Pedidos actuales <span class="section-count">${active.length}</span></h2>
      <div id="currentOrders"></div>
      <h2 class="section-title">Historial <span class="section-count">${history.length}</span></h2>
      <div id="historyOrders"></div>
    </div>`;

  const activeWrap = $('#currentOrders');
  if (!active.length) activeWrap.innerHTML = emptyState(clientIcon('empty'), 'No tienes pedidos activos', 'Cuando realices un pedido, aparecerá aquí.');

  active.sort((a, b) => (b.time || '').localeCompare(a.time || '')).forEach((o) => {
    activeWrap.appendChild(orderTrackingCard(o));
  });

  const histWrap = $('#historyOrders');
  if (!history.length) histWrap.innerHTML = emptyState(clientIcon('orders'), 'Sin historial', 'No hay pedidos anteriores.');
  else {
    histWrap.innerHTML = history.slice(0, 30).map((o) => historyCard(o)).join('');
    $$('[data-history-detail]', histWrap).forEach((button) => {
      button.onclick = () => showOrderDetail(history.find((o) => o.id === button.dataset.historyDetail));
    });
  }
}

function orderTrackingCard(o) {
  const card = document.createElement('div');
  card.className = `order-card order-card-active state-${o.status}`;
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
      const icon = i < current ? clientIcon('check') : (i === current ? clientIcon('clock') : '');
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
    timeline = `<div class="alert ${o.status === 'cancelled' ? 'danger' : 'warning'}" style="margin-top:10px"><span class="a-ico">${clientIcon(o.status === 'cancelled' ? 'danger' : 'clock')}</span><div><div class="a-title">${o.status === 'cancelled' ? 'Pedido cancelado' : 'Pedido no retirado'}</div>${o.status === 'cancelled' ? (o.note || 'El pedido fue cancelado.') : (o.paymentStatus === 'refunded' ? 'Se procesó un reembolso.' : 'El pedido no fue retirado en el receso.')}</div></div>`;
  }

  card.innerHTML = `
    <div class="order-head">
      <div>
        <div class="order-num">#${o.id}</div>
        <div class="order-meta">${fmtDate(o.date)} · ${o.time || '—'}</div>
      </div>
      ${statusMeta(o.status)}
    </div>
    <div class="order-glance">
      <div>
        <div class="order-glance-label">${orderStateMessage(o)}</div>
        <div class="small muted" style="margin-top:4px">${o.items.map((i) => `${esc(i.name)} ×${i.qty}`).join(' · ')}</div>
      </div>
      <div class="order-eta">
        <span class="tiny muted">TIEMPO ESTIMADO</span>
        <strong>${orderEta(o)}</strong>
      </div>
    </div>
    ${timeline}
    <div class="order-card-actions">
      <button class="btn btn-outline btn-sm" data-detail>Ver detalle</button>
      ${['queue', 'confirmed'].includes(o.status) ? '<button class="btn btn-danger-outline btn-sm" data-cancel>Cancelar pedido</button>' : ''}
    </div>
  `;

  $('[data-detail]', card).onclick = () => showOrderDetail(o);

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
    <div class="order-card order-card-history" data-order-detail="${esc(o.id)}">
      <div>
        <div class="order-num" style="font-size:var(--fs-md)">#${o.id} <span class="badge badge-outline">${fmtDate(o.date)} · ${o.time}</span></div>
        <div class="small muted" style="margin-top:6px">${o.items.slice(0, 3).map((i) => esc(i.name)).join(', ')}${o.items.length > 3 ? ` +${o.items.length - 3} más` : ''}</div>
      </div>
      <div class="order-history-meta">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${statusMeta(o.status)}
          ${o.paymentStatus === 'refunded' ? '<span class="badge badge-info">Reembolso</span>' : ''}
        </div>
        <div class="bold" style="color:var(--primary-strong)">${money(o.total)}</div>
      </div>
      <button class="btn btn-outline btn-sm" data-history-detail="${esc(o.id)}">Detalle</button>
    </div>`;
}

function orderEta(o) {
  if (o.status === 'ready') return 'Retira ahora';
  if (o.status === 'queue' || o.status === 'confirmed' || o.status === 'prep') return `${o.prepMin || '—'} min`;
  return o.eta || ORDER_FLOW_LABEL[o.status] || '—';
}

function orderStateMessage(o) {
  const messages = {
    queue: 'Tu pedido está en cola', confirmed: 'Pedido confirmado', prep: 'Estamos preparando tu pedido',
    ready: '¡Tu pedido está listo!', delivered: 'Pedido entregado', cancelled: 'Pedido cancelado',
    nopickup: 'Pedido no retirado', refunded: 'Reembolso procesado',
  };
  return messages[o.status] || 'Estado actualizado';
}

function showOrderDetail(o) {
  const isTerminal = ['cancelled', 'nopickup', 'refunded'].includes(o.status);
  const flowIndex = Math.max(0, ORDER_FLOW.indexOf(o.status));
  const progress = isTerminal ? '' : `<div class="timeline timeline-detail">${ORDER_FLOW.map((status, index) => {
    const cls = index < flowIndex ? 'done' : index === flowIndex ? 'current' : 'pending';
    return `<div class="tl-step ${cls}"><div class="tl-dot">${index < flowIndex ? clientIcon('check') : index === flowIndex ? clientIcon('clock') : ''}</div><div class="tl-body"><div class="tl-label">${ORDER_FLOW_LABEL[status]}</div>${index === flowIndex ? `<div class="tl-time">${orderStateMessage(o)}</div>` : ''}</div>${index === ORDER_FLOW.length - 1 ? '' : '<div class="tl-rail"></div>'}</div>`;
  }).join('')}</div>`;
  const terminal = isTerminal ? `<div class="alert ${o.status === 'nopickup' ? 'warning' : o.status === 'refunded' ? 'info' : 'danger'}"><span class="a-ico">${clientIcon(o.status === 'nopickup' ? 'clock' : 'back')}</span><div><div class="a-title">${orderStateMessage(o)}</div>${o.paymentStatus === 'refunded' ? 'El reembolso fue solicitado para este pedido.' : (o.note || 'No se requieren más acciones.')}</div></div>` : '';
  const d = drawer(`
    <div class="detail-status"><div><span class="tiny muted">NÚMERO DE PEDIDO</span><div class="detail-number">#${esc(o.id)}</div></div>${statusMeta(o.status)}</div>
    <div class="detail-eta">${o.status === 'ready' ? `${clientIcon('check')} Retira tu pedido en cafetería` : `${clientIcon('clock')} ${orderEta(o)}`}</div>
    ${terminal}${progress}
    <div class="detail-section"><h4>Tu pedido</h4>${o.items.map((i) => `<div class="detail-item"><span>${esc(i.name)} <span class="muted">× ${i.qty}</span></span><b>${money(i.price * i.qty)}</b></div>`).join('')}<div class="detail-total"><span>Total</span><b>${money(o.total)}</b></div></div>
    <div class="detail-section detail-facts"><h4>Entrega y pago</h4><div><span>Entrega</span><b>${deliveryMeta(o)}</b></div><div><span>Pago</span><b>${paymentMethodLabel(o.payment)} · ${paymentMeta(o.paymentStatus)}</b></div>${o.note ? `<div><span>Nota</span><b>${esc(o.note)}</b></div>` : ''}</div>
  `, { title: 'Detalle del pedido', footer: ['queue', 'confirmed'].includes(o.status) ? '<button class="btn btn-danger-outline btn-sm" data-detail-cancel>Cancelar pedido</button>' : '' });
  $('[data-detail-cancel]', d.overlay)?.addEventListener('click', async () => {
    const ok = await confirmDialog('Cancelar pedido', '¿Seguro que deseas cancelar este pedido?', 'Cancelar pedido', true);
    if (!ok) return;
    o.status = 'cancelled'; o.eta = 'Cancelado'; o.paymentStatus = o.payment !== 'efectivo' ? 'refunded' : o.paymentStatus;
    logAudit('Canceló pedido', o.id); d.close(); toast('Pedido cancelado.', 'success'); renderOrders();
  });
}
window.showOrderDetail = showOrderDetail;

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
    <div class="page-title"><div><h1>Mi perfil</h1><p class="page-sub">Tus datos y la seguridad de tu cuenta.</p></div></div>
    <div class="card profile-hero">
      <div class="avatar lg">${esc(initials(u.name))}</div>
      <div>
        <h2>${esc(u.name)}</h2>
        <div class="muted small">${esc(user.cargo || 'Usuario')} · ${esc(user.aula || '')}</div>
        <div class="muted small">${esc(u.email)}</div>
      </div>
    </div>
    <div class="profile-grid">
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
        <div style="margin-top:18px"><button class="btn btn-outline" id="btnEditProfile">Editar perfil</button></div>
      </div>
    </div>
    <div class="card profile-security">
      <div class="card-header"><div><div class="card-title">Seguridad</div><div class="small muted">Administra el acceso a tu cuenta.</div></div></div>
      <div class="card-body">
        <div class="security-row"><span class="security-icon">${clientIcon('lock')}</span><div><b>Contraseña</b><div class="small muted">Mantén tu cuenta protegida.</div></div><button class="btn btn-outline btn-sm" id="btnChangePass">Cambiar</button></div>
        <div class="security-row"><span class="security-icon">${clientIcon('logout')}</span><div><b>Sesión actual</b><div class="small muted">Cierra sesión si terminas de usar este equipo.</div></div><button class="btn btn-danger-outline btn-sm" id="btnLogout">Cerrar sesión</button></div>
      </div>
    </div></div>`;

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
    <p class="muted small" style="margin-bottom:14px">Usa una contraseña de al menos 6 caracteres.</p>
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
    if (PASSWORDS[currentUser().email] !== a) { err.textContent = 'La contraseña actual no es correcta.'; return; }
    if (b.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
    if (b !== c) { err.textContent = 'Las contraseñas no coinciden.'; return; }
    PASSWORDS[currentUser().email] = b;
    toast('Contraseña actualizada.', 'success');
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

