/* ============================================================
   devadmin.js — Panel del Administrador Desarrollador (Dark Glass Unificado)
   ============================================================ */

const DEV_SECTIONS = {
  dashboard: { label: 'Dashboard', icon: 'bx-grid-alt' },
  users: { label: 'Usuarios', icon: 'bx-group' },
  roles: { label: 'Roles y permisos', icon: 'bx-shield' },
  cafe: { label: 'Información de cafetería', icon: 'bx-store' },
  config: { label: 'Configuración general', icon: 'bx-cog' },
  audit: { label: 'Auditoría', icon: 'bx-file' },
};

const DEV_BOTTOM_NAV = [
  { id: 'dashboard', label: 'Inicio', icon: 'bx-grid-alt' },
  { id: 'users', label: 'Usuarios', icon: 'bx-group' },
  { id: 'roles', label: 'Roles', icon: 'bx-shield' },
  { id: 'cafe', label: 'Cafetería', icon: 'bx-store' },
  { id: 'more', label: 'Más', icon: 'bx-dots-horizontal-rounded' },
];

const DEV_MORE_ITEMS = [
  { id: 'config', label: 'Configuración', icon: 'bx-cog' },
  { id: 'audit', label: 'Auditoría', icon: 'bx-file' },
];

async function renderDevAdmin(page) {
  const app = $('#app');
  if (!currentUser() || currentUser().role !== 'admindev') return route('login');
  const sec = DEV_SECTIONS[page] ? page : 'dashboard';
  syncBodyClass();

  app.innerHTML = `
    <div class="admin-layout">
      <div class="admin-main">
        <div class="admin-topbar">
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
      <nav class="admin-bottom-nav" id="devBottomNav">
        <div class="bn-grid">
          ${DEV_BOTTOM_NAV.map((item) => {
            const isActive = item.id === 'more'
              ? ['config','audit'].includes(sec)
              : sec === item.id;
            return `<a class="bn-item ${isActive ? 'active' : ''}" href="#" data-bnav="${item.id}">
              <span class="bn-ico bx ${item.icon}"></span>
              <span>${item.label}</span>
            </a>`;
          }).join('')}
        </div>
      </nav>
      <div id="devMoreModal" style="display:none"></div>
    </div>`;

  const moreModal = $('#devMoreModal', app);
  const closeMoreModal = () => { if (moreModal) { moreModal.style.display = 'none'; moreModal.innerHTML = ''; } };
  const openMoreModal = () => {
    if (!moreModal) return;
    moreModal.innerHTML = `
      <div class="admin-more-scrim"></div>
      <div class="admin-more-sheet">
        <div class="admin-more-header">
          <span>Más opciones</span>
          <button class="btn btn-ghost btn-sm" id="closeMoreBtn"><i class="bx bx-x"></i></button>
        </div>
        ${DEV_MORE_ITEMS.map(item => `
          <a class="admin-more-item ${sec === item.id ? 'active' : ''}" href="#" data-more="${item.id}">
            <span class="ami-ico bx ${item.icon}"></span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </div>
    `;
    moreModal.style.display = 'block';
    $('.admin-more-scrim', moreModal)?.addEventListener('click', closeMoreModal);
    $('#closeMoreBtn', moreModal)?.addEventListener('click', closeMoreModal);
    $$('[data-more]', moreModal).forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      closeMoreModal();
      setRoute('admindev/' + a.dataset.more);
    }));
  };

  $$('[data-bnav]', app).forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = a.dataset.bnav;
    if (target === 'more') openMoreModal();
    else { closeMoreModal(); setRoute('admindev/' + target); }
  }));

  const ud = $('#devUserDropdown');
  $('#devUserMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'profile') { renderProfileModal(); ud.style.display = 'none'; } else setRoute(t); });
  $('#btnDevLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); route('login'); };

  const content = $('#devContent');
  const renderers = {
    dashboard: devDashboard,
    users: devUsers,
    roles: devRoles,
    cafe: devCafe,
    config: devConfig,
    audit: devAudit,
  };
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
    ApiClient.get(API_ENDPOINTS.orders.all),
    ApiClient.get(API_ENDPOINTS.products.list),
    ApiClient.get(API_ENDPOINTS.audit.list),
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

  $$('[data-edit]', el).forEach((b) => b.onclick = () => userFormModal(users.find((x) => x.id === parseInt(b.dataset.edit))));
  $('#addUser').onclick = () => userFormModal(null);
}

function userFormModal(u) {
  const isEdit = !!u;
  const roles = [['user', ROLE_LABELS.user], ['adminbar', ROLE_LABELS.adminbar], ['admindev', ROLE_LABELS.admindev]];
  const ov = modal(`
    <h3>${isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h3>
    <div class="field"><label class="label">Nombre</label><input class="input" id="ufName" value="${isEdit ? esc(u.first_name + ' ' + u.last_name) : ''}"><div class="input-err-msg" id="ufNameErr"></div></div>
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
    const email = $('#ufEmail', ov).value.trim();
    let ok = true;
    if (!name) { $('#ufNameErr', ov).textContent = 'El nombre es obligatorio.'; ok = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#ufEmailErr', ov).textContent = 'Correo inválido.'; ok = false; }
    if (!isEdit && $('#ufPass', ov).value.length < 8) { $('#ufPassErr', ov).textContent = 'Mínimo 8 caracteres.'; ok = false; }
    if (!ok) return;

    const [firstName, ...lastNameParts] = name.split(' ');
    const first_name = firstName;
    const last_name = lastNameParts.join(' ');
    const role = $('#ufRole', ov).value;
    const cargo = $('#ufCargo', ov).value;
    const aula = $('#ufAula', ov).value;

    if (isEdit) {
      const response = await ApiClient.patch(API_ENDPOINTS.auth.userDetail(u.id), {
        first_name, last_name, email, role, cargo, aula
      });
      if (!response.ok) {
        toast('Error: ' + (response.data?.detail || 'Error al actualizar'), 'error');
        return;
      }
      // refresh session if edited own
      const sess = Auth.current();
      if (sess && sess.id === u.id) { sess.name = name; sess.role = role; Auth.set(sess); }
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
   AUDITORÍA
   ============================================================ */
async function devAudit(el) {
  const auditRes = await ApiClient.get(API_ENDPOINTS.audit.list);
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