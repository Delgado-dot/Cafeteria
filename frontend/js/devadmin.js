/* ============================================================
   devadmin.js — Panel del Administrador Desarrollador (SaaS Platform)
   Senior UI/UX + Design System — Participante 8
   ============================================================ */

const DEV_SECTIONS = {
  dashboard: { label: 'Dashboard', icon: 'grid', group: 'platform', desc: 'Resumen general' },
  users:     { label: 'Usuarios', icon: 'user', group: 'platform', desc: 'Gestión de cuentas' },
  roles:     { label: 'Roles', icon: 'shield', group: 'platform', desc: 'Roles y permisos' },
  audit:     { label: 'Auditoría', icon: 'clock', group: 'platform', desc: 'Trazabilidad' },
  cafe:      { label: 'Cafetería', icon: 'coffee', group: 'cafe', desc: 'Información institucional' },
  config:    { label: 'Configuración', icon: 'menu', group: 'cafe', desc: 'Parámetros globales' },
  design:    { label: 'Design System', icon: 'grid', group: 'system', desc: 'Tokens & componentes' },
};

const DEV_GROUPS = {
  platform: { label: 'PLATAFORMA', keys: ['dashboard','users','roles','audit'] },
  cafe:     { label: 'CAFETERÍA', keys: ['cafe','config'] },
  system:   { label: 'SISTEMA', keys: ['design'] },
};

const DEV_ICON = { grid:'grid', user:'user', shield:'orders', clock:'clock', coffee:'coffee', menu:'menu', home:'home', orders:'orders', bag:'bag', search:'search', bell:'bell', plus:'plus', x:'x', check:'check', alert:'alert', chevronRight:'chevronRight' };

function _devSvg(key){ return svgIcon(DEV_ICON[key]||key); }

function nowTime(){
  const d=new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

function renderDevAdmin(page) {
  const app = $('#app');
  if (!currentUser() || currentUser().role !== 'admindev') return route('login');
  // alias: permissions -> roles (misma página matriz)
  if (page === 'permissions' || page === 'permisos') page = 'roles';
  if (page === 'auditoria') page = 'audit';
  if (page === 'configuracion') page = 'config';
  const sec = DEV_SECTIONS[page] ? page : 'dashboard';
  syncBodyClass();

  const users = Store.users;
  const orders = Store.orders;

  const pendingAudit = Store.audit.filter(a=> a.action.includes('Revisión')||a.action.includes('pendiente')).length;
  const lowStockCount = Store.products.filter(p=> p.stock>0 && p.stock<=p.minStock).length;

  // badge counts
  const countUsers = users.length;
  const countPending = Store.orders.filter(o=> ['queue','confirmed','prep','review'].includes(o.status) || o.paymentStatus==='review').length;

  app.innerHTML = `
    <div class="admin-layout dev-layout">
      <aside class="admin-sidebar" id="devSidebar">
        <div class="sb-brand">
          <span class="brand-mark" style="background: linear-gradient(135deg,#0ea5e9,#40807E); color:#fff; width:38px;height:38px; border-radius:10px; display:flex;align-items:center;justify-content:center">◈</span>
          <div style="line-height:1.1">
            <div class="brand-name" style="font-size:0.95rem; letter-spacing:-0.01em">INTESUD Platform</div>
            <span class="brand-sub">Administración · SaaS</span>
          </div>
        </div>
        <nav class="sb-nav">
          ${Object.entries(DEV_GROUPS).map(([gk, grp])=> `
            <div class="sb-group">${grp.label}</div>
            ${grp.keys.map(k=>{
              const v=DEV_SECTIONS[k];
              const active = k===sec ? 'active':'';
              let badge='';
              if(k==='users') badge=`<span class="sb-badge" style="background:#334155; color:#e2e8f0; border:1px solid #475569">${countUsers}</span>`;
              if(k==='audit' && Store.audit.length) badge=`<span class="sb-badge" style="background:var(--primary)">${Math.min(99,Store.audit.length)}</span>`;
              return `<a class="sb-link ${active}" href="#" data-dev="${k}"><span class="sb-ico">${_devSvg(v.icon)}</span>${v.label}${badge}</a>`;
            }).join('')}
          `).join('')}
          <div style="margin:14px 12px 0; padding:12px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); border-radius:12px">
            <div style="font-size:0.78rem; font-weight:700; color:#e2e8f0; display:flex; align-items:center; gap:8px">${_devSvg('coffee')} Área operativa</div>
            <div class="tiny" style="color:#94a3b8; margin:6px 0 10px; line-height:1.4">La operación diaria (pedidos, stock, ventas) la gestiona el panel de <b style="color:#cbd5e1">Bar</b>.</div>
            <a class="btn btn-sm" style="width:100%; background:#fff; color:#0f172a; border:none; font-weight:700" href="#" onclick="event.preventDefault(); toast('Panel Bar: inicia sesión como adminbar@intesud.edu.ec','info')">Ir al panel Bar →</a>
          </div>
        </nav>
        <div class="sb-footer">
          <div style="display:flex; align-items:center; gap:10px">
            <div class="avatar sm" style="background:#334155; color:#e2e8f0">${esc(initials(currentUser().name))}</div>
            <div style="flex:1; min-width:0">
              <div class="bold small" style="color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(currentUser().name)}</div>
              <div class="tiny" style="color:#94a3b8">Super Admin · Platform</div>
            </div>
            <span style="width:8px;height:8px; border-radius:50%; background:var(--success); box-shadow:0 0 0 4px rgba(34,160,107,0.18)"></span>
          </div>
        </div>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="hamburger" id="devHamburger" title="Menú">☰</button>
          <div style="display:flex; align-items:center; gap:10px">
            <span class="topbar-ico" style="width:32px;height:32px; border-radius:8px; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center">${_devSvg(DEV_SECTIONS[sec].icon)}</span>
            <div>
              <div class="page-name" style="font-size:0.95rem; line-height:1.1">${DEV_SECTIONS[sec].label}</div>
              <div class="tiny" style="color:var(--text-3)">${DEV_SECTIONS[sec].desc}</div>
            </div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap:10px">
            <div class="tiny muted" style="display:flex; align-items:center; gap:6px"><span style="width:8px;height:8px; border-radius:50%; background:var(--success)"></span> Sistema operativo</div>
            <span class="badge badge-success" style="font-size:0.72rem">${Store.config.cafeOpen ? '● Plataforma activa' : '● Mantenimiento'}</span>
            <div class="profile-chip" id="devUserMenu" style="border:1px solid #e2e8f0">
              <div class="avatar sm">${esc(initials(currentUser().name))}</div><span class="pname">${esc(currentUser().name.split(' ')[0])}</span> ▾
              <div class="dropdown-menu" id="devUserDropdown" style="display:none">
                <div class="dropdown-head"><div class="bold small">${esc(currentUser().name)}</div><div class="tiny muted">${esc(currentUser().email)}</div><span class="badge badge-primary" style="margin-top:6px">admindev</span></div>
                <a class="dropdown-item" href="#" data-link="profile"><span class="dm-ico">${_devSvg('user')}</span>Mi perfil</a>
                <a class="dropdown-item" href="#" data-link="config"><span class="dm-ico">${_devSvg('menu')}</span>Configuración</a>
                <div class="dropdown-sep"></div>
                <a class="dropdown-item danger" href="#" id="btnDevLogout"><span class="dm-ico">${_devSvg('x')}</span>Cerrar sesión</a>
              </div>
            </div>
          </div>
        </div>
        <div class="admin-content" id="devContent"></div>
      </div>
    </div>`;

  const ud = $('#devUserDropdown');
  $('#devUserMenu').onclick = (e) => { e.stopPropagation(); ud.style.display = ud.style.display === 'none' ? 'block' : 'none'; };
  document.body.onclick = () => { ud.style.display = 'none'; };
  $$('[data-link]', ud).forEach((a) => a.onclick = (e) => { e.preventDefault(); const t = a.dataset.link; if (t === 'profile') { renderProfileModal(); ud.style.display = 'none'; } else { setRoute('admindev/'+t); }});
  $('#btnDevLogout').onclick = () => { Auth.logout(); toast('Sesión cerrada.', 'info'); route('login'); };

  const sidebar = $('#devSidebar');
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
  (renderers[sec] || devDashboard)(content);
}

/* ============================================================
   DASHBOARD PLATFORM — SaaS Profesional
   ============================================================ */
function devDashboard(el) {
  const users = Store.users;
  const orders = Store.orders;
  const products = Store.products;
  const audit = Store.audit;
  const cfg = Store.config;

  const activeUsers = users.filter(u=>u.active).length;
  const inactiveUsers = users.length - activeUsers;
  const roleCounts = {};
  users.forEach(u=> roleCounts[u.role]=(roleCounts[u.role]||0)+1);
  const today = new Date().toISOString().slice(0,10);
  const todayOrders = orders.filter(o=> o.date===today);
  const live = orders.filter(o=> ['queue','confirmed','prep','ready'].includes(o.status)).length;
  const salesToday = todayOrders.reduce((s,o)=> s+ (o.status!=='cancelled'? o.total:0),0);
  const lowStock = products.filter(p=> p.available && p.stock>0 && p.stock<=p.minStock);
  const outStock = products.filter(p=> p.stock===0);
  const payPending = orders.filter(o=> o.paymentStatus==='pending').length;
  const payReview = orders.filter(o=> o.paymentStatus==='review').length;

  const cap = (typeof capacityInfo === 'function') ? capacityInfo() : { pct: Math.round((cfg.currentCapacity/cfg.capacity)*100), used: cfg.currentCapacity, total: cfg.capacity, stateCls:'ok' };
  const recentAudit = audit.slice(0,6);

  // Datos simulados para gráfico pedidos últimos 7 días
  const last7 = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i));
    const iso=d.toISOString().slice(0,10);
    const cnt = orders.filter(o=> o.date===iso).length;
    // si no hay datos, simular 3-8
    const val = cnt || (3 + (i*2)%5);
    return { label: d.toLocaleDateString('es-EC',{ weekday:'short'}), val, iso };
  });
  const maxVal = Math.max(...last7.map(x=>x.val),1);

  // alerts platform
  const alerts=[];
  if(outStock.length) alerts.push({ level:'danger', title:'Stock crítico', text:`${outStock.length} producto(s) agotados — ${outStock.slice(0,2).map(p=>esc(p.name)).join(', ')}`, icon:'⛔' });
  if(lowStock.length) alerts.push({ level:'warning', title:'Stock bajo', text:`${lowStock.length} producto(s) bajo mínimo — reponer pronto.`, icon:'⚠️' });
  if(payReview) alerts.push({ level:'danger', title:'Pagos en revisión', text:`${payReview} comprobante(s) requieren validación antes de preparar.`, icon:'💳' });
  if(cap.pct>=90) alerts.push({ level: cap.pct>=100?'danger':'warning', title: cap.pct>=100?'Capacidad llena':'Alta demanda', text: `${cap.pct}% capacidad (${cap.used}/${cap.total}) — coordinar con barra.`, icon:'🔥' });
  if(inactiveUsers>1) alerts.push({ level:'neutral', title:'Usuarios inactivos', text:`${inactiveUsers} cuentas desactivadas — revisar acceso.`, icon:'👤' });

  el.innerHTML = `
    <div class="dev-page-head">
      <div class="dev-breadcrumb"><a href="#" onclick="event.preventDefault(); setRoute('admindev/dashboard')">Platform</a> <span style="color:#cbd5e1">/</span> <span>Dashboard</span></div>
      <div class="dev-title-row">
        <div>
          <h1 class="dev-title">Panel de administración</h1>
          <p class="dev-sub">Vista SaaS de la plataforma INTESUD — operación separada de la administración. Datos en tiempo real (LocalStorage).</p>
        </div>
        <div class="dev-actions">
          <span class="badge badge-neutral" style="background:#fff; border:1px solid #e2e8f0">📅 ${today} · ${nowTime()}</span>
          <button class="btn btn-outline btn-sm" onclick="devDashboard(document.getElementById('devContent'))">↻ Actualizar</button>
          <a class="btn btn-primary btn-sm" href="#" data-goto="users">Gestionar usuarios →</a>
        </div>
      </div>
    </div>

    ${alerts.length ? `
      <div class="grid" style="grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap:12px; margin-bottom:16px">
        ${alerts.map(a=> `
          <div class="alert ${a.level==='danger'?'danger':a.level==='warning'?'warning':a.level==='neutral'?'neutral':'info'}" style="margin:0; padding:12px 14px">
            <span class="a-ico">${a.icon}</span>
            <div><div class="a-title">${a.title}</div><div class="small">${a.text}</div></div>
          </div>`).join('')}
      </div>` : `<div class="status-banner success" style="margin-bottom:16px"><span class="ico">✅</span><div><b>Todo en orden.</b> Sin alertas críticas.</div></div>`}

    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card" style="--kpi-accent: var(--primary)">
        <div class="kpi-ico" style="background:var(--primary-soft); color:var(--primary)">${_devSvg('user')}</div>
        <div class="kpi-label">Total usuarios</div>
        <div class="kpi-value">${users.length}</div>
        <div class="kpi-sub"><span class="kpi-trend up">● ${activeUsers} activos</span> <span style="color:var(--text-3)">${inactiveUsers} inactivos</span></div>
        <div class="tiny muted" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap">
          ${Object.entries(roleCounts).map(([k,v])=> `<span class="badge badge-outline" style="font-size:0.72rem">${esc((typeof ROLE_LABELS!=='undefined'? ROLE_LABELS[k]:k)||k)} · ${v}</span>`).join('')}
        </div>
      </div>
      <div class="kpi-card" style="--kpi-accent: var(--success)">
        <div class="kpi-ico" style="background:var(--success-soft); color:var(--success)">${_devSvg('orders')}</div>
        <div class="kpi-label">Pedidos</div>
        <div class="kpi-value">${orders.length} <span style="font-size:0.9rem; color:var(--text-3); font-weight:600">· ${live} en curso</span></div>
        <div class="kpi-sub"><span class="kpi-trend neutral">${todayOrders.length} hoy</span> <span>${money(salesToday)} ventas hoy</span></div>
        <div class="tiny muted" style="margin-top:8px">${payPending} pendientes · ${payReview} en revisión</div>
      </div>
      <div class="kpi-card" style="--kpi-accent: ${outStock.length? 'var(--danger)':'var(--warning)'}">
        <div class="kpi-ico" style="background:${outStock.length?'var(--danger-soft)':'var(--warning-soft)'}; color:${outStock.length?'var(--danger)':'var(--warning-strong)'}">${_devSvg('bag')}</div>
        <div class="kpi-label">Catálogo</div>
        <div class="kpi-value">${products.length}</div>
        <div class="kpi-sub"><span class="kpi-trend ${outStock.length? 'down':'neutral'}">${products.filter(p=>p.available).length} activos</span> <span>${lowStock.length} bajo · ${outStock.length} agotados</span></div>
        <div class="tiny muted" style="margin-top:8px">1 cafetería · INTESUD</div>
      </div>
      <div class="kpi-card" style="--kpi-accent: ${cap.pct>=90?'var(--danger)':cap.pct>=70?'var(--warning)':'var(--success)'}">
        <div class="kpi-ico" style="background:${cap.pct>=90?'var(--danger-soft)':cap.pct>=70?'var(--warning-soft)':'var(--success-soft)'}; color:${cap.pct>=90?'var(--danger)':cap.pct>=70?'var(--warning-strong)':'var(--success)'}">${_devSvg('grid')}</div>
        <div class="kpi-label">Estado del sistema</div>
        <div class="kpi-value">${cap.pct}% <span style="font-size:0.9rem; color:var(--text-3); font-weight:600">capacidad</span></div>
        <div class="kpi-sub"><span class="badge ${cap.pct>=100?'badge-danger':cap.pct>=90?'badge-warning':cap.pct>=70?'badge-warning':'badge-success'}" style="font-size:0.72rem">${cap.pct>=100?'LLENA':cap.pct>=90?'ALTA DEMANDA':cap.pct>=70?'MEDIA':'NORMAL'}</span> ${cap.used}/${cap.total} en preparación</div>
        <div class="bar-track bar-sm" style="margin-top:10px"><div class="bar-fill ${cap.pct>=100?'danger':cap.pct>=70?'warn':''}" style="width:${cap.pct}%"></div></div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1.6fr 1fr; gap:16px; margin-bottom:16px">
      <div class="dev-chart-card">
        <div class="dev-chart-head">
          <div><div class="bold">Actividad de pedidos</div><div class="tiny muted">Últimos 7 días · Total ${orders.length} pedidos</div></div>
          <span class="badge badge-primary">Semanal</span>
        </div>
        <div class="dev-chart-bars">
          ${last7.map(d=> `<div class="dc-col"><div class="dc-bar ${d.val===maxVal?'hl':''}" style="height:${Math.round((d.val/maxVal)*140)}px"></div><span class="dc-label">${esc(d.label)}</span><span class="tiny muted" style="font-size:10px">${d.val}</span></div>`).join('')}
        </div>
        <div class="tiny muted" style="margin-top:10px; display:flex; justify-content:space-between"><span>Mín ${Math.min(...last7.map(x=>x.val))} · Máx ${maxVal}</span><span>Fuente: Store.orders (demo)</span></div>
      </div>
      <div class="card" style="padding:0; overflow:hidden">
        <div class="card-header" style="padding:14px 18px"><div><div class="card-title" style="font-size:0.95rem">Distribución por rol</div><div class="card-sub">${users.length} cuentas totales</div></div><a class="btn btn-outline btn-sm" href="#" data-goto="roles">Ver roles →</a></div>
        <div class="card-body" style="padding:16px">
          ${Object.entries(roleCounts).map(([role,cnt])=>{
            const pct=Math.round((cnt/users.length)*100);
            const colors={user:'#0ea5e9', adminbar:'#40807E', admindev:'#0f172a'};
            const col=colors[role]||'var(--primary)';
            return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px">
              <span class="badge" style="background:${col}; color:#fff; min-width:90px; justify-content:center">${esc((typeof ROLE_LABELS!=='undefined'? ROLE_LABELS[role]:role)||role)}</span>
              <div class="bar-track" style="flex:1; height:10px"><div class="bar-fill" style="width:${pct}%; background:${col}"></div></div>
              <span class="small bold" style="min-width:56px; text-align:right">${cnt} · ${pct}%</span>
            </div>`;
          }).join('')}
          <div class="divider" style="margin:14px 0"></div>
          <div class="grid" style="grid-template-columns:1fr 1fr; gap:10px; text-align:center">
            <div style="background:var(--success-soft); border:1px solid #cdeeda; border-radius:10px; padding:10px"><div class="bold" style="color:var(--success-strong); font-size:1.2rem">${activeUsers}</div><div class="tiny muted">Activos</div></div>
            <div style="background:var(--neutral-soft); border:1px solid #e2e8f0; border-radius:10px; padding:10px"><div class="bold" style="color:var(--neutral); font-size:1.2rem">${inactiveUsers}</div><div class="tiny muted">Inactivos</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px">
      <div class="card" style="padding:0; overflow:hidden">
        <div class="card-header"><div><div class="card-title">Actividad reciente</div><div class="card-sub">Últimas acciones administrativas</div></div><a class="btn btn-outline btn-sm" href="#" data-goto="audit">Ver todo →</a></div>
        <div class="card-body" style="padding:16px">
          ${recentAudit.length ? `<div class="audit-timeline" style="padding-left:0">`+recentAudit.map(a=> `
            <div class="audit-evt" style="margin-left:0; padding-left:14px">
              <div class="ae-dot" style="width:30px;height:30px; font-size:0.7rem">${esc(initials(a.user))}</div>
              <div style="flex:1; min-width:0">
                <div class="small"><b>${esc(a.user)}</b> ${esc(a.action)}</div>
                <div class="tiny muted" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(a.target||'—')} · ${esc(a.time)}</div>
              </div>
              <span class="badge badge-neutral" style="height:fit-content">ahora</span>
            </div>`).join('')+`</div>` : `<div class="dev-empty">Sin actividad reciente</div>`}
        </div>
      </div>
      <div class="card">
        <div class="card-header" style="padding:14px 18px"><div><div class="card-title">Estado general</div><div class="card-sub">Parámetros de la plataforma</div></div><span class="badge ${cfg.cafeOpen?'badge-success':'badge-danger'}">${cfg.cafeOpen?'Operativa':'Pausada'}</span></div>
        <div class="card-body" style="display:grid; gap:12px; padding:16px">
          <div class="kv"><dt>Cafetería</dt><dd><span class="badge badge-primary">INTESUD</span> <span class="tiny muted">· 1 sede</span></dd></div>
          <div class="kv"><dt>Horario pedidos</dt><dd class="bold small">${cfg.orderOpen} – ${cfg.orderClose}</dd></div>
          <div class="kv"><dt>Receso entrega</dt><dd class="bold small">${cfg.breakStart} – ${cfg.breakEnd}</dd></div>
          <div class="kv"><dt>Delivery interno</dt><dd><span class="badge ${cfg.deliveryEnabled?'badge-success':'badge-neutral'}">${cfg.deliveryEnabled?'Habilitado':'Deshabilitado'}</span> <span class="tiny muted">· 3 pisos</span></dd></div>
          <div class="kv"><dt>Capacidad</dt><dd class="bold small">${cfg.capacity} pedidos máx</dd></div>
          <div class="divider" style="margin:8px 0"></div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <span class="badge badge-success">✓ Pagos: DEUNA / Transferencia / Efectivo</span>
            <span class="badge badge-info">✓ Roles: 3 niveles</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div><div class="card-title">Accesos rápidos</div><div class="card-sub">Tareas frecuentes de administración</div></div></div>
      <div class="card-body">
        <div class="dev-qa-grid">
          ${[
            ['users','👥','Usuarios','Crear, editar y desactivar cuentas','admindev/users'],
            ['roles','🛡️','Roles y permisos','Matriz por módulos','admindev/roles'],
            ['audit','📜','Auditoría','Filtros por usuario/módulo/fecha','admindev/audit'],
            ['cafe','🏪','Cafetería','Nombre, logo, horarios, contacto','admindev/cafe'],
            ['config','⚙️','Configuración','General, seguridad, notificaciones','admindev/config'],
            ['design','🎨','Design System','Tokens, botones, inputs, cards','admindev/design'],
            ['orders','📦','Ver operación Bar','Solo informativa — requiere rol Bar','adminbar/dashboard'],
            ['help','💡','Documentación','README y docs del proyecto',''],
          ].map(([k,ic,title,desc,route])=> `
            <a class="dev-qa" href="#" data-goto="${route}" ${route===''?'style="opacity:0.6; pointer-events:none"':''}>
              <span class="qa-ico">${ic}</span>
              <div><div class="qa-title">${title}</div><div class="qa-desc">${desc}</div></div>
              <span style="margin-left:auto; color:var(--text-3)">${_devSvg('chevronRight')}</span>
            </a>`).join('')}
        </div>
      </div>
    </div>
  `;
  $$('[data-goto]', el).forEach(a=> a.onclick=e=>{ e.preventDefault(); const r=a.dataset.goto; if(!r) return; if(r.startsWith('admin')) setRoute(r); else if(r.startsWith('http')) window.open(r,'_blank'); else toast('Próximamente','info'); });
}

/* ============================================================
   USUARIOS — buscador, filtros, orden, paginación, CRUD
   ============================================================ */
function devUsers(el){
  let users = Store.users;
  let q=''; let fRole=''; let fState=''; let sort='name-asc'; let page=1; const perPage=6;

  const render = ()=>{
    // Control real: verificar permiso antes de mostrar
    const canView = (typeof can === 'function' ? can('users.view') : true);
    if(!canView){
      el.innerHTML = `<div class="card" style="max-width:640px;margin:32px auto;text-align:center;padding:28px"><div style="font-size:2rem">🔒</div><h2>Sin permiso</h2><p class="muted">Tu rol <b>${esc((typeof Auth!=='undefined'&&Auth.current() ? Auth.current().role : ''))}</b> no tiene <code>users.view</code>.</p><p class="tiny muted">Activa el permiso en Roles y permisos.</p><button class="btn btn-primary" onclick="setRoute('admindev/roles')">Ir a Roles y permisos</button></div>`;
      return;
    }
    const canCreate = (typeof can === 'function' ? can('users.create') : true);
    const canEdit = (typeof can === 'function' ? can('users.edit') : true);
    const canToggle = (typeof can === 'function' ? (can('users.toggle_status')||can('users.edit')) : true);
    let list=[...users];
    if(q) list=list.filter(u=> (u.name+' '+u.email+' '+(u.username||'')+' '+(u.cargo||'')).toLowerCase().includes(q.toLowerCase()));
    if(fRole) list=list.filter(u=> u.role===fRole);
    if(fState==='active') list=list.filter(u=> u.active);
    if(fState==='inactive') list=list.filter(u=> !u.active);
    // sort
    const [field,dir]=sort.split('-');
    list.sort((a,b)=>{
      let va=a[field==='name'?'name':field==='role'?'role':field==='date'?'registeredAt':'name']||'';
      let vb=b[field==='name'?'name':field==='role'?'role':field==='date'?'registeredAt':'name']||'';
      if(field==='date'){ va=a.registeredAt; vb=b.registeredAt; }
      const res = String(va).localeCompare(String(vb));
      return dir==='asc'?res:-res;
    });
    const total=list.length;
    const pages=Math.max(1, Math.ceil(total/perPage));
    if(page>pages) page=pages;
    const slice=list.slice((page-1)*perPage, page*perPage);
    // roles dinámicos incluyendo personalizados
    const allRolesSet = new Set([...Object.keys(typeof DEFAULT_ROLE_PERMISSIONS!=='undefined'?DEFAULT_ROLE_PERMISSIONS:{}), ...Store.users.map(u=>u.role)]);
    const allRoles = [...allRolesSet];

    el.innerHTML = `
      <div class="dev-page-head">
        <div class="dev-breadcrumb"><a href="#" data-bc="dashboard">Platform</a> <span style="color:#cbd5e1">/</span> <span>Usuarios</span></div>
        <div class="dev-title-row">
          <div><h1 class="dev-title">Usuarios</h1><p class="dev-sub">Administra cuentas institucionales · ${users.length} total · ${users.filter(u=>u.active).length} activos</p></div>
          <div class="dev-actions">
            <button class="btn btn-outline btn-sm" id="btnExportUsers">⤓ Exportar</button>
            <button class="btn btn-primary btn-sm" id="btnAddUser" ${!canCreate?'disabled title="Sin permiso users.create"':''}>＋ Nuevo usuario</button>
          </div>
        </div>
      </div>

      <div class="card" style="padding:14px; margin-bottom:12px">
        <div class="dev-toolbar">
          <div class="dev-toolbar-left">
            <div class="dev-search"><span class="s-ico">${_devSvg('search')}</span><input class="input" id="uSearch" placeholder="Buscar nombre, correo, cargo..." value="${esc(q)}"></div>
            <select class="input dev-select" id="uRole"><option value="">Todos los roles</option>${allRoles.map(r=> `<option value="${esc(r)}" ${fRole===r?'selected':''}>${esc(ROLE_LABELS[r]||r)}</option>`).join('')}</select>
            <select class="input dev-select" id="uState" style="min-width:140px"><option value="">Todos los estados</option><option value="active" ${fState==='active'?'selected':''}>● Activos</option><option value="inactive" ${fState==='inactive'?'selected':''}>○ Inactivos</option></select>
          </div>
          <div class="dev-toolbar-right">
            <select class="input" id="uSort" style="min-width:160px">
              <option value="name-asc" ${sort==='name-asc'?'selected':''}>Nombre A→Z</option>
              <option value="name-desc" ${sort==='name-desc'?'selected':''}>Nombre Z→A</option>
              <option value="date-desc" ${sort==='date-desc'?'selected':''}>Más recientes</option>
              <option value="date-asc" ${sort==='date-asc'?'selected':''}>Más antiguos</option>
              <option value="role-asc" ${sort==='role-asc'?'selected':''}>Rol A→Z</option>
            </select>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; font-size:0.82rem">
          <span class="tiny muted">${total} resultado(s) · Página ${page}/${pages}</span>
          ${q?`<span class="badge badge-primary">Búsqueda: "${esc(q)}" <a href="#" id="clearQ" style="margin-left:6px; color:#fff">✕</a></span>`:''}
          ${fRole?`<span class="badge badge-neutral">${esc(ROLE_LABELS[fRole]||fRole)} <a href="#" id="clearRole" style="margin-left:6px">✕</a></span>`:''}
          ${fState?`<span class="badge ${fState==='active'?'badge-success':'badge-neutral'}">${fState==='active'?'Activos':'Inactivos'} <a href="#" id="clearState" style="margin-left:6px; color:inherit">✕</a></span>`:''}
          ${(q||fRole||fState)?`<a class="tiny bold" style="color:var(--primary)" href="#" id="clearAll">Limpiar filtros</a>`:''}
        </div>
      </div>

      <div class="dev-hide-mobile-table">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Último acceso</th><th style="text-align:right">Acciones</th></tr></thead>
            <tbody>
              ${slice.length ? slice.map(u=> `
                <tr>
                  <td><div style="display:flex; align-items:center; gap:10px"><div class="avatar sm" style="background:${u.active?'var(--primary)':'#94a3b8'}; color:#fff">${esc(initials(u.name))}</div><div><div class="bold" style="font-size:0.92rem">${esc(u.name)}</div><div class="tiny muted">${esc(u.cargo||'—')} ${u.aula? '· '+esc(u.aula):''}</div></div></div></td>
                  <td><div class="small">${esc(u.email)}</div><div class="tiny muted">${esc(u.username||'—')}</div></td>
                  <td><span class="badge ${u.role==='admindev'?'badge-neutral':u.role==='adminbar'?'badge-warning':'badge-primary'}" style="${u.role==='admindev'?'background:#0f172a; color:#fff':''}">${esc(ROLE_LABELS[u.role]||u.role)}</span></td>
                  <td>${u.active?'<span class="badge badge-success"><span class="dot"></span>Activo</span>':'<span class="badge badge-neutral"><span class="dot" style="background:#94a3b8"></span>Inactivo</span>'}</td>
                  <td class="small muted">${esc(u.registeredAt||'—')}</td>
                  <td class="small muted">${esc(u.lastAccess||'—')}</td>
                  <td style="text-align:right; white-space:nowrap">
                    <button class="btn btn-ghost btn-sm" data-view="${u.id}" title="Ver detalles">👁</button>
                    <button class="btn btn-outline btn-sm" data-edit="${u.id}" ${!canEdit?'disabled title="Sin permiso users.edit"':''}>Editar</button>
                    <button class="btn ${u.active?'btn-danger-outline':'btn-success'} btn-sm" data-toggle="${u.id}" ${!canToggle?'disabled title="Sin permiso users.toggle_status"':''}>${u.active?'Desactivar':'Activar'}</button>
                  </td>
                </tr>`).join('') : `<tr><td colspan="7"><div class="dev-empty" style="border:none">Sin usuarios que coincidan con los filtros.</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="user-row-grid dev-mobile-only" style="display:none">
        ${slice.map(u=> `
          <div class="user-row-card">
            <div style="display:flex; align-items:center; gap:10px">
              <div class="avatar">${esc(initials(u.name))}</div>
              <div style="flex:1"><div class="bold">${esc(u.name)}</div><div class="tiny muted">${esc(u.email)}</div></div>
              <span class="badge ${u.active?'badge-success':'badge-neutral'}">${u.active?'Activo':'Inactivo'}</span>
            </div>
            <div class="kv" style="font-size:0.88rem"><dt>Rol</dt><dd><span class="badge badge-primary">${esc(ROLE_LABELS[u.role]||u.role)}</span></dd><dt>Registro</dt><dd>${esc(u.registeredAt)}</dd><dt>Acceso</dt><dd>${esc(u.lastAccess||'—')}</dd></div>
            <div style="display:flex; gap:8px; flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-view-m="${u.id}">Ver</button><button class="btn btn-outline btn-sm" data-edit-m="${u.id}" ${!canEdit?'disabled':''}>Editar</button><button class="btn ${u.active?'btn-danger-outline':'btn-success'} btn-sm" data-toggle-m="${u.id}" ${!canToggle?'disabled':''}>${u.active?'Desactivar':'Activar'}</button></div>
          </div>`).join('')}
      </div>

      <div class="dev-pagination">
        <div class="pg-info">${total} usuarios · ${perPage} por página</div>
        <div class="pg-btns">
          <button class="btn btn-outline btn-sm" ${page<=1?'disabled':''} data-pg="prev">‹ Anterior</button>
          ${Array.from({length:pages},(_,i)=> `<button class="btn ${i+1===page?'btn-primary':'btn-outline'} btn-sm" data-pg="${i+1}">${i+1}</button>`).join('')}
          <button class="btn btn-outline btn-sm" ${page>=pages?'disabled':''} data-pg="next">Siguiente ›</button>
        </div>
      </div>
    `;

    // mobile grid show hack via css — force inline style for simplicity
    const mobileGrid = el.querySelector('.user-row-grid');
    if(window.innerWidth<=700 && mobileGrid) mobileGrid.style.display='grid';

    // breadcrumb
    el.querySelector('[data-bc="dashboard"]')?.addEventListener('click', e=>{ e.preventDefault(); setRoute('admindev/dashboard'); });

    const bindSearch = ()=>{
      $('#uSearch').addEventListener('input', e=>{ q=e.target.value; page=1; render(); $('#uSearch').focus(); const v=$('#uSearch').value; $('#uSearch').setSelectionRange(v.length,v.length); });
      $('#uSearch').addEventListener('keydown', e=>{ if(e.key==='Enter') e.preventDefault(); });
    };
    bindSearch();
    $('#uRole').onchange = e=>{ fRole=e.target.value; page=1; render(); };
    $('#uState').onchange = e=>{ fState=e.target.value; page=1; render(); };
    $('#uSort').onchange = e=>{ sort=e.target.value; render(); };
    $('#clearQ')?.addEventListener('click', e=>{ e.preventDefault(); q=''; page=1; render(); });
    $('#clearRole')?.addEventListener('click', e=>{ e.preventDefault(); fRole=''; render(); });
    $('#clearState')?.addEventListener('click', e=>{ e.preventDefault(); fState=''; render(); });
    $('#clearAll')?.addEventListener('click', e=>{ e.preventDefault(); q=''; fRole=''; fState=''; sort='name-asc'; page=1; render(); });
    $$('[data-pg]', el).forEach(b=> b.onclick=()=>{ const v=b.dataset.pg; if(v==='prev' && page>1) page--; else if(v==='next') page++; else if(!isNaN(v)) page=parseInt(v); render(); });
    $('#btnAddUser').onclick=()=>{
      if(!canCreate){ toast('Sin permiso para crear usuarios (users.create)','error'); return; }
      userFormModal(null, ()=>{ users=Store.users; render(); });
    };
    $('#btnExportUsers').onclick=()=>{ toast('Exportado: '+users.length+' usuarios (simulado)','success'); };
    const bindActions = (suffix='')=>{
      $$(`[data-view${suffix}]`, el).forEach(b=> b.onclick=()=> userDetailDrawer(users.find(x=>x.id===b.dataset.view || b.dataset.viewM)));
      $$(`[data-edit${suffix}]`, el).forEach(b=> b.onclick=()=>{
        if(!canEdit){ toast('Sin permiso para editar usuarios (users.edit)','error'); return; }
        userFormModal(users.find(x=>x.id===b.dataset.edit || b.dataset.editM), ()=>{ users=Store.users; render(); });
      });
      $$(`[data-toggle${suffix}]`, el).forEach(b=> b.onclick= async ()=>{
        if(!canToggle){ toast('Sin permiso para cambiar estado (users.toggle_status)','error'); return; }
        const u=users.find(x=>x.id===b.dataset.toggle || b.dataset.toggleM);
        const ok= await confirmDialog(u.active?'Desactivar usuario':'Activar usuario', `${u.active?'Desactivar':'Activar'} a ${u.name}?`, u.active?'Desactivar':'Activar', u.active);
        if(!ok) return;
        u.active=!u.active; Store.users=users; logAudit(u.active?'Activó usuario':'Desactivó usuario', u.name); toast(u.name+(u.active?' activado':' desactivado')+'.','success'); render();
      });
    };
    bindActions(''); bindActions('-m');
  };
  render();
}

function userDetailDrawer(u){
  if(!u) return;
  const ov = drawer(`
    <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px">
      <div class="avatar lg" style="background:var(--primary); color:#fff">${esc(initials(u.name))}</div>
      <div><div class="bold" style="font-size:1.15rem">${esc(u.name)}</div><div class="tiny muted">${esc(u.email)}</div><span class="badge ${u.active?'badge-success':'badge-neutral'}" style="margin-top:6px">${u.active?'● Activo':'○ Inactivo'}</span></div>
    </div>
    <div class="kv" style="font-size:0.92rem">
      <dt>Usuario</dt><dd>${esc(u.username||u.email)}</dd>
      <dt>Rol</dt><dd><span class="badge badge-primary">${esc(ROLE_LABELS[u.role]||u.role)}</span></dd>
      <dt>Cargo</dt><dd>${esc(u.cargo||'—')}</dd>
      <dt>Aula / Ubicación</dt><dd>${esc(u.aula||'—')}</dd>
      <dt>Registro</dt><dd>${esc(u.registeredAt||'—')}</dd>
      <dt>Último acceso</dt><dd>${esc(u.lastAccess||'—')}</dd>
      <dt>Estado</dt><dd>${u.active?'Activo — puede iniciar sesión':'Inactivo — acceso bloqueado'}</dd>
    </div>
    <div style="margin-top:16px; padding:12px; background:var(--surface-2); border-radius:10px; border:1px solid #e2e8f0">
      <div class="tiny muted">Permisos del rol</div>
      <div class="small" style="margin-top:4px">${esc((typeof PERMISSION_MATRIX!=='undefined'? PERMISSION_MATRIX.find(r=> r.fn.includes('Usuarios'))?.[u.role] : '')||'—')} — Ver matriz en Roles y permisos.</div>
    </div>
  `, { title: 'Detalle de usuario', footer:`<div style="display:flex; justify-content:flex-end; gap:8px"><button class="btn btn-outline" data-close>Cerrar</button><button class="btn btn-primary" data-edit>Editar</button></div>`});
  ov.overlay.querySelector('[data-close]').onclick=()=> ov.close();
  ov.overlay.querySelector('[data-edit]').onclick=()=>{ ov.close(); userFormModal(u, ()=> setRoute('admindev/users')); };
}

function userFormModal(u, onDone){
  const isEdit=!!u;
  const roles=[['user',ROLE_LABELS.user],['adminbar',ROLE_LABELS.adminbar],['admindev',ROLE_LABELS.admindev]];
  const knownRoles = roles.map(r=>r[0]);
  const isCustomRole = isEdit && !knownRoles.includes(u.role);
  const ov = modal(`
    <div class="dev-breadcrumb" style="margin-bottom:10px"><span style="color:var(--text-3)">${isEdit?'Editar':'Nuevo'} usuario</span></div>
    <h3 style="margin-bottom:4px">${isEdit?'Editar usuario':'Crear usuario'}</h3>
    <p class="tiny muted" style="margin-bottom:16px">${isEdit?'Actualiza los datos de la cuenta.':'La cuenta se crea activa y lista para iniciar sesión.'}</p>
    <div class="field"><label class="label">Nombre completo *</label><input class="input" id="ufName" value="${isEdit?esc(u.name):''}" placeholder="Ej: Ana Pérez"><div class="input-err-msg" id="ufNameErr"></div></div>
    <div class="field"><label class="label">Correo institucional *</label><input class="input" id="ufEmail" value="${isEdit?esc(u.email):''}" placeholder="usuario@intesud.edu.ec"><div class="input-err-msg" id="ufEmailErr"></div></div>
    <div class="grid grid-2">
      <div class="field"><label class="label">Cargo</label><input class="input" id="ufCargo" value="${isEdit?esc(u.cargo||''):''}" placeholder="Estudiante / Docente"></div>
      <div class="field"><label class="label">Aula / Ubicación</label><input class="input" id="ufAula" value="${isEdit?esc(u.aula||''):''}" placeholder="2B / —"></div>
    </div>
    <div class="field"><label class="label">Rol *</label><select class="input" id="ufRole">${roles.map(([v,l])=> `<option value="${v}" ${isEdit && u.role===v?'selected':''}>${esc(l)}</option>`).join('')}<option value="__custom__" ${isCustomRole?'selected':''}>Otro</option></select><div class="tiny muted" style="margin-top:6px">Selecciona "Otro" para escribir un rol personalizado. El nombre se guardará tal cual, sin permisos adicionales.</div></div>
    <div class="field" id="ufCustomWrap" style="${isCustomRole?'':'display:none'}"><label class="label">Nombre del rol personalizado *</label><input class="input" id="ufCustom" value="${isCustomRole?esc(u.role):''}" placeholder="Ej: Operador, Supervisor..."><div class="input-err-msg" id="ufCustomErr"></div><div class="tiny muted" style="margin-top:6px">Se guardará exactamente como lo escribas.</div></div>
    ${!isEdit? `<div class="field"><label class="label">Contraseña inicial *</label><input class="input" id="ufPass" type="password" placeholder="Mín. 6 caracteres"><div class="input-err-msg" id="ufPassErr"></div></div>`:''}
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:18px">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>${isEdit?'Guardar cambios':'Crear usuario'}</button>
    </div>`, { wide:true, title: isEdit?'Editar usuario':'Nuevo usuario', sub: isEdit? esc(u.name): 'Cuenta institucional' });
  const roleSel = $('#ufRole', ov);
  const customWrap = $('#ufCustomWrap', ov);
  const toggleCustom = ()=>{
    const isCustom = roleSel.value === '__custom__';
    customWrap.style.display = isCustom ? '' : 'none';
    if(isCustom) setTimeout(()=> $('#ufCustom', ov)?.focus(), 50);
  };
  roleSel.addEventListener('change', toggleCustom);
  $('[data-cancel]',ov).onclick=()=> ov.remove();
  $('[data-save]',ov).onclick=()=>{
    const name=$('#ufName',ov).value.trim();
    const email=$('#ufEmail',ov).value.trim();
    let ok=true;
    const users=Store.users;
    if(!name){ $('#ufNameErr',ov).textContent='El nombre es obligatorio.'; $('#ufName',ov).classList.add('err'); ok=false; } else { $('#ufNameErr',ov).textContent=''; $('#ufName',ov).classList.remove('err'); }
    if(!/^\S+@\S+\.\S+$/.test(email)){ $('#ufEmailErr',ov).textContent='Correo inválido.'; $('#ufEmail',ov).classList.add('err'); ok=false; } else { $('#ufEmailErr',ov).textContent=''; $('#ufEmail',ov).classList.remove('err'); }
    if(!isEdit && $('#ufPass',ov).value.length<6){ $('#ufPassErr',ov).textContent='Mínimo 6 caracteres.'; $('#ufPass',ov).classList.add('err'); ok=false; }
    let finalRole = roleSel.value;
    if(finalRole === '__custom__'){
      const customVal = $('#ufCustom',ov).value.trim();
      if(!customVal){ $('#ufCustomErr',ov).textContent='Escribe el nombre del rol personalizado.'; $('#ufCustom',ov).classList.add('err'); ok=false; } else { $('#ufCustomErr',ov).textContent=''; $('#ufCustom',ov).classList.remove('err'); finalRole = customVal; }
    }
    if(!ok) return;
    // asegurar permisos del rol personalizado existen en BD (sin asignar permisos automáticamente, solo inicializar vacío)
    const ensureRolePerms = (role)=>{
      if(!Store.rolePerms[role]){
        const all=Store.rolePerms;
        all[role]={};
        if(typeof PERMISSIONS_CATALOG !== 'undefined'){
          PERMISSIONS_CATALOG.forEach(cat=> cat.perms.forEach(p=> all[role][p.code]=false));
        }
        Store.rolePerms=all;
      }
    };
    if(isEdit){
      Object.assign(u,{ name, email, cargo:$('#ufCargo',ov).value, aula:$('#ufAula',ov).value, role: finalRole });
      ensureRolePerms(finalRole);
      const sess=Auth.current();
      if(sess && sess.id===u.id){ sess.name=u.name; sess.role=u.role; Auth.set(sess); }
      logAudit('Editó usuario', u.name); toast('Usuario actualizado.','success');
    } else {
      const id='u'+Date.now();
      users.push({ id, name, email, username: email, role: finalRole, cargo:$('#ufCargo',ov).value, aula:$('#ufAula',ov).value, active:true, registeredAt: new Date().toISOString().slice(0,10), lastAccess: '—' });
      ensureRolePerms(finalRole);
      if(typeof PASSWORDS!=='undefined') PASSWORDS[email]=$('#ufPass',ov).value;
      logAudit('Creó usuario', name); toast('Usuario creado.','success');
    }
    Store.users=users; ov.remove(); if(onDone) onDone(); else renderDevAdmin('users');
  };
}

/* ============================================================
   ROLES — funcional: muestra roles, permisos y permite toggle
   Guarda en BD (Store + API) y controla acceso real
   ============================================================ */
function devRoles(el){
  try {
  const ROLES_META_BASE = {
    user: { label: (typeof ROLE_LABELS!=='undefined' && ROLE_LABELS.user) || 'Usuario institucional', icon:'👤', color:'#0ea5e9', desc:'Acceso a menú, pedidos propios y perfil.' },
    adminbar: { label: (typeof ROLE_LABELS!=='undefined' && ROLE_LABELS.adminbar) || 'Administradora bar', icon:'☕', color:'#40807E', desc:'Gestión operativa diaria: pedidos, stock, pagos, ventas y delivery.' },
    admindev: { label: (typeof ROLE_LABELS!=='undefined' && ROLE_LABELS.admindev) || 'Administrador desarrollador', icon:'🛡️', color:'#0f172a', desc:'Administración de plataforma: usuarios, roles, auditoría y configuración.' },
  };

  // Detectar roles personalizados existentes en usuarios / rolePerms
  const allStoredRoles = new Set(Object.keys(Store.rolePerms || {}));
  Store.users.forEach(u=> allStoredRoles.add(u.role));
  Object.keys(ROLES_META_BASE).forEach(k=> allStoredRoles.add(k));
  const ROLES_META = {};
  allStoredRoles.forEach(r=>{
    if(ROLES_META_BASE[r]) ROLES_META[r]=ROLES_META_BASE[r];
    else ROLES_META[r]={ label: r, icon:'🏷️', color:'#64748b', desc:'Rol personalizado — sin permisos por defecto. Activa los que necesites.' };
  });

  // Catálogo granular viene de data.js PERMISSIONS_CATALOG
  const CATALOG = (typeof PERMISSIONS_CATALOG !== 'undefined' ? PERMISSIONS_CATALOG : []);
  let activeTab = 'permisos'; // overview | roles | permisos | usuarios
  let selectedRole = (Store.load('int_roles_selected', null) || 'admindev');
  if(!ROLES_META[selectedRole]) selectedRole = Object.keys(ROLES_META)[0];

  const canEditPerms = (typeof can === 'function' ? can('permissions.edit') : true);
  // Helpers de guardado
  const saveOne = (role, code, enabled)=>{
    if(!canEditPerms){ toast('Sin permiso para editar permisos (permissions.edit)','error'); return; }
    if(typeof setRolePerm === 'function') setRolePerm(role, code, enabled);
    else {
      const all = Store.rolePerms; if(!all[role]) all[role]={}; all[role][code]=!!enabled; Store.rolePerms=all;
    }
    logAudit(enabled ? 'Habilitó permiso' : 'Deshabilitó permiso', `${role}:${code}`);
    toast(`${enabled?'✓ Habilitado':'✕ Deshabilitado'} ${code} para ${esc(ROLES_META[role]?.label||role)}`, enabled?'success':'info');
  };
  const bulkRole = (role, enable)=>{
    const obj={}; CATALOG.forEach(cat=> cat.perms.forEach(p=> obj[p.code]=enable));
    if(typeof setRolePermsBulk === 'function') setRolePermsBulk(role, obj);
    else { const all=Store.rolePerms; if(!all[role]) all[role]={}; Object.assign(all[role], obj); Store.rolePerms=all; }
    logAudit(enable?'Habilitó todos los permisos':'Deshabilitó todos los permisos', role);
    toast(`${enable?'Activados':'Desactivados'} todos para ${esc(ROLES_META[role]?.label||role)}`, 'success');
    renderBody();
  };
  const resetRole = (role)=>{
    const def = (typeof DEFAULT_ROLE_PERMISSIONS !== 'undefined' && DEFAULT_ROLE_PERMISSIONS[role]) ? JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role])) : {};
    const all=Store.rolePerms; all[role]=def; Store.rolePerms=all;
    logAudit('Restableció permisos', role); toast('Permisos restablecidos para '+esc(ROLES_META[role]?.label||role), 'info');
    renderBody();
    // sync backend
    try{ fetch('/api/auth/permissions/',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({role, permissions: def})}).catch(()=>{});}catch(e){}
  };

  const render = ()=>{
    const roleCounts={}; Store.users.forEach(u=> roleCounts[u.role]=(roleCounts[u.role]||0)+1);
    const totalPerms = CATALOG.reduce((s,c)=> s+c.perms.length,0);
    const activeCount = (role)=>{
      const perms = (typeof getRolePerms === 'function' ? getRolePerms(role) : (Store.rolePerms[role]||{}));
      return Object.values(perms).filter(Boolean).length;
    };

    el.innerHTML = `
      <div class="dev-page-head">
        <div class="dev-breadcrumb"><a href="#" data-bc="dashboard">Platform</a> <span style="color:#cbd5e1">/</span> <span>Roles y permisos</span></div>
        <div class="dev-title-row">
          <div><h1 class="dev-title">Roles y permisos</h1><p class="dev-sub">Roles existentes, matriz por módulos y control real de acceso. Los cambios se guardan en BD (<code>RolePermission</code> + <code>int_rolePerms</code>) y se aplican al instante.</p></div>
          <div class="dev-actions"><button class="btn btn-outline btn-sm" id="btnNewRole">＋ Nuevo rol</button><button class="btn btn-primary btn-sm" id="btnPermHelp">Ayuda</button></div>
        </div>
      </div>

      <div class="cfg-tabs" style="margin-bottom:14px">
        <button class="cfg-tab ${activeTab==='permisos'?'active':''}" data-tab="permisos">Permisos (${totalPerms})</button>
        <button class="cfg-tab ${activeTab==='overview'?'active':''}" data-tab="overview">Resumen</button>
        <button class="cfg-tab ${activeTab==='roles'?'active':''}" data-tab="roles">Roles (${Object.keys(ROLES_META).length})</button>
        <button class="cfg-tab ${activeTab==='usuarios'?'active':''}" data-tab="usuarios">Usuarios por rol</button>
      </div>

      <div id="rolesBody"></div>
    `;

    el.querySelector('[data-bc="dashboard"]')?.addEventListener('click', e=>{ e.preventDefault(); setRoute('admindev/dashboard'); });
    $$('[data-tab]', el).forEach(b=> b.onclick=()=>{ activeTab=b.dataset.tab; renderBody(); $$('[data-tab]',el).forEach(x=> x.classList.toggle('active', x.dataset.tab===activeTab)); });

    const body = $('#rolesBody', el);

    const renderBody = ()=>{
      if(activeTab==='overview'){
        body.innerHTML = `
          <div class="role-grid" style="margin-bottom:16px">
            ${Object.entries(ROLES_META).map(([key,meta])=>{
              const cnt=roleCounts[key]||0; const ac=activeCount(key);
              return `<div class="role-card" style="border-top:4px solid ${meta.color}">
                <div class="rc-head"><div class="rc-icon" style="background:${meta.color}">${meta.icon}</div><span class="badge ${ac?'badge-success':'badge-neutral'}">${ac}/${totalPerms} permisos</span></div>
                <h3>${esc(meta.label)}</h3>
                <p class="small muted" style="line-height:1.45">${esc(meta.desc)}</p>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px"><span class="badge badge-outline">${esc(key)}</span><span class="badge badge-neutral">${cnt} usuario(s)</span></div>
                <div class="bar-track bar-sm" style="margin-top:10px"><div class="bar-fill" style="width:${Math.round((ac/totalPerms)*100)}%; background:${meta.color}"></div></div>
                <div style="display:flex; gap:8px; margin-top:12px"><button class="btn btn-outline btn-sm" data-view-role="${esc(key)}">Gestionar permisos</button><button class="btn btn-ghost btn-sm" data-edit-role="${esc(key)}">Editar</button></div>
              </div>`;
            }).join('')}
          </div>
          <div class="grid grid-2">
            <div class="card"><h3 style="margin-bottom:8px">Control real de acceso</h3><p class="small muted">Cada switch guarda en <code>accounts.RolePermission</code> y <code>localStorage int_rolePerms</code>. Las funciones <code>hasPerm()/can()</code> bloquean UI y rutas al instante.</p><div style="margin-top:12px; display:flex; gap:8px"><button class="btn btn-primary btn-sm" data-go="permisos">Gestionar permisos →</button><button class="btn btn-outline btn-sm" data-go="usuarios">Ver usuarios →</button></div></div>
            <div class="card" style="background:#0f172a; color:#e2e8f0; border-color:#1e293b"><h3 style="color:#fff">Persistencia</h3><p class="small" style="color:#94a3b8; margin:8px 0">Backend: <code>RolePermission(role, code, enabled)</code> — API <code>POST /api/auth/permissions/</code>. Frontend: <code>Store.rolePerms</code>.</p><div class="alert success" style="margin:0; padding:8px 12px"><span class="a-ico">✓</span><div class="small">Los cambios se auditan y se aplican sin recargar.</div></div></div>
          </div>
        `;
        body.querySelector('[data-go="permisos"]')?.addEventListener('click', e=>{ e.preventDefault(); activeTab='permisos'; renderBody(); $$('[data-tab]',el).forEach(x=> x.classList.toggle('active', x.dataset.tab===activeTab)); });
        body.querySelector('[data-go="usuarios"]')?.addEventListener('click', e=>{ e.preventDefault(); activeTab='usuarios'; renderBody(); $$('[data-tab]',el).forEach(x=> x.classList.toggle('active', x.dataset.tab===activeTab)); });
      } else if(activeTab==='roles'){
        body.innerHTML = `
          <div class="role-grid">
            ${Object.entries(ROLES_META).map(([key,meta])=>{
              const list=Store.users.filter(u=>u.role===key); const ac=activeCount(key);
              return `<div class="role-card">
                <div class="rc-head"><div class="rc-icon" style="background:${meta.color}">${meta.icon}</div><span class="badge badge-primary">${list.length} usuarios · ${ac} permisos</span></div>
                <h3>${esc(meta.label)}</h3><p class="tiny muted">${esc(meta.desc)}</p>
                <div style="background:var(--surface-2); border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-top:8px">
                  <div class="tiny muted" style="font-weight:700; margin-bottom:6px">Usuarios</div>
                  ${list.slice(0,3).map(u=> `<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px"><div class="avatar sm" style="width:26px;height:26px; font-size:0.68rem">${esc(initials(u.name))}</div><span class="small">${esc(u.name)}</span><span class="tiny muted" style="margin-left:auto">${u.active?'●':'○'}</span></div>`).join('')||'<div class="tiny muted">Sin usuarios</div>'}
                  ${list.length>3?`<div class="tiny muted">+${list.length-3} más</div>`:''}
                </div>
                <div style="display:flex; gap:8px; margin-top:12px"><button class="btn btn-outline btn-sm" style="flex:1" data-view-role="${esc(key)}">Permisos</button><button class="btn btn-ghost btn-sm" data-edit-role="${esc(key)}">Editar</button><button class="btn btn-danger-outline btn-sm" data-del-role="${esc(key)}" ${['user','adminbar','admindev'].includes(key)?'disabled title="Rol del sistema"':''}>Eliminar</button></div>
              </div>`;
            }).join('')}
          </div>
        `;
      } else if(activeTab==='permisos'){
        // Selector de rol
        const rolesPills = Object.keys(ROLES_META).map(k=> `<button class="btn btn-sm ${k===selectedRole?'btn-primary':'btn-outline'}" data-role="${esc(k)}">${esc(ROLES_META[k].label)} <span class="badge ${k===selectedRole?'badge-outline':''}" style="margin-left:6px; background:${k===selectedRole?'rgba(255,255,255,0.2)':'var(--surface-2)'}">${activeCount(k)}/${totalPerms}</span></button>`).join('');
        body.innerHTML = `
          <div class="card" style="padding:14px; margin-bottom:14px">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:space-between">
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
                <span class="tiny muted" style="font-weight:700">ROL:</span>
                <div style="display:flex; gap:6px; flex-wrap:wrap">${rolesPills}</div>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" data-bulk="on" ${!canEditPerms?'disabled':''}>Activar todo</button>
                <button class="btn btn-outline btn-sm" data-bulk="off" ${!canEditPerms?'disabled':''}>Desactivar todo</button>
                <button class="btn btn-neutral btn-sm" data-reset ${!canEditPerms?'disabled':''}>Restablecer</button>
              </div>
            </div>
            <div class="alert info" style="margin-top:12px; padding:10px 12px"><span class="a-ico">ℹ️</span><div><div class="a-title">Editando: <b>${esc(ROLES_META[selectedRole]?.label||selectedRole)}</b> (<code>${esc(selectedRole)}</code>) — ${activeCount(selectedRole)} permisos activos</div>Activa/desactiva cada permiso; se guarda al instante en BD y controla el acceso real (<code>can("users.create")</code>).</div></div>
          </div>
          ${CATALOG.map(cat=>{
            const catActive = cat.perms.filter(p=> hasPerm(selectedRole, p.code)).length;
            return `
            <div class="perm-section">
              <div class="perm-section-head">
                <span class="ps-ico">${cat.icon}</span>
                <div><div class="bold" style="font-size:0.95rem">${esc(cat.label)}</div><div class="tiny muted">${esc(cat.perms.length)} permisos · ${catActive} activos</div></div>
                <span class="badge ${catActive?'badge-success':'badge-neutral'}" style="margin-left:auto">${catActive}/${cat.perms.length}</span>
                <button class="btn btn-ghost btn-sm" data-cat-on="${esc(cat.key)}">Todo</button>
                <button class="btn btn-ghost btn-sm" data-cat-off="${esc(cat.key)}">Nada</button>
              </div>
              <div style="display:grid; gap:8px; padding:12px">
                ${cat.perms.map(p=>{
                  const enabled = hasPerm(selectedRole, p.code);
                  const isProtected = (selectedRole==='admindev' && p.code==='permissions.edit' && Store.users.filter(u=>u.role==='admindev' && u.active).length===1);
                  const disabled = isProtected || !canEditPerms;
                  return `<label style="display:flex; align-items:center; gap:12px; padding:10px 12px; background:${enabled?'var(--primary-soft)':'var(--surface-2)'}; border:1px solid ${enabled?'var(--primary)':'#e2e8f0'}; border-radius:10px; cursor:${disabled?'not-allowed':'pointer'}; opacity:${disabled?0.6:1}">
                    <input type="checkbox" data-perm="${esc(p.code)}" ${enabled?'checked':''} ${disabled?'disabled':''} style="width:18px;height:18px; accent-color:var(--primary)">
                    <div style="flex:1; min-width:0">
                      <div class="small bold" style="display:flex; gap:8px; align-items:center">${esc(p.label)} <span class="badge badge-outline" style="font-size:0.68rem">${esc(p.code)}</span>${enabled?'<span class="badge badge-success" style="font-size:0.68rem">Activo</span>':'<span class="badge badge-neutral" style="font-size:0.68rem">Inactivo</span>'}</div>
                      <div class="tiny muted">${esc(p.desc)}</div>
                    </div>
                    <span style="color:${enabled?'var(--success)':'var(--text-3)'}">${enabled?'●':'○'}</span>
                  </label>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
          <div class="tiny muted" style="margin-top:12px; text-align:center">Los cambios se persisten en <code>int_rolePerms</code> y <code>POST /api/auth/permissions/</code>. Afectan inmediatamente a <code>routeTargetRole</code> y a los botones protegidos con <code>can()</code>.</div>
        `;
        // bind role selector
        $$('[data-role]', body).forEach(b=> b.onclick=()=>{ selectedRole=b.dataset.role; Store.save('int_roles_selected', selectedRole); renderBody(); });
        $$('[data-perm]', body).forEach(inp=> inp.onchange=()=> saveOne(selectedRole, inp.dataset.perm, inp.checked) );
        body.querySelector('[data-bulk="on"]')?.addEventListener('click', ()=> bulkRole(selectedRole, true));
        body.querySelector('[data-bulk="off"]')?.addEventListener('click', ()=> bulkRole(selectedRole, false));
        body.querySelector('[data-reset]')?.addEventListener('click', ()=> resetRole(selectedRole));
        $$('[data-cat-on]', body).forEach(b=> b.onclick=()=>{ const cat=CATALOG.find(c=>c.key===b.dataset.catOn); if(cat){ const obj={}; cat.perms.forEach(p=> obj[p.code]=true); setRolePermsBulk(selectedRole, obj); toast('Activados '+esc(cat.label),'success'); renderBody(); } });
        $$('[data-cat-off]', body).forEach(b=> b.onclick=()=>{ const cat=CATALOG.find(c=>c.key===b.dataset.catOff); if(cat){ const obj={}; cat.perms.forEach(p=> obj[p.code]=false); setRolePermsBulk(selectedRole, obj); toast('Desactivados '+esc(cat.label),'info'); renderBody(); } });
      } else if(activeTab==='usuarios'){
        body.innerHTML = `
          <div class="grid" style="grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap:12px">
            ${Object.entries(ROLES_META).map(([key,meta])=>{
              const list=Store.users.filter(u=>u.role===key);
              return `<div class="card" style="border-top:4px solid ${meta.color}">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px"><span class="rc-icon" style="background:${meta.color}; color:#fff; width:36px;height:36px; border-radius:10px; display:flex;align-items:center;justify-content:center">${meta.icon}</span><div><div class="bold">${esc(meta.label)}</div><div class="tiny muted">${list.length} usuario(s) · ${esc(key)}</div></div><span class="badge badge-neutral" style="margin-left:auto">${activeCount(key)}/${totalPerms}</span></div>
                <div style="display:flex; flex-direction:column; gap:8px">
                  ${list.map(u=> `<div style="display:flex; align-items:center; gap:10px; padding:8px 10px; background:var(--surface-2); border:1px solid #e2e8f0; border-radius:10px"><div class="avatar sm">${esc(initials(u.name))}</div><div style="flex:1"><div class="small bold">${esc(u.name)}</div><div class="tiny muted">${esc(u.email)}</div></div><span class="badge ${u.active?'badge-success':'badge-neutral'}" style="font-size:0.72rem">${u.active?'Activo':'Inactivo'}</span></div>`).join('')||'<div class="dev-empty">Sin usuarios en este rol</div>'}
                </div>
                <button class="btn btn-outline btn-sm" style="width:100%; margin-top:12px" data-filter-role="${esc(key)}">Filtrar en Usuarios →</button>
              </div>`;
            }).join('')}
          </div>
        `;
        $$('[data-filter-role]', body).forEach(b=> b.onclick=()=> setRoute('admindev/users'));
      }
      // bind role actions (permisos tab)
      $$('[data-view-role]', body).forEach(b=> b.onclick=()=>{ selectedRole=b.dataset.viewRole; activeTab='permisos'; Store.save('int_roles_selected', selectedRole); render(); });
      $$('[data-edit-role]', body).forEach(b=> b.onclick=()=> roleEditModal(b.dataset.editRole, ROLES_META[b.dataset.editRole]));
      $$('[data-del-role]', body).forEach(b=> b.onclick= async ()=>{
        const key=b.dataset.delRole;
        const cnt=Store.users.filter(u=>u.role===key).length;
        if(cnt>0){ toast('No se puede eliminar: '+cnt+' usuario(s) aún usan este rol','error'); return; }
        const ok= await confirmDialog('Eliminar rol','¿Eliminar el rol "'+key+'"? Se borrarán sus permisos.', 'Eliminar', true);
        if(!ok) return;
        const all=Store.rolePerms; delete all[key]; Store.rolePerms=all;
        // también limpiar selección
        if(selectedRole===key) { selectedRole='admindev'; Store.save('int_roles_selected', selectedRole); }
        logAudit('Eliminó rol', key); toast('Rol eliminado','success'); render();
      });
    };
    renderBody();
    window._devRolesRenderBody = renderBody;
  };
  render();

  $('#btnNewRole')?.addEventListener('click', ()=> roleEditModal(null, null));
  $('#btnPermHelp')?.addEventListener('click', ()=> modal(`<div class="alert info" style="margin-bottom:12px"><span class="a-ico">ℹ️</span><div><b>Cómo funciona</b><br>Cada switch es un <code>RolePermission(role, code, enabled)</code> en BD. Al alternar se hace <code>POST /api/auth/permissions/</code> y se actualiza <code>Store.rolePerms</code>. Luego <code>can("users.create")</code> bloquea botones y rutas.</div></div><p class="small muted"><b>Ejemplo:</b> desactiva <code>users.create</code> para <code>admindev</code> y el botón "＋ Nuevo usuario" se deshabilita al instante.</p><p class="small muted" style="margin-top:10px">Roles personalizados: créalos con "Otro" en Usuarios o "＋ Nuevo rol"; aparecen aquí automáticamente.</p>`, { title:'Roles y permisos — funcional' }));
  } catch(e){
    console.error('[devRoles] error', e);
    el.innerHTML = `<div class="card" style="padding:18px"><div class="alert danger"><span class="a-ico">⛔</span><div><div class="a-title">Error al cargar Roles y permisos</div>${esc(e.message)}<br><span class="tiny muted">${esc(e.stack||'')}</span></div></div><button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="devRoles(document.getElementById('devContent'))">Reintentar</button></div>`;
  }
}

function roleEditModal(key, meta){
  const isEdit=!!key;
  const ov=modal(`
    <h3>${isEdit? 'Editar rol: '+esc(meta.label) : 'Nuevo rol'}</h3>
    <p class="tiny muted" style="margin-bottom:14px">${isEdit? 'Actualiza nombre/descripción. El identificador no se puede cambiar si tiene usuarios.' : 'Crea un rol personalizado. Se guardará con permisos vacíos (todo desactivado) para que actives solo lo necesario.'}</p>
    <div class="field"><label class="label">Nombre del rol *</label><input class="input" id="rrName" value="${isEdit?esc(meta.label):''}" placeholder="Ej: Operador"></div>
    <div class="field"><label class="label">Identificador *</label><input class="input" id="rrKey" value="${isEdit?esc(key):''}" placeholder="operador" ${isEdit?'disabled':''}><div class="tiny muted" style="margin-top:6px">Solo minúsculas, sin espacios. Ej: <code>operador</code></div><div class="input-err-msg" id="rrKeyErr"></div></div>
    <div class="field"><label class="label">Descripción</label><textarea class="input" id="rrDesc" placeholder="Qué puede hacer este rol...">${isEdit?esc(meta.desc):''}</textarea></div>
    <div class="tiny muted" style="margin:8px 0; padding:10px; background:var(--surface-2); border:1px solid #e2e8f0; border-radius:10px">Al crear, el rol iniciará con 0 permisos. Actívalos en la pestaña <b>Permisos</b>.</div>
    <div style="display:flex; justify-content:flex-end; gap:10px">
      <button class="btn btn-neutral" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>${isEdit?'Guardar':'Crear rol'}</button>
    </div>`, { title: isEdit?'Editar rol':'Nuevo rol' });
  $('[data-cancel]',ov).onclick=()=> ov.remove();
  $('[data-save]',ov).onclick=()=>{
    const name=$('#rrName',ov).value.trim();
    let rkey=$('#rrKey',ov).value.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
    if(!name){ toast('Nombre obligatorio','warning'); return; }
    if(!rkey){ $('#rrKeyErr',ov).textContent='Identificador obligatorio'; $('#rrKey',ov).classList.add('err'); return; }
    if(!isEdit && Store.rolePerms[rkey] !== undefined){ $('#rrKeyErr',ov).textContent='Ya existe ese identificador'; $('#rrKey',ov).classList.add('err'); return; }
    if(isEdit){
      // solo actualizar label/desc en memo (no hay tabla de roles separada, solo perms)
      // Guardamos alias en localStorage para labels personalizados
      const labels = Store.load('int_roleLabels', {});
      labels[key]=name; Store.save('int_roleLabels', labels);
      // actualizar ROLE_LABELS en memoria para sesión
      ROLE_LABELS[key]=name;
      logAudit('Editó rol', key); toast('Rol actualizado','success');
    } else {
      // crear rol con perms vacíos
      const all=Store.rolePerms;
      if(all[rkey] !== undefined){ toast('Rol ya existe','error'); return; }
      all[rkey]={};
      // inicializar con todos desactivados
      (typeof PERMISSIONS_CATALOG !== 'undefined' ? PERMISSIONS_CATALOG : []).forEach(cat=> cat.perms.forEach(p=> all[rkey][p.code]=false));
      Store.rolePerms=all;
      const labels = Store.load('int_roleLabels', {}); labels[rkey]=name; Store.save('int_roleLabels', labels);
      ROLE_LABELS[rkey]=name;
      logAudit('Creó rol', rkey); toast('Rol "'+esc(name)+'" creado','success');
    }
    ov.remove();
    // recargar sección
    const c=document.getElementById('devContent'); if(c) devRoles(c);
  };
}

/* ============================================================
   CAFETERÍA — información administrativa completa
   ============================================================ */
function devCafe(el){
  const cfg=Store.config;
  // persist cafe info in Store (extra keys)
  const cafeInfo = Store.load('int_cafeInfo', null) || {
    name: 'Cafetería INTESUD',
    slogan: 'Tu pausa, a tiempo.',
    description: 'Cafetería y bar del Instituto Tecnológico Superior Sudamericano — pedidos en línea, delivery interno y preparación prioritaria en barra.',
    address: 'Edificio principal INTESUD, Planta baja',
    reference: 'Frente a secretaría académica',
    phone: '07 123 4567',
    email: 'cafeteria@intesud.edu.ec',
    whatsapp: '099 123 4567',
    orderOpen: cfg.orderOpen,
    orderClose: cfg.orderClose,
    breakStart: cfg.breakStart,
    breakEnd: cfg.breakEnd,
    capacity: cfg.capacity,
    logo: null,
  };

  const saveInfo = (next)=>{
    Store.save('int_cafeInfo', next);
    // sync cfg times
    Store.config = { ...Store.config, orderOpen: next.orderOpen, orderClose: next.orderClose, breakStart: next.breakStart, breakEnd: next.breakEnd, capacity: parseInt(next.capacity)||Store.config.capacity };
    logAudit('Actualizó información de cafetería', next.name);
    toast('Información guardada.','success');
    devCafe(el);
  };

  el.innerHTML = `
    <div class="dev-page-head">
      <div class="dev-breadcrumb"><a href="#" data-bc="dashboard">Platform</a> <span style="color:#cbd5e1">/</span> <span>Cafetería</span></div>
      <div class="dev-title-row">
        <div><h1 class="dev-title">Información de cafetería</h1><p class="dev-sub">Configuración administrativa — no es página pública. Gestiona identidad, contacto y horarios visibles para usuarios y operación.</p></div>
        <div class="dev-actions"><span class="badge badge-success">● 1 sede</span><button class="btn btn-outline btn-sm" id="btnPreview">👁 Vista previa</button></div>
      </div>
    </div>

    <div class="cafe-hero" style="margin-bottom:16px">
      <div class="cafe-logo" title="Logo INTESUD">☕</div>
      <div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap"><h2 style="font-size:1.25rem">${esc(cafeInfo.name)}</h2><span class="badge badge-primary">INTESUD</span><span class="badge badge-neutral">${esc(cafeInfo.slogan)}</span></div>
        <p class="small muted" style="margin:8px 0 12px; line-height:1.5">${esc(cafeInfo.description)}</p>
        <div class="cafe-meta-grid">
          <div class="cafe-meta-item"><span class="mi">📍</span><div><div class="tiny muted">Dirección</div><div class="small bold">${esc(cafeInfo.address)}</div></div></div>
          <div class="cafe-meta-item"><span class="mi">🕒</span><div><div class="tiny muted">Horario pedidos</div><div class="small bold">${esc(cafeInfo.orderOpen)} – ${esc(cafeInfo.orderClose)} · Receso ${esc(cafeInfo.breakStart)}–${esc(cafeInfo.breakEnd)}</div></div></div>
          <div class="cafe-meta-item"><span class="mi">📞</span><div><div class="tiny muted">Teléfono</div><div class="small bold">${esc(cafeInfo.phone)}</div></div></div>
          <div class="cafe-meta-item"><span class="mi">✉️</span><div><div class="tiny muted">Correo</div><div class="small bold">${esc(cafeInfo.email)}</div></div></div>
        </div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1.1fr 0.9fr; gap:16px">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Identidad</div><div class="card-sub">Nombre, logo y descripción institucional</div></div></div>
        <div class="card-body" style="display:grid; gap:14px">
          <div class="field"><label class="label">Nombre del establecimiento *</label><input class="input" id="cfName" value="${esc(cafeInfo.name)}"><div class="input-err-msg" id="cfNameErr"></div></div>
          <div class="field"><label class="label">Slogan</label><input class="input" id="cfSlogan" value="${esc(cafeInfo.slogan)}" placeholder="Tu pausa, a tiempo."></div>
          <div class="field"><label class="label">Descripción</label><textarea class="input" id="cfDesc" rows="3">${esc(cafeInfo.description)}</textarea><div class="tiny muted" style="margin-top:6px">Se muestra en landing y paneles.</div></div>
          <div class="field"><label class="label">Logo <span class="opt">(opcional)</span></label>
            <div class="file-drop" id="cfLogoDrop" style="padding:18px; border-style:dashed"><div class="fd-ico">🖼️</div><div class="small bold">Arrastra el logo o haz clic para seleccionar</div><div class="tiny muted">PNG, JPG, SVG · Máx 2MB · Simulado</div><input type="file" id="cfLogo" accept="image/*" style="display:none"></div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px">
            <span class="badge badge-neutral">Planta baja</span><span class="badge badge-neutral">INTESUD</span><span class="badge badge-outline">Pedidos en línea</span>
          </div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:16px">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Ubicación & contacto</div><div class="card-sub">Datos visibles para usuarios y delivery</div></div></div>
          <div class="card-body" style="display:grid; gap:12px">
            <div class="field"><label class="label">Dirección</label><input class="input" id="cfAddress" value="${esc(cafeInfo.address)}"></div>
            <div class="field"><label class="label">Referencia</label><input class="input" id="cfRef" value="${esc(cafeInfo.reference)}" placeholder="Frente a..."></div>
            <div class="grid grid-2">
              <div class="field"><label class="label">Teléfono</label><input class="input" id="cfPhone" value="${esc(cafeInfo.phone)}"></div>
              <div class="field"><label class="label">WhatsApp</label><input class="input" id="cfWhatsapp" value="${esc(cafeInfo.whatsapp)}"></div>
            </div>
            <div class="field"><label class="label">Correo</label><input class="input" id="cfEmail" value="${esc(cafeInfo.email)}"></div>
            <div class="tiny muted">Si el backend expone <code>CafeConfig</code>, estos campos se sincronizan vía API.</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">Horarios & operación</div><div class="card-sub">Sincronizado con Configuración general</div></div></div>
          <div class="card-body" style="display:grid; gap:12px">
            <div class="grid grid-2">
              <div class="field"><label class="label">Apertura pedidos</label><input class="input" type="time" id="cfOpen" value="${esc(cafeInfo.orderOpen)}"></div>
              <div class="field"><label class="label">Cierre pedidos</label><input class="input" type="time" id="cfClose" value="${esc(cafeInfo.orderClose)}"></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label class="label">Inicio receso</label><input class="input" type="time" id="cfBreakS" value="${esc(cafeInfo.breakStart)}"></div>
              <div class="field"><label class="label">Fin receso</label><input class="input" type="time" id="cfBreakE" value="${esc(cafeInfo.breakEnd)}"></div>
            </div>
            <div class="field"><label class="label">Capacidad máxima</label><input class="input" type="number" id="cfCap" value="${cafeInfo.capacity}" min="1"></div>
            <div class="alert info" style="padding:10px 12px"><span class="a-ico">ℹ️</span><div class="small">Los horarios controlan <b>canPlaceOrder()</b> y la barra operativa.</div></div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px; position:sticky; bottom:16px; background:rgba(241,245,249,0.9); backdrop-filter:blur(6px); padding:12px; border:1px solid #e2e8f0; border-radius:12px; box-shadow: var(--shadow-sm)">
      <button class="btn btn-neutral" id="cfReset">Restablecer</button>
      <button class="btn btn-primary" id="cfSave">Guardar información</button>
    </div>
  `;

  el.querySelector('[data-bc="dashboard"]')?.addEventListener('click', e=>{ e.preventDefault(); setRoute('admindev/dashboard'); });
  $('#cfLogoDrop').onclick=()=> $('#cfLogo').click();
  $('#cfLogo').onchange=e=>{
    const f=e.target.files[0];
    if(f){ toast('Logo seleccionado: '+f.name+' (simulado)','success'); $('#cfLogoDrop').classList.add('success'); }
  };
  $('#btnPreview')?.addEventListener('click', ()=> toast('Vista previa landing — ver #landing (simulada)','info'));
  $('#cfReset').onclick=()=>{
    Store.save('int_cafeInfo', null);
    localStorage.removeItem('int_cafeInfo');
    toast('Información restablecida','info');
    devCafe(el);
  };
  $('#cfSave').onclick=()=>{
    const name=$('#cfName').value.trim();
    if(!name){ $('#cfNameErr').textContent='Nombre obligatorio'; $('#cfName').classList.add('err'); toast('Corrige el formulario','warning'); return; }
    const next={
      name,
      slogan: $('#cfSlogan').value.trim(),
      description: $('#cfDesc').value.trim(),
      address: $('#cfAddress').value.trim(),
      reference: $('#cfRef').value.trim(),
      phone: $('#cfPhone').value.trim(),
      email: $('#cfEmail').value.trim(),
      whatsapp: $('#cfWhatsapp').value.trim(),
      orderOpen: $('#cfOpen').value || cafeInfo.orderOpen,
      orderClose: $('#cfClose').value || cafeInfo.orderClose,
      breakStart: $('#cfBreakS').value || cafeInfo.breakStart,
      breakEnd: $('#cfBreakE').value || cafeInfo.breakEnd,
      capacity: $('#cfCap').value || cafeInfo.capacity,
      logo: cafeInfo.logo,
    };
    saveInfo(next);
  };
}

/* ============================================================
   CONFIGURACIÓN GENERAL — por categorías (tabs)
   ============================================================ */
function devConfig(el){
  const cfg=Store.config;
  const cafeInfo = Store.load('int_cafeInfo', null) || { name:'Cafetería INTESUD' };
  let tab = Store.load('int_cfg_tab', 'general') || 'general';

  const render = ()=>{
    el.innerHTML = `
      <div class="dev-page-head">
        <div class="dev-breadcrumb"><a href="#" data-bc="dashboard">Platform</a> <span style="color:#cbd5e1">/</span> <span>Configuración</span></div>
        <div class="dev-title-row">
          <div><h1 class="dev-title">Configuración general</h1><p class="dev-sub">Parámetros de la plataforma organizados por categorías. Opciones sin backend real quedan preparadas visualmente.</p></div>
          <div class="dev-actions"><span class="badge badge-neutral">v1.0.0 · LocalStorage</span><button class="btn btn-outline btn-sm" id="cfgExport">⤓ Exportar</button></div>
        </div>
      </div>

      <div class="cfg-tabs">
        <button class="cfg-tab ${tab==='general'?'active':''}" data-tab="general">General</button>
        <button class="cfg-tab ${tab==='cuenta'?'active':''}" data-tab="cuenta">Cuenta</button>
        <button class="cfg-tab ${tab==='seguridad'?'active':''}" data-tab="seguridad">Seguridad</button>
        <button class="cfg-tab ${tab==='notif'?'active':''}" data-tab="notif">Notificaciones</button>
        <button class="cfg-tab ${tab==='sistema'?'active':''}" data-tab="sistema">Sistema</button>
      </div>

      <div id="cfgBody"></div>
    `;
    el.querySelector('[data-bc="dashboard"]')?.addEventListener('click', e=>{ e.preventDefault(); setRoute('admindev/dashboard'); });
    $$('[data-tab]', el).forEach(b=> b.onclick=()=>{ tab=b.dataset.tab; Store.save('int_cfg_tab', tab); renderBody(); $$('[data-tab]',el).forEach(x=> x.classList.toggle('active', x.dataset.tab===tab)); });
    $('#cfgExport')?.addEventListener('click', ()=> toast('Configuración exportada (simulado)','success'));

    const body=$('#cfgBody', el);
    const renderBody = ()=>{
      if(tab==='general'){
        body.innerHTML = `
          <div class="cfg-panel">
            <h3 style="margin-bottom:4px">General</h3><p class="tiny muted" style="margin-bottom:16px">Información básica y operación diaria.</p>
            <div class="grid grid-2">
              <div class="field"><label class="label">Nombre del sistema</label><input class="input" id="gcName" value="${esc(cafeInfo.name)} — Pedidos en línea"></div>
              <div class="field"><label class="label">Capacidad máxima de preparación</label><input class="input" type="number" id="gcCap" value="${cfg.capacity}" min="1"><div class="tiny muted" style="margin-top:6px">Controla el flujo de pedidos en barra.</div></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label class="label">Apertura pedidos</label><input class="input" type="time" id="gcOpen" value="${cfg.orderOpen}"></div>
              <div class="field"><label class="label">Cierre pedidos</label><input class="input" type="time" id="gcClose" value="${cfg.orderClose}"></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label class="label">Inicio receso</label><input class="input" type="time" id="gcBreakS" value="${cfg.breakStart}"></div>
              <div class="field"><label class="label">Fin receso</label><input class="input" type="time" id="gcBreakE" value="${cfg.breakEnd}"></div>
            </div>
            <div style="display:flex; gap:18px; flex-wrap:wrap; margin:14px 0">
              <label class="checkbox-row"><input type="checkbox" id="gcCafeOpen" ${cfg.cafeOpen?'checked':''}> <b>Cafetería abierta</b> <span class="badge ${cfg.cafeOpen?'badge-success':'badge-danger'}" style="margin-left:6px">${cfg.cafeOpen?'Activa':'Cerrada'}</span></label>
              <label class="checkbox-row"><input type="checkbox" id="gcDelivery" ${cfg.deliveryEnabled?'checked':''}> <b>Delivery interno habilitado</b></label>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px"><button class="btn btn-neutral" id="gcCancel">Cancelar</button><button class="btn btn-primary" id="gcSave">Guardar cambios</button></div>
          </div>
          <div class="card" style="margin-top:14px">
            <h3 style="margin-bottom:8px">Vista operativa</h3>
            <div class="grid grid-3">
              <div class="alert ${cfg.cafeOpen?'success':'danger'}" style="margin:0"><span class="a-ico">${cfg.cafeOpen?'✓':'⛔'}</span><div><div class="a-title">${cfg.cafeOpen?'Operativa':'Pausada'}</div>Cafetería ${cfg.cafeOpen?'recibe pedidos':'no recibe pedidos'} (${cfg.orderOpen}–${cfg.orderClose})</div></div>
              <div class="alert ${cfg.deliveryEnabled?'success':'neutral'}" style="margin:0"><span class="a-ico">🛵</span><div><div class="a-title">Delivery ${cfg.deliveryEnabled?'habilitado':'deshabilitado'}</div>3 pisos (P1–P3) · Máx 4 pedidos</div></div>
              <div class="alert info" style="margin:0"><span class="a-ico">📦</span><div><div class="a-title">${cfg.capacity} cupos</div>Capacidad de preparación diaria</div></div>
            </div>
          </div>
        `;
        $('#gcCancel').onclick=()=> renderBody();
        $('#gcSave').onclick=()=>{
          cfg.capacity = parseInt($('#gcCap').value)||cfg.capacity;
          cfg.orderOpen = $('#gcOpen').value || cfg.orderOpen;
          cfg.orderClose = $('#gcClose').value || cfg.orderClose;
          cfg.breakStart = $('#gcBreakS').value || cfg.breakStart;
          cfg.breakEnd = $('#gcBreakE').value || cfg.breakEnd;
          cfg.cafeOpen = $('#gcCafeOpen').checked;
          cfg.deliveryEnabled = $('#gcDelivery').checked;
          Store.config=cfg;
          logAudit('Actualizó configuración general','General');
          toast('Cambios guardados.','success');
          devConfig(el);
        };
      } else if(tab==='cuenta'){
        const me = currentUser();
        const u = Store.users.find(x=> x.email===me.email) || me;
        body.innerHTML = `
          <div class="cfg-panel">
            <h3>Cuenta administrativa</h3><p class="tiny muted" style="margin:8px 0 16px">Perfil del super admin. Cambios se reflejan en sesión.</p>
            <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px; padding:14px; background:var(--surface-2); border:1px solid #e2e8f0; border-radius:12px">
              <div class="avatar lg">${esc(initials(me.name))}</div>
              <div><div class="bold">${esc(me.name)}</div><div class="tiny muted">${esc(me.email)} · ${esc(ROLE_LABELS[me.role]||me.role)}</div><span class="badge badge-success" style="margin-top:6px">● Activa</span></div>
              <button class="btn btn-outline btn-sm" style="margin-left:auto" id="btnChangePass2">Cambiar contraseña</button>
            </div>
            <div class="grid grid-2">
              <div class="field"><label class="label">Nombre</label><input class="input" id="acName" value="${esc(u.name||me.name)}"></div>
              <div class="field"><label class="label">Correo</label><input class="input" id="acEmail" value="${esc(u.email||me.email)}"></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label class="label">Cargo</label><input class="input" id="acCargo" value="${esc(u.cargo||'Administrador desarrollador')}"></div>
              <div class="field"><label class="label">Aula / Ubicación</label><input class="input" id="acAula" value="${esc(u.aula||'—')}"></div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px"><button class="btn btn-primary" id="acSave">Guardar cuenta</button></div>
          </div>
          <div class="alert info" style="margin-top:14px"><span class="a-ico">ℹ️</span><div><b>Sesión:</b> los cambios de nombre/rol se aplican a <code>int_session</code> inmediatamente.</div></div>
        `;
        $('#btnChangePass2')?.addEventListener('click', ()=> changePasswordModal());
        $('#acSave').onclick=()=>{
          const name=$('#acName').value.trim();
          const email=$('#acEmail').value.trim();
          if(!name || !/^\S+@\S+\.\S+$/.test(email)){ toast('Revisa nombre y correo','warning'); return; }
          const storeU=Store.users.find(x=> x.email===me.email);
          if(storeU){ storeU.name=name; storeU.email=email; storeU.cargo=$('#acCargo').value; storeU.aula=$('#acAula').value; Store.users=Store.users; }
          const sess=Auth.current(); sess.name=name; sess.email=email; Auth.set(sess);
          logAudit('Actualizó cuenta','Perfil admin'); toast('Cuenta actualizada.','success'); devConfig(el);
        };
      } else if(tab==='seguridad'){
        body.innerHTML = `
          <div class="cfg-panel">
            <h3>Seguridad</h3><p class="tiny muted" style="margin:8px 0 16px">Controles simulados — preparados visualmente. Sin backend real.</p>
            <div style="display:grid; gap:12px">
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer"><input type="checkbox" checked> <div><div class="bold" style="font-size:0.92rem">Exigir contraseña segura</div><div class="tiny muted">Mín. 8 caracteres, mayúscula y número</div></div><span class="badge badge-success" style="margin-left:auto">Activo</span></label>
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer"><input type="checkbox" checked> <div><div class="bold" style="font-size:0.92rem">Bloqueo por intentos fallidos</div><div class="tiny muted">5 intentos · 15 min bloqueo</div></div><span class="badge badge-success" style="margin-left:auto">Activo</span></label>
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer; opacity:0.7"><input type="checkbox"> <div><div class="bold" style="font-size:0.92rem">2FA (próximamente)</div><div class="tiny muted">Autenticación en dos pasos vía email</div></div><span class="badge badge-neutral" style="margin-left:auto">Próximamente</span></label>
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer"><input type="checkbox" checked> <div><div class="bold" style="font-size:0.92rem">Registro de auditoría</div><div class="tiny muted">Todas las acciones quedan trazadas</div></div><span class="badge badge-success" style="margin-left:auto">Activo</span></label>
            </div>
            <div class="alert warning" style="margin-top:14px"><span class="a-ico">🔒</span><div><b>Nota:</b> estas opciones son ilustrativas hasta que <code>accounts.permissions</code> y <code>audit.AuditLog</code> expongan API completa.</div></div>
          </div>
        `;
      } else if(tab==='notif'){
        body.innerHTML = `
          <div class="cfg-panel">
            <h3>Notificaciones</h3><p class="tiny muted" style="margin:8px 0 16px">Preferencias de aviso — UI preparada, sin envío real.</p>
            <div style="display:grid; gap:12px">
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer"><input type="checkbox" checked> <div><div class="bold">Pedidos nuevos (Bar)</div><div class="tiny muted">Avisa a barra cuando entra un pedido</div></div><span class="badge badge-success" style="margin-left:auto">Email</span></label>
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer"><input type="checkbox" checked> <div><div class="bold">Stock crítico</div><div class="tiny muted">Alerta cuando un producto ≤ mínimo</div></div><span class="badge badge-warning" style="margin-left:auto">Push</span></label>
              <label class="card" style="display:flex; align-items:center; gap:12px; padding:14px; cursor:pointer; opacity:0.6"><input type="checkbox"> <div><div class="bold">Resumen diario (próximamente)</div><div class="tiny muted">Ventas, pedidos y auditoría por correo</div></div><span class="badge badge-neutral" style="margin-left:auto">Próximamente</span></label>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:16px"><button class="btn btn-primary" onclick="toast('Preferencias guardadas (simulado)','success')">Guardar preferencias</button></div>
          </div>
        `;
      } else if(tab==='sistema'){
        body.innerHTML = `
          <div class="cfg-panel">
            <h3>Sistema</h3><p class="tiny muted" style="margin:8px 0 16px">Parámetros técnicos y mantenimiento.</p>
            <div class="grid grid-2">
              <div class="card" style="padding:14px"><div class="tiny muted">Versión</div><div class="bold" style="font-size:1.1rem">1.0.0</div><div class="tiny muted">HTML5 · CSS3 · JS · LocalStorage</div></div>
              <div class="card" style="padding:14px"><div class="tiny muted">Modo</div><div class="bold" style="font-size:1.1rem">Demo / Prototipo</div><div class="tiny muted">Sin backend · Datos simulados</div></div>
            </div>
            <div style="margin-top:14px; display:grid; gap:10px">
              <label class="checkbox-row"><input type="checkbox" ${Store.load('int_maint',false)?'checked':''} id="sysMaint"> <b>Modo mantenimiento</b> <span class="tiny muted" style="margin-left:8px">Bloquea pedidos y muestra banner</span></label>
              <div class="alert warning" style="margin:0"><span class="a-ico">⚠️</span><div class="small"><b>Zona peligrosa:</b> restablecer datos de demo eliminará usuarios, pedidos y auditoría personalizados.</div></div>
              <div style="display:flex; gap:10px; flex-wrap:wrap">
                <button class="btn btn-danger-outline btn-sm" id="sysReset">↺ Restablecer demo</button>
                <button class="btn btn-outline btn-sm" id="sysClearAudit">Borrar auditoría</button>
                <button class="btn btn-neutral btn-sm" onclick="toast('Cache LocalStorage: ' + JSON.stringify(Object.keys(localStorage).filter(k=>k.startsWith('int_'))),'info')">Ver storage →</button>
              </div>
            </div>
          </div>
          <div class="card" style="margin-top:14px">
            <h3 style="margin-bottom:8px">Acerca de</h3><p class="small muted">Frontend del sistema de pedidos en línea de la cafetería INTESUD. Proyecto colaborativo — Participante 8: Admin Developer + Design System.</p><div class="tiny muted" style="margin-top:10px">Stack: Vanilla JS · CSS Variables · SPA hash routing · Responsive 560/900/1080</div>
          </div>
        `;
        $('#sysMaint').onchange=e=>{ Store.save('int_maint', e.target.checked); toast(e.target.checked?'Mantenimiento activado':'Mantenimiento desactivado','info'); };
        $('#sysReset').onclick= async ()=>{
          const ok= await confirmDialog('Restablecer demo','¿Borrar todos los datos personalizados y volver al estado inicial? Esta acción no se puede deshacer.','Restablecer', true);
          if(!ok) return;
          Store.reset(); localStorage.removeItem('int_cafeInfo'); localStorage.removeItem('int_maint'); location.reload();
        };
        $('#sysClearAudit').onclick= async ()=>{
          const ok= await confirmDialog('Borrar auditoría','¿Eliminar todos los registros de auditoría?','Borrar', true);
          if(!ok) return; Store.audit=[]; toast('Auditoría borrada','success'); devConfig(el);
        };
      }
    };
    renderBody();
  };
  render();
}

/* ============================================================
   AUDITORÍA — tabla/timeline + filtros usuario/acción/módulo/fecha
   ============================================================ */
function devAudit(el){
  const audit = Store.audit;
  let view='table';
  let q=''; let fUser=''; let fAction=''; let fModule=''; let fDate='';
  // derivar usuarios únicos
  const usersUniq=[...new Set(audit.map(a=>a.user))];
  const actionsUniq=[...new Set(audit.map(a=>a.action))].slice(0,20);
  const modules = ['usuarios','pedidos','roles','permisos','config','cafetería','auditoría','sistema','pagos','stock'];
  const inferModule = (a)=>{
    const t=(a.action+' '+a.target).toLowerCase();
    if(t.includes('usuario')) return 'usuarios';
    if(t.includes('pedido')) return 'pedidos';
    if(t.includes('rol')||t.includes('permiso')) return 'roles';
    if(t.includes('stock')||t.includes('producto')) return 'stock';
    if(t.includes('config')||t.includes('horario')||t.includes('capacidad')) return 'config';
    if(t.includes('cafetería')||t.includes('cafe')) return 'cafetería';
    if(t.includes('sesión')||t.includes('login')||t.includes('sesion')) return 'sistema';
    if(t.includes('pago')) return 'pagos';
    return 'sistema';
  };

  const render = ()=>{
    let list=[...audit];
    if(q) list=list.filter(a=> (a.user+' '+a.action+' '+(a.target||'') ).toLowerCase().includes(q.toLowerCase()));
    if(fUser) list=list.filter(a=> a.user===fUser);
    if(fAction) list=list.filter(a=> a.action===fAction);
    if(fModule) list=list.filter(a=> inferModule(a)===fModule);
    if(fDate) list=list.filter(a=> (a.time||'').includes(fDate) || (a.target||'').includes(fDate));

    el.innerHTML = `
      <div class="dev-page-head">
        <div class="dev-breadcrumb"><a href="#" data-bc="dashboard">Platform</a> <span style="color:#cbd5e1">/</span> <span>Auditoría</span></div>
        <div class="dev-title-row">
          <div><h1 class="dev-title">Auditoría</h1><p class="dev-sub">Trazabilidad de acciones administrativas · ${audit.length} evento(s) · Filtros por usuario, acción, módulo y fecha.</p></div>
          <div class="dev-actions">
            <div class="audit-view-switch">
              <button class="btn btn-sm ${view==='table'?'btn-primary':'btn-ghost'}" data-view="table">Tabla</button>
              <button class="btn btn-sm ${view==='timeline'?'btn-primary':'btn-ghost'}" data-view="timeline">Timeline</button>
            </div>
            <button class="btn btn-outline btn-sm" id="auditExport">⤓ Exportar</button>
          </div>
        </div>
      </div>

      <div class="card" style="padding:14px; margin-bottom:14px">
        <div class="audit-toolbar">
          <div class="field" style="margin:0"><label class="label">Buscar</label><div class="input-wrap"><span class="leading-ico">${_devSvg('search')}</span><input class="input" id="aQ" placeholder="Usuario, acción, objetivo..." value="${esc(q)}"></div></div>
          <div class="field" style="margin:0"><label class="label">Usuario</label><select class="input" id="aUser"><option value="">Todos</option>${usersUniq.map(u=> `<option ${fUser===u?'selected':''}>${esc(u)}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label class="label">Acción</label><select class="input" id="aAction"><option value="">Todas</option>${actionsUniq.map(a=> `<option ${fAction===a?'selected':''}>${esc(a)}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label class="label">Módulo</label><select class="input" id="aMod"><option value="">Todos</option>${modules.map(m=> `<option value="${m}" ${fModule===m?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label class="label">Hora/fecha</label><input class="input" id="aDate" placeholder="09:30 / 2025..." value="${esc(fDate)}"></div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px; font-size:0.82rem">
          <span class="tiny muted">${list.length} de ${audit.length} evento(s)</span>
          ${(q||fUser||fAction||fModule||fDate)?`<a class="tiny bold" style="color:var(--primary)" href="#" id="aClear">Limpiar filtros</a>`:''}
          <span class="badge badge-neutral" style="margin-left:auto">${view==='table'?'Vista tabla':'Vista timeline'}</span>
        </div>
      </div>

      <div id="auditBody"></div>
      <div class="tiny muted" style="margin-top:10px; text-align:center">Mostrando ${Math.min(list.length,50)} de ${list.length} · Orden: más reciente primero · Fuente: Store.audit / AuditLog (backend)</div>
    `;

    el.querySelector('[data-bc="dashboard"]')?.addEventListener('click', e=>{ e.preventDefault(); setRoute('admindev/dashboard'); });
    $$('[data-view]', el).forEach(b=> b.onclick=()=>{ view=b.dataset.view; render(); });
    $('#aQ').addEventListener('input', e=>{ q=e.target.value; render(); setTimeout(()=>{ const inp=$('#aQ'); if(inp){ inp.focus(); const v=inp.value; inp.setSelectionRange(v.length,v.length); } },0); });
    $('#aUser').onchange=e=>{ fUser=e.target.value; render(); };
    $('#aAction').onchange=e=>{ fAction=e.target.value; render(); };
    $('#aMod').onchange=e=>{ fModule=e.target.value; render(); };
    $('#aDate').addEventListener('input', e=>{ fDate=e.target.value; render(); });
    $('#aClear')?.addEventListener('click', e=>{ e.preventDefault(); q=''; fUser=''; fAction=''; fModule=''; fDate=''; render(); });
    $('#auditExport')?.addEventListener('click', ()=> toast('Auditoría exportada ('+list.length+' registros)','success'));

    const body=$('#auditBody', el);
    if(!list.length){
      body.innerHTML = `<div class="dev-empty"><div style="font-size:1.8rem; margin-bottom:8px">📜</div><h3>Sin registros</h3><p class="tiny muted">No hay actividad que coincida con los filtros.</p><button class="btn btn-outline btn-sm" style="margin-top:10px" id="clearAuditFilters">Limpiar filtros</button></div>`;
      $('#clearAuditFilters', body)?.addEventListener('click', ()=>{ q=''; fUser=''; fAction=''; fModule=''; fDate=''; render(); });
      return;
    }
    if(view==='table'){
      body.innerHTML = `
        <div class="table-wrap"><table>
          <thead><tr><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Objetivo</th><th>Fecha/hora</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${list.slice(0,50).map(a=>{
              const mod=inferModule(a);
              const st = (a.action.includes('Creó') || a.action.includes('Activó')) ? 'success' : a.action.includes('Desactivó')||a.action.includes('Canceló') ? 'warning' : a.action.includes('sesión') ? 'info' : 'neutral';
              return `<tr>
                <td><div style="display:flex; align-items:center; gap:8px"><div class="avatar sm" style="width:28px;height:28px; font-size:0.72rem">${esc(initials(a.user))}</div><span class="small bold">${esc(a.user)}</span></div></td>
                <td class="small">${esc(a.action)}</td>
                <td><span class="badge badge-outline" style="font-size:0.72rem">${esc(mod)}</span></td>
                <td class="small muted" style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(a.target||'—')}</td>
                <td class="small muted">${esc(a.time||'—')}</td>
                <td><span class="badge ${st==='success'?'badge-success':st==='warning'?'badge-warning':st==='info'?'badge-info':'badge-neutral'}" style="font-size:0.72rem">${st==='success'?'Completado':st==='warning'?'Atención':st==='info'?'Sesión':'Registrado'}</span></td>
                <td><button class="btn btn-ghost btn-sm" data-audit-detail="${a.id}">Ver</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`;
      $$('[data-audit-detail]', body).forEach(b=> b.onclick=()=>{
        const a=list.find(x=> x.id===b.dataset.auditDetail);
        if(!a) return;
        modal(`
          <div class="kv"><dt>Usuario</dt><dd>${esc(a.user)}</dd><dt>Acción</dt><dd>${esc(a.action)}</dd><dt>Módulo</dt><dd>${esc(inferModule(a))}</dd><dt>Objetivo</dt><dd>${esc(a.target||'—')}</dd><dt>Fecha/hora</dt><dd>${esc(a.time||'—')}</dd><dt>Estado</dt><dd>Registrado</dd></div>
          <div class="alert neutral" style="margin-top:14px"><span class="a-ico">ℹ️</span><div class="small">Detalle simulado — en producción proviene de <code>audit.AuditLog</code> con IP y payload JSON.</div></div>
        `, { title: 'Detalle de auditoría', sub: a.id });
      });
    } else {
      body.innerHTML = `<div class="audit-timeline" style="max-width:720px; margin:0 auto">${list.slice(0,30).map(a=> `
        <div class="audit-evt">
          <div class="ae-dot">${esc(initials(a.user).slice(0,2))}</div>
          <div style="flex:1">
            <div class="small"><b>${esc(a.user)}</b> ${esc(a.action)} <span class="badge badge-outline" style="font-size:0.7rem; margin-left:6px">${esc(inferModule(a))}</span></div>
            <div class="tiny muted">${esc(a.target||'—')} · ${esc(a.time||'—')}</div>
          </div>
          <span class="badge badge-neutral" style="height:fit-content">${esc(a.id.slice(0,6))}</span>
        </div>`).join('')}</div>`;
    }
  };
  render();
}

/* ============================================================
   DESIGN SYSTEM — Componentes reutilizables (conservado + extendido)
   ============================================================ */
function devDesign(el) {
  el.innerHTML = `
    <div class="dev-page-head">
      <div class="dev-breadcrumb"><a href="#" data-bc="dashboard">Platform</a> <span style="color:#cbd5e1">/</span> <span>Design System</span></div>
      <div class="dev-title-row">
        <div><h1 class="dev-title">Design System</h1><p class="dev-sub">Tokens centralizados y componentes reutilizables — lenguaje único para toda la plataforma.</p></div>
        <span class="badge badge-primary" style="height:fit-content">INTESUD · #40807E · SaaS</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🎨 Tokens — Colores semánticos</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:var(--primary);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#40807E</b><br><span class="tiny">Primary · Acción principal</span></div>
        <div style="flex:1;min-width:140px;background:var(--success);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#22a06b</b><br><span class="tiny">Success · Completado</span></div>
        <div style="flex:1;min-width:140px;background:var(--warning);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#e09a16</b><br><span class="tiny">Warning · Atención</span></div>
        <div style="flex:1;min-width:140px;background:var(--danger);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#d94b4b</b><br><span class="tiny">Danger · Error</span></div>
        <div style="flex:1;min-width:140px;background:var(--info);color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#3b7cc3</b><br><span class="tiny">Info · Informativo</span></div>
        <div style="flex:1;min-width:140px;background:#0f172a;color:#fff;border-radius:10px;padding:16px;text-align:center"><b>#0f172a</b><br><span class="tiny">Admin Sidebar · Platform</span></div>
      </div>
      <div class="tiny muted" style="margin-top:10px">Superficies: #fff / #f8faf9 · Texto: #16201f / #5c6b69 / #8a9795 · Borde: #e3e9e8 / #e2e8f0 · Background platform: #f1f5f9</div>
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h3 style="margin-bottom:12px">Tipografía & Espaciado</h3>
        <div style="display:grid;gap:8px">
          <div style="font-size:var(--fs-3xl);font-weight:800">3xl · 36px · Extrabold · Display</div>
          <div style="font-size:var(--fs-2xl);font-weight:700">2xl · 28px · Bold · H1</div>
          <div style="font-size:var(--fs-xl);font-weight:700">xl · 22px · H2</div>
          <div style="font-size:var(--fs-lg)">lg · 18px · H3</div>
          <div style="font-size:var(--fs-md)">md · 15px · Body base</div>
          <div style="font-size:var(--fs-sm)">sm · 13px · Small</div>
          <div style="font-size:var(--fs-xs)">xs · 12px · Caption</div>
        </div>
        <div class="divider"></div>
        <div class="tiny muted">Font: Segoe UI / Inter · Weight 400/500/600/700/800 · LH 1.2 / 1.5 · Tracking -0.02em títulos</div>
        <div class="tiny muted" style="margin-top:6px">Espaciados: 4/8/12/16/24/32/48/64 · Radios: 6/9/12/16/22/999</div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Botones — estados completos</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-secondary">Secondary</button>
          <button class="btn btn-outline">Outline</button>
          <button class="btn btn-ghost">Ghost</button>
          <button class="btn btn-danger">Danger</button>
          <button class="btn btn-success">Success</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary btn-sm">Small</button>
          <button class="btn btn-primary btn-lg">Large</button>
          <button class="btn btn-primary" disabled>Disabled</button>
          <span class="badge badge-neutral">+ focus-visible, hover, active, loading</span>
        </div>
        <div class="divider"></div>
        <div class="tiny muted">Altura 38/42/46 · Padding 10–18 · Radius 9 · Icon gap 8 · Transición 0.14s</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h3 style="margin-bottom:12px">Inputs & Form</h3>
        <div class="field"><label class="label">Input normal</label><input class="input" placeholder="Placeholder · Focus → #40807E + glow"></div>
        <div class="field"><label class="label">Input con error</label><input class="input err" value="valor inválido"><div class="input-err-msg">Mensaje de error · borde #d94b4b + soft</div></div>
        <div class="field"><label class="label">Textarea</label><textarea class="input" placeholder="Observaciones..."></textarea></div>
        <label class="checkbox-row"><input type="checkbox" checked> Checkbox · accent #40807E</label>
        <label class="checkbox-row" style="margin-top:8px"><input type="radio" checked> Radio · accent #40807E</label>
        <div style="margin-top:10px; display:flex; align-items:center; gap:10px"><span class="tiny muted">Switch:</span><label class="switch"><input type="checkbox" checked><span class="track"></span><span class="thumb"></span></label></div>
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
        <div class="tiny muted" style="margin-top:10px">Colores con función semántica — no aleatorios por página.</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card">
        <h3 style="margin-bottom:12px">Cards & Alerts</h3>
        <div class="card" style="padding:14px;margin-bottom:10px"><div class="bold">Card base</div><div class="tiny muted">Borde #e2e8f0, sombra soft, radius 16, padding 18–22</div></div>
        <div class="alert success" style="margin-bottom:8px"><span class="a-ico">✓</span><div><b>Success</b> · Operación correcta</div></div>
        <div class="alert warning" style="margin-bottom:8px"><span class="a-ico">⚠️</span><div><b>Warning</b> · Atención</div></div>
        <div class="alert danger" style="margin-bottom:8px"><span class="a-ico">⛔</span><div><b>Error</b> · Algo falló</div></div>
        <div class="alert info"><span class="a-ico">ℹ️</span><div><b>Info</b> · Dato informativo</div></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Empty / Loading / Shadows</h3>
        <div style="border:1px dashed var(--border);border-radius:10px;padding:18px;text-align:center;margin-bottom:10px">
          <div style="font-size:1.6rem">📭</div><div class="tiny muted">Empty state · Sin datos + CTA</div>
        </div>
        <div style="border:1px dashed var(--border);border-radius:10px;padding:18px;text-align:center">
          <div class="spinner" style="width:28px;height:28px;margin:0 auto 8px"></div><div class="tiny muted">Loading · Spinner #40807E</div>
        </div>
        <div class="tiny muted" style="margin-top:10px">Sombras: xs / sm / md / lg · Sutiles, no exageradas.</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-outline btn-sm" onclick="toast('Toast success','success')">Toast success</button>
          <button class="btn btn-outline btn-sm" onclick="toast('Toast error','error')">Toast error</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div><div class="card-title">Design Tokens centralizados</div><div class="card-sub">:root en main.css — cambiar desde un lugar</div></div></div>
      <div class="card-body">
        <div class="grid grid-3" style="font-family: monospace; font-size:0.78rem">
          <div style="background:var(--surface-2); border:1px solid #e2e8f0; border-radius:10px; padding:12px"><b style="color:var(--primary)">colors</b><br>primary #40807E<br>bg #f4f7f6 / #f1f5f9<br>surface #fff<br>text #16201f</div>
          <div style="background:var(--surface-2); border:1px solid #e2e8f0; border-radius:10px; padding:12px"><b style="color:var(--primary)">spacing</b><br>4/8/12/16/24/32/48/64<br>radius 6/9/12/16/22/999<br>shadows xs/sm/md/lg</div>
          <div style="background:var(--surface-2); border:1px solid #e2e8f0; border-radius:10px; padding:12px"><b style="color:var(--primary)">typography</b><br>fs xs–3xl (12–36)<br>fw 400–800<br>lh tight 1.2 / normal 1.5</div>
        </div>
        <div class="alert neutral" style="margin-top:14px"><span class="a-ico">💡</span><div class="small">Todo el frontend ya comparte el mismo lenguaje visual. Antes: colores aislados por página. Ahora: tokens semánticos globales.</div></div>
      </div>
    </div>
  `;
  el.querySelector('[data-bc="dashboard"]')?.addEventListener('click', e=>{ e.preventDefault(); setRoute('admindev/dashboard'); });
}
