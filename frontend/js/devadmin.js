/* ============================================================
   devadmin.js — Panel del Administrador Desarrollador
   ============================================================ */

const DEV_SECTIONS = {
  dashboard: { label: 'Dashboard', icon: 'grid' },
  users: { label: 'Usuarios', icon: 'user' },
  roles: { label: 'Roles y permisos', icon: 'orders' },
  cafe: { label: 'Información de cafetería', icon: 'coffee' },
  config: { label: 'Configuración general', icon: 'menu' },
  audit: { label: 'Auditoría', icon: 'orders' },
  design: { label: 'Design System', icon: 'grid' },
};

function renderDevAdmin(page) {
  const app = $('#app');
  if (!currentUser() || currentUser().role !== 'admindev') return route('login');
  const sec = DEV_SECTIONS[page] ? page : 'dashboard';
  syncBodyClass();

  app.innerHTML = `
    <div class="admin-layout dev-layout">
      <aside class="admin-sidebar">
        <div class="sb-brand"><span style="color:var(--text)">${svgIcon('menu')}</span> Sistema INTESUD</div>
        <nav class="sb-nav">
          ${Object.entries(DEV_SECTIONS).map(([k, v]) => `
            <a class="sb-link ${k === sec ? 'active' : ''}" href="#" data-dev="${k}"><span class="sb-ico">${svgIcon(v.icon)}</span>${v.label}</a>`).join('')}
        </nav>
        <div class="sb-footer">
          <div class="bold small">${esc(currentUser().name)}</div>
          <div class="tiny muted">Administrador desarrollador</div>
        </div>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="hamburger" id="devHamburger" title="Menú">☰</button>
          <span class="topbar-ico">${svgIcon(DEV_SECTIONS[sec].icon)}</span>
          <span class="page-name">${DEV_SECTIONS[sec].label}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
            <div class="profile-chip" id="devUserMenu">
              <div class="avatar sm">${esc(initials(currentUser().name))}</div><span class="pname">${esc(currentUser().name)}</span> ▾
              <div class="dropdown-menu" id="devUserDropdown" style="display:none">
                <a class="dropdown-item" href="#" data-link="profile"><span class="ico">👤</span>Mi perfil</a>
                <div class="dropdown-sep"></div>
                <a class="dropdown-item danger" href="#" id="btnDevLogout"><span class="ico">⏻</span>Cerrar sesión</a>
              </div>
            </div>
          </div>
        </div>
        <div class="admin-content" id="devContent"></div>
      </div>
    </div>
    <nav class="mobile-nav role-admin" id="devMobileNav"></nav>`;

  const ud = $('#devUserDropdown');
  $('#devUserMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'profile') { renderProfileModal(); ud.style.display = 'none'; } else setRoute(t); });
  $('#btnDevLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); route('login'); };

  const sidebar = $('.admin-sidebar', app);
  const closeSidebar = () => { sidebar?.classList.remove('open'); $('.sb-scrim')?.remove(); };
  $('#devHamburger')?.addEventListener('click', () => {
    sidebar?.classList.add('open');
    if (!$('.sb-scrim')) {
      const scrim = document.createElement('div');
      scrim.className = 'sb-scrim';
      scrim.addEventListener('click', closeSidebar);
      document.body.appendChild(scrim);
    }
  });
  $$('[data-dev]', app).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); closeSidebar(); setRoute('admindev/' + a.dataset.dev); }));

  const content = $('#devContent');
  const renderers = {
    dashboard: devDashboard,
    users: devUsers,
    roles: devRoles,
    cafe: devCafe,
    config: devConfig,
    audit: devAudit,
    design: devDesign,
  };
  renderers[sec](content);
}

/* ============================================================
   DASHBOARD GENERAL
   ============================================================ */
function devDashboard(el) {
  const users = Store.users;
  const orders = Store.orders;
  const products = Store.products;
  const audit = Store.audit;
  const activeUsers = users.filter((u) => u.active).length;
  const inactiveUsers = users.length - activeUsers;
  const roleCount = Object.keys(ROLE_LABELS).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today).length;
  const live = orders.filter((o) => ['queue', 'confirmed', 'prep', 'ready'].includes(o.status)).length;
  const cfg = Store.config;
  const recentAudit = audit.slice(0, 6);

  el.innerHTML = `
    <div class="page-title"><h1>Dashboard general</h1></div>
    <p class="page-sub">Vista general del sistema. Las operaciones diarias las gestiona el panel de la cafetería.</p>
    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="stat-card"><div class="st-label">Usuarios activos</div><div class="st-value primary">${activeUsers} / ${users.length}</div><div class="st-sub">${inactiveUsers} inactivos</div></div>
      <div class="stat-card"><div class="st-label">Roles existentes</div><div class="st-value">${roleCount}</div><div class="st-sub">${Object.values(ROLE_LABELS).join(' · ')}</div></div>
      <div class="stat-card"><div class="st-label">Productos</div><div class="st-value">${products.length}</div><div class="st-sub">${products.filter((p) => p.available).length} activos</div></div>
      <div class="stat-card success-card"><div class="st-label">Pedidos en curso</div><div class="st-value">${live}</div><div class="st-sub">${todayOrders} hoy</div></div>
    </div>

    <div class="grid grid-2" style="gap:20px;margin-bottom:20px;align-items:start">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Estado del sistema</div><div class="card-sub">Ajustes globales de la plataforma</div></div></div>
        <div class="card-body" style="display:grid;gap:12px">
          <div class="kv"><dt>Cafetería</dt><dd><span class="badge ${cfg.cafeOpen ? 'badge-success' : 'badge-danger'}">${cfg.cafeOpen ? 'Abierta' : 'Cerrada'}</span></dd></div>
          <div class="kv"><dt>Delivery interno</dt><dd><span class="badge ${cfg.deliveryEnabled ? 'badge-success' : 'badge-danger'}">${cfg.deliveryEnabled ? 'Habilitado' : 'Deshabilitado'}</span></dd></div>
          <div class="kv"><dt>Horario de pedidos</dt><dd class="bold small">${cfg.orderOpen} - ${cfg.orderClose}</dd></div>
          <div class="kv"><dt>Receso</dt><dd class="bold small">${cfg.breakStart} - ${cfg.breakEnd}</dd></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
          ${[['users', '👥', 'Usuarios'], ['roles', '🔐', 'Roles y permisos'], ['cafe', '🏪', 'Cafetería'], ['config', '⚙️', 'Configuración'], ['audit', '📜', 'Auditoría'], ['design', '🎨', 'Design System']].map(([k, ic, l]) =>
            `<a href="#" class="btn btn-outline" data-goto="${k}">${ic} ${l}</a>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Actividad reciente</div><div class="card-sub">Últimas acciones administrativas</div></div>
          <a href="#" class="btn btn-sm btn-outline" data-goto="audit">Ver toda</a></div>
        <div class="card-body">
          ${recentAudit.length ? `<div class="timeline">${recentAudit.map((a) => `
            <div class="tl-step">
              <div class="tl-dot">${esc(initials(a.user))}</div>
              <div class="tl-body">
                <div class="tl-label"><b>${esc(a.user)}</b> ${esc(a.action)}</div>
                <div class="tl-time">${esc(a.target || '')} · ${esc(a.time)}</div>
              </div>
            </div>`).join('')}</div>`
          : `<div class="empty-state" style="padding:12px 0"><div class="es-ico">📭</div><h3>Sin actividad</h3></div>`}
        </div>
      </div>
    </div>`;
  $$('[data-goto]', el).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute('admindev/' + a.dataset.goto); });
}

/* ============================================================
   USUARIOS
   ============================================================ */
function devUsers(el) {
  const users = Store.users;
  el.innerHTML = `
    <div class="page-title"><h1>Usuarios</h1><button class="btn" id="addUser">+ Nuevo usuario</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Registro</th><th></th></tr></thead>
      <tbody>${users.map((u) => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar sm">${esc(initials(u.name))}</div><div><div class="bold">${esc(u.name)}</div><div class="tiny muted">${esc(u.cargo || '')}</div></div></td>
          <td>${esc(u.username || u.email)}</td>
          <td class="small">${esc(u.email)}</td>
          <td><span class="badge badge-primary">${ROLE_LABELS[u.role]}</span></td>
          <td>${u.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
          <td class="small muted">${esc(u.lastAccess || '—')}</td>
          <td class="small muted">${u.registeredAt}</td>
          <td>
            <button class="btn btn-outline btn-sm" data-edit="${u.id}">Editar</button>
            <button class="btn btn-neutral btn-sm" data-toggle="${u.id}">${u.active ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`).join('')}</tbody></table></div>`;

  $$('[data-toggle]', el).forEach((b) => b.onclick = () => {
    const u = users.find((x) => x.id === b.dataset.toggle);
    u.active = !u.active;
    Store.users = users;
    logAudit(u.active ? 'Activó usuario' : 'Desactivó usuario', u.name);
    toast(u.name + (u.active ? ' activado.' : ' desactivado.'), 'success');
    renderDevAdmin('users');
  });

  $$('[data-edit]', el).forEach((b) => b.onclick = () => userFormModal(users.find((x) => x.id === b.dataset.edit)));
  $('#addUser').onclick = () => userFormModal(null);
}

function userFormModal(u) {
  const isEdit = !!u;
  const roles = [['user', ROLE_LABELS.user], ['adminbar', ROLE_LABELS.adminbar], ['admindev', ROLE_LABELS.admindev]];
  const ov = modal(`
    <h3>${isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h3>
    <div class="field"><label class="label">Nombre</label><input class="input" id="ufName" value="${isEdit ? esc(u.name) : ''}"><div class="input-err-msg" id="ufNameErr"></div></div>
    <div class="field"><label class="label">Correo institucional</label><input class="input" id="ufEmail" value="${isEdit ? esc(u.email) : ''}"><div class="input-err-msg" id="ufEmailErr"></div></div>
    <div class="field"><label class="label">Cargo / Rol de usuario</label><input class="input" id="ufCargo" value="${isEdit ? esc(u.cargo || '') : ''}"></div>
    <div class="field"><label class="label">Aula (si aplica)</label><input class="input" id="ufAula" value="${isEdit ? esc(u.aula || '') : ''}"></div>
    <div class="field"><label class="label">Rol</label><select class="input" id="ufRole">${roles.map(([v, l]) => `<option value="${v}" ${isEdit && u.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${!isEdit ? `<div class="field"><label class="label">Contraseña inicial</label><input class="input" id="ufPass" type="password"><div class="input-err-msg" id="ufPassErr"></div></div>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn" data-save>${isEdit ? 'Guardar' : 'Crear usuario'}</button>
    </div>`, { wide: true });

  $('[data-cancel]', ov).onclick = () => ov.remove();
  $('[data-save]', ov).onclick = () => {
    const name = $('#ufName', ov).value.trim();
    const email = $('#ufEmail', ov).value.trim();
    let ok = true;
    const users = Store.users;
    if (!name) { $('#ufNameErr', ov).textContent = 'El nombre es obligatorio.'; ok = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#ufEmailErr', ov).textContent = 'Correo inválido.'; ok = false; }
    if (!isEdit && $('#ufPass', ov).value.length < 6) { $('#ufPassErr', ov).textContent = 'Mínimo 6 caracteres.'; ok = false; }
    if (!ok) return;

    if (isEdit) {
      Object.assign(u, { name, email, cargo: $('#ufCargo', ov).value, aula: $('#ufAula', ov).value, role: $('#ufRole', ov).value });
      // refresh session email if edited own
      const sess = Auth.current();
      if (sess && sess.id === u.id) { sess.name = u.name; sess.role = u.role; Auth.set(sess); }
      // sync passwords key on email change
      if (PASSWORDS[u.email] === undefined) PASSWORDS[u.email] = PASSWORDS[isEdit ? Object.keys(PASSWORDS).find((k) => k.toLowerCase() === email.toLowerCase()) : email] || 'cambio123';
      logAudit('Editó usuario', u.name);
      toast('Usuario actualizado.', 'success');
    } else {
      const id = 'u' + Date.now();
      users.push({ id, name, email, username: email, role: $('#ufRole', ov).value, cargo: $('#ufCargo', ov).value, aula: $('#ufAula', ov).value, active: true, registeredAt: new Date().toISOString().slice(0, 10) });
      PASSWORDS[email] = $('#ufPass', ov).value;
      logAudit('Creó usuario', name);
      toast('Usuario creado.', 'success');
    }
    Store.users = users;
    ov.remove();
    renderDevAdmin('users');
  };
}

/* ============================================================
   ROLES Y PERMISOS (matriz)
   ============================================================ */
function devRoles(el) {
  el.innerHTML = `
    <div class="page-title"><h1>Roles y permisos</h1></div>
    <p class="page-sub">Distribución de permisos por rol. La matriz es informativa (simulada).</p>
    <div class="table-wrap"><table class="perm-table">
      <thead><tr><th>Función</th><th>Usuario institucional</th><th>Administradora bar</th><th>Admin desarrollador</th></tr></thead>
      <tbody>${PERMISSION_MATRIX.map((r) => `
        <tr>
          <td>${r.fn}</td>
          ${[['user', r.user], ['adminbar', r.adminbar], ['admindev', r.admindev]].map(([k, v]) => {
            if (v === '—') return `<td><span class="perm-cell perm-no">—</span></td>`;
            return `<td><span class="perm-cell perm-yes">✓</span><span class="tiny muted" style="margin-left:5px">${v}</span></td>`;
          }).join('')}
        </tr>`).join('')}</tbody></table></div>
    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:8px">Usuarios por rol</h3>
      ${['user', 'adminbar', 'admindev'].map((r) => {
        const list = Store.users.filter((u) => u.role === r);
        return `<div style="margin-bottom:10px"><span class="badge badge-primary">${ROLE_LABELS[r]}</span> <span class="tiny muted">— ${list.length} usuario(s)</span></div>`;
      }).join('')}
    </div>`;
}

/* ============================================================
   INFORMACIÓN DE CAFETERÍA
   ============================================================ */
function devCafe(el) {
  const cfg = Store.config;
  el.innerHTML = `
    <div class="page-title"><h1>Información de la cafetería</h1></div>
    <div class="card">
      <h3 style="margin-bottom:14px">Datos de la cafetería</h3>
      <div class="grid grid-2">
        <div class="field"><label class="label">Nombre del establecimiento</label><input class="input" id="cfName" value="Cafetería INTESUD"></div>
        <div class="field"><label class="label">Descripción</label><input class="input" id="cfDesc" value="Cafetería y bar del Instituto Tecnológico Superior Sudamericano"></div>
      </div>
      <button class="btn" id="cfSave">Guardar información</button>
    </div>
    <div class="card" style="margin-top:18px">
      <h3 style="margin-bottom:8px">Contacto</h3>
      <div class="table-wrap"><table>
        <tr><td>Ubicación</td><td class="bold">Edificio principal INTESUD, Planta baja</td></tr>
        <tr><td>Receso de entrega</td><td class="bold">${cfg.breakStart} - ${cfg.breakEnd}</td></tr>
        <tr><td>Horario de pedidos</td><td class="bold">${cfg.orderOpen} - ${cfg.orderClose}</td></tr>
        <tr><td>Encargada</td><td class="bold">Administradora de cafetería</td></tr>
      </table></div>
    </div>`;
  $('#cfSave').onclick = () => { logAudit('Actualizó información de cafetería', $('#cfName').value); toast('Información guardada.', 'success'); };
}

/* ============================================================
   CONFIGURACIÓN GENERAL
   ============================================================ */
function devConfig(el) {
  const cfg = Store.config;
  el.innerHTML = `
    <div class="page-title"><h1>Configuración general</h1></div>
    <div class="card">
      <h3 style="margin-bottom:14px">Parámetros del sistema</h3>
      <div class="grid grid-2">
        <div class="field"><label class="label">Nombre del sistema</label><input class="input" id="gcName" value="Cafetería INTESUD — Pedidos en línea"></div>
        <div class="field"><label class="label">Capacidad máxima de preparación</label><input class="input" type="number" id="gcCap" value="${cfg.capacity}"></div>
      </div>
      <div class="field"><label class="checkbox-row"><input type="checkbox" id="gcDelivery" ${cfg.deliveryEnabled ? 'checked' : ''}> <b>Habilitar delivery interno</b></label></div>
      <button class="btn" id="gcSave">Guardar configuración</button>
    </div>
    <div class="card" style="margin-top:18px">
      <h3 style="margin-bottom:8px">Acerca de</h3>
      <p class="small muted">Prototipo frontend de validación. Sin backend. Los datos se simulan en el navegador (LocalStorage).</p>
      <div style="margin-top:10px" class="tiny muted">Versión 1.0.0 · HTML5 / CSS3 / JavaScript</div>
    </div>`;
  $('#gcSave').onclick = () => {
    cfg.deliveryEnabled = $('#gcDelivery').checked;
    cfg.capacity = parseInt($('#gcCap').value) || cfg.capacity;
    Store.config = cfg;
    logAudit('Actualizó configuración general', 'Parámetros del sistema');
    toast('Configuración guardada.', 'success');
    renderDevAdmin('config');
  };
}

/* ============================================================
   AUDITORÍA
   ============================================================ */
function devAudit(el) {
  const audit = Store.audit;
  el.innerHTML = `
    <div class="page-title"><h1>Auditoría</h1></div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input class="input" style="max-width:240px" id="audSearch" placeholder="Buscar usuario o acción...">
        <select class="input" style="max-width:200px" id="audRole">
          <option value="">Todos los roles</option>
          <option value="user">Usuario institucional</option>
          <option value="adminbar">Administradora bar</option>
          <option value="admindev">Administrador desarrollador</option>
        </select>
        <button class="btn btn-outline" id="audReset">Limpiar filtros</button>
      </div>
    </div>
    <div id="audList"></div>`;

  const renderList = (filter = '') => {
    const wrap = $('#audList');
    let list = audit;
    if (filter) list = list.filter((a) => (a.user + ' ' + a.action + ' ' + a.target).toLowerCase().includes(filter.toLowerCase()));
    if (!list.length) { wrap.innerHTML = emptyState('📜', 'Sin registros', 'No hay actividad que coincida con los filtros.'); return; }
    wrap.innerHTML = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Usuario</th><th>Acción</th><th>Elemento afectado</th><th>Hora</th></tr></thead>
      <tbody>${list.slice(0, 50).map((a) => `
        <tr><td><div class="bold small">${esc(a.user)}</div></td><td>${esc(a.action)}</td><td>${esc(a.target)}</td><td class="small muted">${a.time}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  };

  $('#audSearch').addEventListener('input', (e) => renderList(e.target.value));
  $('#audReset').onclick = () => { $('#audSearch').value = ''; renderList(); };
  renderList();
}

/* ============================================================
   DESIGN SYSTEM — Componentes reutilizables
   ============================================================ */
function devDesign(el) {
  el.innerHTML = `
    <div class="page-title"><h1>Design System</h1><span class="badge badge-primary">INTESUD · #40807E</span></div>
    <p class="page-sub">Componentes reutilizables, tokens y estados. Todo el sistema usa los mismos fundamentos.</p>

    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:12px">🎨 Colores</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:var(--primary);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#40807E</b><br><span class="tiny">Primary</span></div>
        <div style="flex:1;min-width:140px;background:var(--success);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#22a06b</b><br><span class="tiny">Success</span></div>
        <div style="flex:1;min-width:140px;background:var(--warning);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#e09a16</b><br><span class="tiny">Warning</span></div>
        <div style="flex:1;min-width:140px;background:var(--danger);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#d94b4b</b><br><span class="tiny">Danger</span></div>
        <div style="flex:1;min-width:140px;background:var(--info);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#3b7cc3</b><br><span class="tiny">Info</span></div>
      </div>
      <div class="tiny muted" style="margin-top:10px">Fondo principal blanco, textos #16201f / #5c6b69 / #8a9795, bordes #e3e9e8.</div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card">
        <h3 style="margin-bottom:12px">Tipografía & Espaciado</h3>
        <div style="display:grid;gap:8px">
          <div style="font-size:var(--fs-3xl);font-weight:800">3xl · 36px · Extrabold</div>
          <div style="font-size:var(--fs-2xl);font-weight:700">2xl · 28px · Bold</div>
          <div style="font-size:var(--fs-xl);font-weight:700">xl · 22px</div>
          <div style="font-size:var(--fs-lg)">lg · 18px</div>
          <div style="font-size:var(--fs-md)">md · 15px · base</div>
          <div style="font-size:var(--fs-sm)">sm · 13px</div>
          <div style="font-size:var(--fs-xs)">xs · 12px</div>
        </div>
        <div class="divider"></div>
        <div class="tiny muted">Espaciados: 4/8/12/16/24/32/48/64 · Radios: 6/9/12/16/22/999</div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Botones</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-outline">Outline</button>
          <button class="btn btn-ghost">Ghost</button>
          <button class="btn btn-danger">Danger</button>
          <button class="btn btn-success">Success</button>
          <button class="btn btn-warning">Warning</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm">Small</button>
          <button class="btn btn-primary btn-lg">Large</button>
          <button class="btn btn-primary" disabled>Disabled</button>
        </div>
        <div class="divider"></div>
        <div class="tiny muted">Estados: hover, active, focus-visible, disabled.</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card">
        <h3 style="margin-bottom:12px">Inputs & Form</h3>
        <div class="field"><label class="label">Input normal</label><input class="input" placeholder="Placeholder"></div>
        <div class="field"><label class="label">Input con error</label><input class="input err" value="valor inválido"><div class="input-err-msg">Mensaje de error</div></div>
        <div class="field"><label class="label">Textarea</label><textarea class="input" placeholder="Observaciones..."></textarea></div>
        <label class="checkbox-row"><input type="checkbox" checked> Checkbox activo</label>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Badges & States</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span class="badge badge-primary">Primary</span>
          <span class="badge badge-success">Success</span>
          <span class="badge badge-warning">Warning</span>
          <span class="badge badge-danger">Danger</span>
          <span class="badge badge-info">Info</span>
          <span class="badge badge-neutral">Neutral</span>
          <span class="badge badge-outline">Outline</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span class="badge badge-success"><span class="dot"></span> Listo</span>
          <span class="badge badge-warning"><span class="dot"></span> En preparación</span>
          <span class="badge badge-danger"><span class="dot"></span> Urgente</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="priority-tag urgent">🔴 URGENTE</span>
          <span class="priority-tag priority">🟠 ALTA</span>
          <span class="priority-tag normal">🟡 NORMAL</span>
        </div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card">
        <h3 style="margin-bottom:12px">Cards & Alerts</h3>
        <div class="card" style="padding:14px;margin-bottom:10px"><div class="bold">Card base</div><div class="tiny muted">Borde #e3e9e8, sombra soft, radius 16</div></div>
        <div class="alert success" style="margin-bottom:8px"><span class="a-ico">✅</span><div><b>Success</b> · Operación correcta</div></div>
        <div class="alert warning" style="margin-bottom:8px"><span class="a-ico">⚠️</span><div><b>Warning</b> · Atención</div></div>
        <div class="alert danger" style="margin-bottom:8px"><span class="a-ico">⛔</span><div><b>Error</b> · Algo falló</div></div>
        <div class="alert info"><span class="a-ico">ℹ️</span><div><b>Info</b> · Dato informativo</div></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Empty / Loading</h3>
        <div style="border:1px dashed var(--border);border-radius:10px;padding:18px;text-align:center;margin-bottom:10px">
          <div style="font-size:1.6rem">📭</div><div class="tiny muted">Empty state · Sin datos</div>
        </div>
        <div style="border:1px dashed var(--border);border-radius:10px;padding:18px;text-align:center">
          <div class="spinner" style="width:28px;height:28px;margin:0 auto 8px"></div><div class="tiny muted">Loading · Cargando...</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-outline btn-sm" onclick="toast('Toast success','success')">Toast success</button>
          <button class="btn btn-outline btn-sm" onclick="toast('Toast error','error')">Toast error</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px">Responsive</h3>
      <p class="small muted">Breakpoints: 1080px (tablet), 900px (tablet pequeña), 560px (móvil). Grids colapsan a 1 col, sidebar a drawer, tablas con scroll horizontal.</p>
      <div class="tiny muted" style="margin-top:8px">Probar redimensionando la ventana o en DevTools.</div>
    </div>
  `;
}
