/* ============================================================
   devadmin.js — Panel del Administrador Desarrollador
   ============================================================ */

const DEV_SECTIONS = {
  dashboard: { label: 'Dashboard', icon: 'bx-grid-alt' },
  users: { label: 'Usuarios', icon: 'bx-group' },
  roles: { label: 'Roles y permisos', icon: 'bx-shield' },
  cafe: { label: 'Información de cafetería', icon: 'bx-store' },
  config: { label: 'Configuración general', icon: 'bx-cog' },
  appearance: { label: 'Apariencia del sistema', icon: 'bx-palette' },
  audit: { label: 'Auditoría', icon: 'bx-file' },
};

async function renderDevAdmin(page) {
  const app = $('#app');
  if (!currentUser() || currentUser().role !== 'admindev') return route('login');
  const sec = DEV_SECTIONS[page] ? page : 'dashboard';
  syncBodyClass();

  app.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar" id="adminSidebar" aria-label="Menú principal">
        <div class="sb-brand"><span style="font-size:1.3rem"><i class="bx bx-cog"></i></span> Sistema INTESUD<button class="sb-close" id="sbClose" aria-label="Cerrar menú"><i class="bx bx-x"></i></button></div>
        <nav class="sb-nav">
          ${Object.entries(DEV_SECTIONS).map(([k, v]) => `
            <a class="sb-link ${k === sec ? 'active' : ''}" href="#" data-dev="${k}"><span class="sb-ico bx ${v.icon}"></span><span class="sb-label">${v.label}</span></a>`).join('')}
        </nav>
        <div class="sb-footer">
          <div class="bold small">${esc(currentUser().name)}</div>
          <div class="tiny muted">Administrador desarrollador</div>
        </div>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="admin-menu-toggle" id="devHamburger" aria-label="Abrir menú" aria-expanded="false" aria-controls="adminSidebar"><i class="bx bx-menu"></i></button>
          <span style="font-size:1.3rem"><i class="bx ${DEV_SECTIONS[sec].icon}"></i></span>
          <span class="page-name">${DEV_SECTIONS[sec].label}</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
            <div class="profile-chip" id="devUserMenu">
              <div class="avatar sm">${esc(initials(currentUser().name))}</div><span class="pname">${esc(currentUser().name)}</span> <i class="bx bx-chevron-down" style="font-size:0.8rem"></i>
              <div class="dropdown-menu" id="devUserDropdown" style="display:none">
                <a class="dropdown-item" href="#" data-link="profile"><span class="dm-ico"><i class="bx bx-user"></i></span>Mi perfil</a>
                <div class="dropdown-sep"></div>
                <a class="dropdown-item danger" href="#" id="btnDevLogout"><span class="dm-ico"><i class="bx bx-log-out"></i></span>Cerrar sesión</a>
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
  $('#btnDevLogout').onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    ud.style.display = 'none';
    const logoutRequest = Auth.logout();
    const appEl = document.getElementById('app');
    if (appEl) appEl.innerHTML = '';
    toast('Sesión cerrada.', 'info');
    setRoute('login');
    await logoutRequest;
  };

  const sidebar = $('#adminSidebar', app);
  const devHamburger = $('#devHamburger', app);
  const sbClose = $('#sbClose', app);
  let sbScrim = null;
  let escHandler = null;
  const ensureScrim = () => {
    if (sbScrim || !sidebar) return;
    sbScrim = document.createElement('div');
    sbScrim.className = 'sb-scrim';
    sbScrim.setAttribute('aria-hidden', 'true');
    sbScrim.style.display = 'none';
    document.body.appendChild(sbScrim);
    sbScrim.addEventListener('click', closeSidebar);
  };
  function openSidebar() {
    if (!sidebar) return;
    ensureScrim();
    sidebar.classList.add('open');
    if (sbScrim) sbScrim.style.display = 'block';
    if (devHamburger) devHamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (!escHandler) { escHandler = (e) => { if (e.key === 'Escape') closeSidebar(); }; document.addEventListener('keydown', escHandler); }
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    if (sbScrim) sbScrim.style.display = 'none';
    if (devHamburger) devHamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  }
  window._devCloseSidebar = closeSidebar;
  if (devHamburger) devHamburger.addEventListener('click', (e) => { e.preventDefault(); if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar(); });
  if (sbClose) sbClose.addEventListener('click', (e) => { e.preventDefault(); closeSidebar(); });
  $$('[data-dev]', app).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); closeSidebar(); setRoute('admindev/' + a.dataset.dev); }));

  const content = $('#devContent');
  const renderers = {
    dashboard: devDashboard,
    users: devUsers,
    roles: devRoles,
    cafe: devCafe,
    config: devConfig,
    appearance: devAppearance,
    audit: devAudit,
  };
  // Show loading skeleton
  content.innerHTML = `<div style="padding:4px"><div class="skeleton" style="height:28px;width:160px;margin-bottom:18px"></div><div class="grid grid-4" style="margin-bottom:16px"><div class="skeleton" style="height:92px"></div><div class="skeleton" style="height:92px"></div><div class="skeleton" style="height:92px"></div><div class="skeleton" style="height:92px"></div></div></div>`;
  try {
    await renderers[sec](content);
  } catch (error) {
    console.error('Error rendering dev admin:', error);
    content.innerHTML = emptyState('<i class="bx bx-error-circle"></i>', 'Error', 'No se pudo cargar la sección.');
  }
}

/* ============================================================
   DASHBOARD GENERAL
   ============================================================ */
async function devDashboard(el) {
  const [usersRes, ordersRes, productsRes, auditRes, configRes, deliveryRes] = await Promise.all([
    ApiClient.get(API_ENDPOINTS.auth.users),
    ApiClient.getAll(API_ENDPOINTS.orders.all),
    ApiClient.getAll(API_ENDPOINTS.products.list),
    ApiClient.getAll(API_ENDPOINTS.audit.list),
    ApiClient.get(API_ENDPOINTS.config.get),
    ApiClient.get(API_ENDPOINTS.delivery.config),
  ]);
  
  const users = usersRes.ok && usersRes.data ? (usersRes.data.results || usersRes.data) : [];
  const orders = ordersRes.ok && ordersRes.data ? (ordersRes.data.results || ordersRes.data) : [];
  const products = productsRes.ok && productsRes.data && productsRes.data.results ? productsRes.data.results : (productsRes.ok && Array.isArray(productsRes.data) ? productsRes.data : []);
  const audit = auditRes.ok && auditRes.data ? (auditRes.data.results || auditRes.data) : [];
  const cfg = configRes.ok ? configRes.data : {};
  const deliveryCfg = deliveryRes.ok ? deliveryRes.data : {};
  
  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveUsers = users.length - activeUsers;
  const roleCount = Object.keys(ROLE_LABELS).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.created_at && o.created_at.slice(0, 10) === today).length;
  const live = orders.filter((o) => ['queue', 'confirmed', 'prep', 'ready'].includes(o.status)).length;
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
          <div class="kv"><dt>Cafetería</dt><dd><span class="badge ${cfg.is_open ? 'badge-success' : 'badge-danger'}">${cfg.is_open ? 'Abierta' : 'Cerrada'}</span></dd></div>
          <div class="kv"><dt>Delivery interno</dt><dd><span class="badge ${deliveryCfg.enabled ? 'badge-success' : 'badge-danger'}">${deliveryCfg.enabled ? 'Habilitado' : 'Deshabilitado'}</span></dd></div>
          <div class="kv"><dt>Horario de pedidos</dt><dd class="bold small">${cfg.order_open_time} - ${cfg.order_close_time}</dd></div>
          <div class="kv"><dt>Receso</dt><dd class="bold small">${cfg.break_start} - ${cfg.break_end}</dd></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
          ${[['users', 'bx-group', 'Usuarios'], ['roles', 'bx-shield', 'Roles y permisos'], ['cafe', 'bx-store', 'Cafetería'], ['config', 'bx-cog', 'Configuración'], ['audit', 'bx-file', 'Auditoría']].map(([k, ic, l]) =>
            `<a href="#" class="btn btn-outline" data-goto="${k}"><i class="bx ${ic}"></i> ${l}</a>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Actividad reciente</div><div class="card-sub">Últimas acciones administrativas</div></div>
          <a href="#" class="btn btn-sm btn-outline" data-goto="audit">Ver toda</a></div>
        <div class="card-body">
          ${recentAudit.length ? `<div class="timeline">${recentAudit.map((a) => `
            <div class="tl-step">
              <div class="tl-dot">${esc(initials(a.user_name))}</div>
              <div class="tl-body">
                <div class="tl-label"><b>${esc(a.user_name)}</b> ${esc(a.action)}</div>
                <div class="tl-time">${esc(a.target || '')} · ${esc(a.created_at)}</div>
              </div>
            </div>`).join('')}</div>`
          : `<div class="empty-state" style="padding:12px 0"><div class="es-ico"><i class="bx bx-inbox"></i></div><h3>Sin actividad</h3></div>`}
        </div>
      </div>
    </div>`;
  $$('[data-goto]', el).forEach((a) => a.onclick = (e) => { e.preventDefault(); setRoute('admindev/' + a.dataset.goto); });
}

/* ============================================================
   USUARIOS
   ============================================================ */
async function devUsers(el) {
  const usersRes = await ApiClient.get(API_ENDPOINTS.auth.users);
  const users = usersRes.ok && usersRes.data ? (usersRes.data.results || usersRes.data) : [];
  
  el.innerHTML = `
    <div class="page-title"><h1>Usuarios</h1><button class="btn" id="addUser">+ Nuevo usuario</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Registro</th><th></th></tr></thead>
      <tbody>${users.map((u) => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar sm">${esc(initials(u.first_name + ' ' + u.last_name))}</div><div><div class="bold">${esc(u.first_name + ' ' + u.last_name)}</div><div class="tiny muted">${esc(u.cargo || '')}</div></div></td>
          <td>${esc(u.username)}</td>
          <td class="small">${esc(u.email)}</td>
          <td><span class="badge badge-primary">${ROLE_LABELS[u.role]}</span></td>
          <td>${u.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
          <td class="small muted">${esc(u.profile?.last_access || '—')}</td>
          <td class="small muted">${u.date_joined ? u.date_joined.slice(0, 10) : '—'}</td>
          <td>
            <button class="btn btn-outline btn-sm" data-edit="${u.id}">Editar</button>
            <button class="btn btn-neutral btn-sm" data-toggle="${u.id}">${u.is_active ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`).join('')}</tbody></table></div>`;

  $$('[data-toggle]', el).forEach((b) => {
    b.onclick = async () => {
      const userId = b.dataset.toggle;
      const user = users.find((x) => x.id === parseInt(userId));
      if (!user) return;
      const newStatus = !user.is_active;
      const response = await ApiClient.patch(API_ENDPOINTS.auth.userDetail(userId), { is_active: newStatus });
      if (!response.ok) {
        toast('Error al cambiar estado: ' + (response.data?.detail || 'Error desconocido'), 'error');
        return;
      }
      toast(user.first_name + ' ' + user.last_name + (newStatus ? ' activado.' : ' desactivado.'), 'success');
      logAudit(newStatus ? 'Activó usuario' : 'Desactivó usuario', user.first_name + ' ' + user.last_name);
      renderDevAdmin('users');
    };
  });

  $$('[data-edit]', el).forEach((b) => b.onclick = () => userFormModal(users.find((x) => x.id === parseInt(b.dataset.edit)), users));
  $('#addUser').onclick = () => userFormModal(null, users);
}

function userFormModal(u, allUsers = []) {
  const isEdit = !!u;
  const roles = [['user', ROLE_LABELS.user], ['adminbar', ROLE_LABELS.adminbar], ['admindev', ROLE_LABELS.admindev]];
  const ov = modal(`
    <h3>${isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h3>
    <div class="field"><label class="label">Nombre</label><input class="input" id="ufName" value="${isEdit ? esc(u.first_name + ' ' + u.last_name) : ''}"><div class="input-err-msg" id="ufNameErr"></div></div>
    ${isEdit ? `<div class="field"><label class="label">Usuario</label><input class="input" id="ufUsername" value="${isEdit ? esc(u.username) : ''}"><div class="input-err-msg" id="ufUsernameErr"></div></div>` : ''}
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
  $('[data-save]', ov).onclick = async () => {
    const name = $('#ufName', ov).value.trim();
    const username = isEdit ? $('#ufUsername', ov).value.trim() : null;
    const email = $('#ufEmail', ov).value.trim();
    let ok = true;
    if (!name) { $('#ufNameErr', ov).textContent = 'El nombre es obligatorio.'; ok = false; }
    if (isEdit && !username) { $('#ufUsernameErr', ov).textContent = 'El nombre de usuario es obligatorio.'; ok = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#ufEmailErr', ov).textContent = 'Correo inválido.'; ok = false; }
    if (!isEdit && $('#ufPass', ov).value.length < 8) { $('#ufPassErr', ov).textContent = 'Mínimo 8 caracteres.'; ok = false; }
    if (ok && isEdit && username) {
      const conflict = (allUsers || []).some((x) => String(x.id) !== String(u.id) && x.username && x.username.toLowerCase() === username.toLowerCase());
      if (conflict) { $('#ufUsernameErr', ov).textContent = 'Ya existe otro usuario con ese nombre de usuario.'; ok = false; }
    }
    if (!ok) return;

    const [firstName, ...lastNameParts] = name.split(' ');
    const first_name = firstName;
    const last_name = lastNameParts.join(' ');
    const role = $('#ufRole', ov).value;
    const cargo = $('#ufCargo', ov).value;
    const aula = $('#ufAula', ov).value;

    if (isEdit) {
      const payload = { first_name, last_name, email, role, cargo, aula };
      if (username) payload.username = username;
      const response = await ApiClient.patch(API_ENDPOINTS.auth.userDetail(u.id), payload);
      if (!response.ok) {
        if (response.data?.username?.[0]) $('#ufUsernameErr', ov).textContent = response.data.username[0];
        toast('Error: ' + (response.data?.username?.[0] || response.data?.detail || 'Error al actualizar'), 'error');
        return;
      }
      // refresh session if edited own
      const sess = Auth.current();
      if (sess && sess.id === u.id) { sess.name = name; sess.username = username || sess.username; sess.email = email; sess.role = role; Auth.set(sess); }
      logAudit('Editó usuario', name);
      toast('Usuario actualizado.', 'success');
    } else {
      const password = $('#ufPass', ov).value;
      const response = await ApiClient.post(API_ENDPOINTS.auth.register, {
        username: email,
        email,
        first_name,
        last_name,
        password,
        cargo,
        aula,
      });
      if (!response.ok) {
        const msg = response.data?.username?.[0] || response.data?.email?.[0] || response.data?.detail || 'Error al crear usuario';
        toast('Error: ' + msg, 'error');
        return;
      }
      // Register no permite role (read_only); si es distinto de user, asignar vía PATCH (solo admindev puede)
      if (role !== 'user' && response.data?.id) {
        await ApiClient.patch(API_ENDPOINTS.auth.userDetail(response.data.id), { role });
      } else if (role !== 'user' && response.data?.user?.id) {
        await ApiClient.patch(API_ENDPOINTS.auth.userDetail(response.data.user.id), { role });
      }
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
async function devRoles(el) {
  el.innerHTML = `<div class="page-title"><h1>Roles y permisos</h1></div><div class="skeleton" style="height:200px"></div>`;
  const [usersRes, permsRes] = await Promise.all([
    ApiClient.get(API_ENDPOINTS.auth.users),
    ApiClient.get(API_ENDPOINTS.auth.permissions),
  ]);
  if (!permsRes.ok) {
    el.innerHTML = `<div class="page-title"><h1>Roles y permisos</h1></div><div class="alert danger"><i class="bx bx-error-circle"></i> No se pudieron cargar permisos: ${esc(permsRes.data?.detail || 'Error')}</div>`;
    return;
  }
  const users = usersRes.ok && usersRes.data ? (usersRes.data.results || usersRes.data) : [];
  const perms = permsRes.ok && permsRes.data ? (Array.isArray(permsRes.data) ? permsRes.data : (permsRes.data.results || [])) : [];
  const roleCounts = { user: 0, adminbar: 0, admindev: 0 };
  users.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });
  // mapa role -> code -> enabled
  const permMap = { user: {}, adminbar: {}, admindev: {} };
  perms.forEach(p => { if (permMap[p.role] !== undefined) permMap[p.role][p.code] = p.enabled; });
  const allCodes = Object.keys(PERMISSIONS_CATALOG).sort();
  el.innerHTML = `
    <div class="page-title"><h1>Roles y permisos</h1><button class="btn btn-primary" id="savePerms"><i class="bx bx-save"></i> Guardar cambios</button></div>
    <p class="page-sub">Matriz real desde PostgreSQL. Los cambios afectan el acceso inmediatamente.</p>
    <div class="table-wrap" style="max-height:60vh; overflow:auto"><table class="perm-table">
      <thead><tr><th>Permiso</th><th>Usuario</th><th>Admin Bar</th><th>Admin Dev</th></tr></thead>
      <tbody>${allCodes.map(code => `
        <tr>
          <td><div class="bold small">${esc(code)}</div><div class="tiny muted">${esc(PERMISSIONS_CATALOG[code])}</div></td>
          ${['user','adminbar','admindev'].map(role => `
            <td style="text-align:center"><label style="cursor:pointer"><input type="checkbox" data-perm="${role}:${code}" ${permMap[role][code] ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary)"></label></td>
          `).join('')}
        </tr>`).join('')}</tbody></table></div>
    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:8px">Usuarios por rol</h3>
      ${['user', 'adminbar', 'admindev'].map((r) => `
        <div style="margin-bottom:10px"><span class="badge badge-primary">${ROLE_LABELS[r]}</span> <span class="tiny muted">— ${roleCounts[r]} usuario(s)</span></div>
      `).join('')}</div>`;
  $('#savePerms', el).onclick = async () => {
    const btn = $('#savePerms', el);
    btn.disabled = true; btn.textContent = 'Guardando...';
    const byRole = { user: {}, adminbar: {}, admindev: {} };
    $$('[data-perm]', el).forEach(ch => {
      const [role, code] = ch.dataset.perm.split(':');
      byRole[role][code] = ch.checked;
    });
    let ok = true;
    for (const role of ['user','adminbar','admindev']) {
      const res = await ApiClient.post(API_ENDPOINTS.auth.permissions, { role, permissions: byRole[role] });
      if (!res.ok) { toast(res.data?.detail || 'Error guardando ' + role, 'error'); ok = false; break; }
    }
    if (ok) { toast('Permisos guardados en PostgreSQL', 'success'); devRoles(el); }
    btn.disabled = false; btn.innerHTML = '<i class="bx bx-save"></i> Guardar cambios';
  };
}

/* ============================================================
   INFORMACIÓN DE CAFETERÍA
   ============================================================ */
async function devCafe(el) {
  const configRes = await ApiClient.get(API_ENDPOINTS.config.get);
  const cfg = configRes.ok ? configRes.data : {};
  
  el.innerHTML = `
    <div class="page-title"><h1>Información de la cafetería</h1></div>
    <div class="card">
      <h3 style="margin-bottom:14px">Datos de la cafetería</h3>
      <div class="grid grid-2">
        <div class="field"><label class="label">Nombre del establecimiento</label><input class="input" id="cfName" value="${cfg.name || 'Cafetería INTESUD'}"></div>
        <div class="field"><label class="label">Descripción</label><input class="input" id="cfDesc" value="${cfg.description || 'Cafetería y bar del Instituto Tecnológico Superior Sudamericano'}"></div>
      </div>
      <button class="btn" id="cfSave">Guardar información</button>
    </div>
    <div class="card" style="margin-top:18px">
      <h3 style="margin-bottom:8px">Contacto</h3>
      <div class="table-wrap"><table>
        <tr><td>Ubicación</td><td class="bold">Edificio principal INTESUD, Planta baja</td></tr>
        <tr><td>Receso de entrega</td><td class="bold">${cfg.break_start} - ${cfg.break_end}</td></tr>
        <tr><td>Horario de pedidos</td><td class="bold">${cfg.order_open_time} - ${cfg.order_close_time}</td></tr>
        <tr><td>Encargada</td><td class="bold">Administradora de cafetería</td></tr>
      </table></div>
    </div>`;
  $('#cfSave').onclick = async () => {
    const response = await ApiClient.patch(API_ENDPOINTS.config.update, {
      name: $('#cfName').value,
      description: $('#cfDesc').value,
    });
    if (response.ok) {
      toast('Información guardada.', 'success');
      logAudit('Actualizó información de cafetería', $('#cfName').value);
    } else {
      toast('Error al guardar: ' + (response.data?.detail || 'Error desconocido'), 'error');
    }
  };
}

/* ============================================================
   CONFIGURACIÓN GENERAL
   ============================================================ */
async function devConfig(el) {
  const [configRes, deliveryRes] = await Promise.all([
    ApiClient.get(API_ENDPOINTS.config.get),
    ApiClient.get(API_ENDPOINTS.delivery.config),
  ]);
  const cfg = configRes.ok ? configRes.data : {};
  const deliveryCfg = deliveryRes.ok ? deliveryRes.data : {};
  
  el.innerHTML = `
    <div class="page-title"><h1>Configuración general</h1></div>
    <div class="card">
      <h3 style="margin-bottom:14px">Parámetros del sistema</h3>
      <div class="grid grid-2">
        <div class="field"><label class="label">Nombre del sistema</label><input class="input" id="gcName" value="${cfg.name || 'Cafetería INTESUD — Pedidos en línea'}"></div>
        <div class="field"><label class="label">Capacidad máxima de preparación</label><input class="input" type="number" id="gcCap" value="${cfg.total_capacity || 10}"></div>
      </div>
        <div class="field"><label class="checkbox-row"><input type="checkbox" id="gcDelivery" ${deliveryCfg.enabled ? 'checked' : ''}> <b>Habilitar delivery interno</b></label></div>
      <button class="btn" id="gcSave">Guardar configuración</button>
    </div>
    <div class="card" style="margin-top:18px">
      <h3 style="margin-bottom:8px">Acerca de</h3>
      <p class="small muted">Backend Django + PostgreSQL. API REST con autenticación JWT.</p>
      <div style="margin-top:10px" class="tiny muted">Versión 1.0.0 · HTML5 / CSS3 / JavaScript</div>
    </div>`;
  $('#gcSave').onclick = async () => {
    const [response, deliveryResponse] = await Promise.all([
      ApiClient.patch(API_ENDPOINTS.config.update, {
        name: $('#gcName').value.trim(),
        total_capacity: parseInt($('#gcCap').value) || cfg.total_capacity,
      }),
      ApiClient.patch(API_ENDPOINTS.delivery.config, {
        enabled: $('#gcDelivery').checked,
      }),
    ]);
    if (response.ok && deliveryResponse.ok) {
      toast('Configuración guardada.', 'success');
      logAudit('Actualizó configuración general', 'Parámetros del sistema');
    } else {
      toast('Error al guardar: ' + (response.data?.detail || deliveryResponse.data?.detail || 'Error desconocido'), 'error');
    }
  };
}

/* ============================================================
   APARIENCIA DEL SISTEMA
   ============================================================ */
const APPEARANCE_FIELDS = [
  { field: 'hero_background', urlKey: 'hero_background_url', label: 'Fondo del Landing', hint: 'Portada de la página de inicio', group: 'Inicio' },
  { field: 'barra_atencion_image', urlKey: 'barra_atencion_image_url', label: 'Barra de atención', hint: 'Imagen del bloque "Barra de atención"', group: 'Landing · galería' },
  { field: 'espacio_disfrutar_image', urlKey: 'espacio_disfrutar_image_url', label: 'Espacio para disfrutar', hint: 'Imagen del bloque "Espacio para disfrutar"', group: 'Landing · galería' },
  { field: 'cafe_snacks_image', urlKey: 'cafe_snacks_image_url', label: 'Café y snacks', hint: 'Imagen del bloque "Café y snacks"', group: 'Landing · galería' },
  { field: 'login_background', urlKey: 'login_background_url', label: 'Fondo del Login', hint: 'Fondo de la pantalla de inicio de sesión', group: 'Acceso' },
  { field: 'login_mascot', urlKey: 'login_mascot_url', label: 'Mascota del Login', hint: 'Imagen decorativa junto al formulario', group: 'Acceso' },
  { field: 'system_logo', urlKey: 'system_logo_url', label: 'Logo del sistema', hint: 'Logotipo usado en Login y Landing', group: 'Acceso' },
];

function devAppearanceCard(h, cfg) {
  const url = cfg[h.urlKey];
  const name = url ? url.split('/').pop() : '';
  const thumb = url
    ? `<img src="${url}" alt="${esc(h.label)}">`
    : `<div class="tiny muted" style="display:flex;align-items:center;justify-content:center;height:100%;width:100%;text-align:center;padding:4px">Imagen predeterminada</div>`;
  return `
    <div class="appearance-item" data-field="${h.field}" style="display:flex;gap:14px;align-items:center;padding:12px;border:1px solid var(--glass-border);border-radius:12px;margin-bottom:12px;background:var(--glass-inner)">
      <div class="app-thumb" style="width:96px;height:64px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--glass-inner);display:flex;align-items:center;justify-content:center">${thumb}</div>
      <div style="flex:1;min-width:0">
        <div class="bold small">${esc(h.label)}</div>
        <div class="tiny muted">${esc(h.hint)}</div>
        <div class="tiny" data-state style="margin-top:2px">${name ? 'Actual: ' + esc(name) : 'Usa la imagen predeterminada'}</div>
      </div>
      <div class="app-actions" style="display:flex;flex-direction:column;gap:6px;align-items:stretch;flex-shrink:0">
        <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-file>
        <button class="btn btn-sm btn-outline" data-pick>Cambiar imagen</button>
        <button class="btn btn-sm btn-primary" data-save disabled>Guardar</button>
        <button class="btn btn-sm btn-ghost" data-reset ${url ? '' : 'disabled'}>Restaurar predeterminada</button>
      </div>
    </div>`;
}

async function devAppearance(el) {
  const configRes = await ApiClient.get(API_ENDPOINTS.config.get);
  const cfg = configRes.ok ? configRes.data : {};

  const groups = {};
  APPEARANCE_FIELDS.forEach((h) => { (groups[h.group] = groups[h.group] || []).push(h); });

  el.innerHTML = `
    <div class="page-title"><h1>Apariencia del sistema</h1></div>
    <p class="page-sub">Personaliza las imágenes de Landing y Login. Se aceptan PNG/JPG/WEBP de hasta 5&nbsp;MB. Si dejas el campo vacío, se usa la imagen predeterminada.</p>
    <div id="appGroups">
      ${Object.entries(groups).map(([g, hs]) => `
        <div class="card" style="margin-bottom:16px">
          <h3 style="margin-bottom:10px">${esc(g)}</h3>
          ${hs.map((h) => devAppearanceCard(h, cfg)).join('')}
        </div>`).join('')}
    </div>`;

  const pending = {};
  const applyResult = (data) => {
    Store.config = data;
    if (typeof bindAssetCssVars === 'function') bindAssetCssVars(data);
  };
  const fieldError = (data) => (data && (
    data.hero_background?.[0] || data.barra_atencion_image?.[0]
    || data.espacio_disfrutar_image?.[0] || data.cafe_snacks_image?.[0]
    || data.login_background?.[0] || data.login_mascot?.[0]
    || data.system_logo?.[0] || data.detail)) || null;

  $$('[data-pick]', el).forEach((btn) => {
    btn.onclick = () => btn.closest('.appearance-item').querySelector('[data-file]').click();
  });

  $$('[data-file]', el).forEach((input) => {
    input.addEventListener('change', () => {
      const item = input.closest('.appearance-item');
      const file = input.files && input.files[0];
      if (!file) return;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        toast('Solo se aceptan imágenes PNG, JPG o WEBP.', 'error');
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast('La imagen no puede superar los 5 MB.', 'error');
        input.value = '';
        return;
      }
      pending[item.dataset.field] = file;
      item.querySelector('.app-thumb').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Vista previa">`;
      item.querySelector('[data-state]').textContent = 'Listo para guardar: ' + file.name;
      item.querySelector('[data-save]').disabled = false;
    });
  });

  $('#appGroups', el).addEventListener('click', async (e) => {
    const saveBtn = e.target.closest('[data-save]');
    const resetBtn = e.target.closest('[data-reset]');
    const item = e.target.closest('.appearance-item');
    if (!item) return;
    const field = item.dataset.field;

    if (saveBtn) {
      const file = pending[field];
      if (!file) return;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Subiendo...';
      const form = new FormData();
      form.append(field, file);
      const res = await ApiClient.patch(API_ENDPOINTS.config.update, form);
      if (!res.ok) {
        toast('Error: ' + (fieldError(res.data) || 'Error al guardar la imagen'), 'error');
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Guardar';
        return;
      }
      applyResult(res.data);
      delete pending[field];
      toast('Imagen guardada.', 'success');
      logAudit('Cambió la imagen', field);
      devAppearance(el);
      return;
    }

    if (resetBtn) {
      resetBtn.disabled = true;
      const res = await ApiClient.patch(API_ENDPOINTS.config.update, { [field]: null });
      if (!res.ok) {
        toast('Error: ' + (fieldError(res.data) || 'Error al restaurar la imagen'), 'error');
        resetBtn.disabled = false;
        return;
      }
      applyResult(res.data);
      toast('Se restauró la imagen predeterminada.', 'success');
      logAudit('Restauró imagen predeterminada', field);
      devAppearance(el);
      return;
    }
  });
}

/* ============================================================
   AUDITORÍA
   ============================================================ */
async function devAudit(el) {
  const auditRes = await ApiClient.getAll(API_ENDPOINTS.audit.list);
  const audit = auditRes.ok && auditRes.data ? (auditRes.data.results || auditRes.data) : [];
  
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
    if (filter) list = list.filter((a) => (a.user_name + ' ' + a.action + ' ' + a.target).toLowerCase().includes(filter.toLowerCase()));
    if (!list.length) { wrap.innerHTML = emptyState('<i class="bx bx-file"></i>', 'Sin registros', 'No hay actividad que coincida con los filtros.'); return; }
    wrap.innerHTML = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Usuario</th><th>Acción</th><th>Elemento afectado</th><th>Hora</th></tr></thead>
      <tbody>${list.slice(0, 50).map((a) => `
        <tr><td><div class="bold small">${esc(a.user_name)}</div></td><td>${esc(a.action)}</td><td>${esc(a.target)}</td><td class="small muted">${a.created_at}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  };

  $('#audSearch').addEventListener('input', (e) => renderList(e.target.value));
  $('#audReset').onclick = () => { $('#audSearch').value = ''; renderList(); };
  renderList();
}
