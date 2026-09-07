/* ============================================================
   admin/delivery.js — Delivery interno de la Administradora del Bar
   ============================================================ */

function barDelivery(el) {
  ensureAdminbarPresentationStyles();
  const orders = Store.orders.filter((o) => o.delivery === 'delivery');
  const pending = orders.filter((o) => ['queue','confirmed','prep'].includes(o.status));
  const enCamino = orders.filter((o) => o.status === 'ready');
  const entregado = orders.filter((o) => o.status === 'delivered');
  const cfg = Store.config;
  const week = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const floors = ['Piso 1', 'Piso 2', 'Piso 3'];

  if (!cfg.deliveryFloors) cfg.deliveryFloors = floors;

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-cycling"></span> Delivery <span class="badge badge-primary">${orders.length} pedidos</span></h1></div>
    <p class="page-sub" style="margin-bottom:16px">Delivery interno INTESUD — por pisos, sin repartidores externos</p>
    <div class="adv-tabs" style="margin-bottom:16px">
      <button class="category-chip active" data-dtab="pendiente">Pendiente (${pending.length})</button>
      <button class="category-chip" data-dtab="encamino">En camino (${enCamino.length})</button>
      <button class="category-chip" data-dtab="entregado">Entregado (${entregado.length})</button>
      <button class="category-chip" data-dtab="config">Configuración</button>
    </div>
    <div id="deliveryArea"></div>
    <div id="deliveryConfig" style="display:none">
      <div class="card" style="width:100%;max-width:none;margin:0">
        <div style="margin:0 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:var(--fs-xs);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--primary)">Servicio</div></div>
        <div class="field" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px">
          <label class="checkbox-row"><input type="checkbox" id="dlEnabled" ${cfg.deliveryEnabled ? 'checked' : ''}> <b>Habilitar delivery interno</b></label>
          <div class="tiny muted" style="margin-left:26px;margin-top:4px">Cobertura exclusiva dentro del edificio INTESUD.</div>
        </div>
        <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Pisos habilitados</div></div>
        <div class="field" id="dlFloorsField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlFloors">
            ${floors.map((f) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-floor="${f}" ${cfg.deliveryFloors.includes(f) ? 'checked' : ''} style="margin-right:4px">${f}</label>`).join('')}
          </div>
        </div>
        <div style="margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-2)">Días y horario</div></div>
        <div class="field" id="dlDaysField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <label class="label">Días de entrega</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px" id="dlDays">
            ${week.map((d) => `<label class="checkbox-row" style="margin-right:6px"><input type="checkbox" data-day="${d}" ${cfg.deliveryDays.includes(d) ? 'checked' : ''} style="margin-right:4px">${d}</label>`).join('')}
          </div>
        </div>
        <div class="grid grid-2" id="dlTimeFields" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'};margin-top:12px">
          <div class="field"><label class="label">Hora inicio</label><input class="input" type="time" id="dlStart" value="${cfg.orderOpen}" style="max-width: 200px"></div>
          <div class="field"><label class="label">Hora fin</label><input class="input" type="time" id="dlEnd" value="${cfg.orderClose}" style="max-width: 200px"></div>
        </div>
        <div class="field" id="dlMaxField" style="${cfg.deliveryEnabled ? '' : 'opacity:.5;pointer-events:none'}">
          <label class="label">Capacidad máxima simultánea</label>
          <input class="input" type="number" id="dlMax" value="${cfg.deliveryMax}" style="max-width: 150px"><div class="tiny muted" style="margin-top:6px">Pedidos de delivery que pueden atenderse simultáneamente.</div>
        </div>
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
          <button class="btn btn-primary" id="dlSave">Guardar configuración</button>
        </div>
      </div>
    </div>
    ${cfg.deliveryEnabled ? '' : '<div class="status-banner warning" style="margin-top:16px" id="dlWarning"><span class="ico">⚠️</span><div>Delivery interno deshabilitado. Habilítalo en Configuración.</div></div>'}
  `;

  let dtab = 'pendiente';
  const renderDelivery = () => {
    const area = $('#deliveryArea', el);
    const configDiv = $('#deliveryConfig', el);
    const warning = $('#dlWarning', el);
    if (dtab === 'config') {
      area.style.display = 'none';
      if (warning) warning.style.display = 'none';
      configDiv.style.display = 'block';
      return;
    } else {
      area.style.display = 'block';
      if (warning) warning.style.display = cfg.deliveryEnabled ? 'none' : 'block';
      configDiv.style.display = 'none';
    }
    const list = dtab === 'pendiente' ? pending : dtab === 'encamino' ? enCamino : entregado;
    if (!list.length) {
      area.innerHTML = `<div class="empty-state" style="padding:24px"><div class="es-ico">📦</div><h3>Sin pedidos ${dtab}</h3><p class="tiny muted">No hay deliveries en este estado por ahora.</p></div>`;
      return;
    }
    area.innerHTML = `<div class="grid" style="gap:12px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${list.map((o) => `
      <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="bold" style="color:var(--primary-strong)">#${o.id}</span>
          <span class="badge ${o.status === 'ready' ? 'badge-warning' : o.status === 'delivered' ? 'badge-success' : 'badge-info'}">${o.status === 'queue' || o.status === 'confirmed' || o.status === 'prep' ? 'Pendiente' : o.status === 'ready' ? 'En camino' : 'Entregado'}</span>
        </div>
        <div class="tiny muted"><b>Estudiante:</b> ${esc(o.userName)} · <b>Piso ${esc(o.deliveryInfo?.piso || '—')}</b> Aula ${esc(o.deliveryInfo?.aula || '—')}</div>
        <div style="font-size:var(--fs-sm)">${o.items.map((i)=>`${esc(i.name)} ×${i.qty}`).join(', ')}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <span class="bold tabular-nums">${money(o.total)}</span>
          <span class="tiny muted">${o.time} · ${o.date}</span>
        </div>
      </div>
    `).join('')}</div>`;
  };
  $$('[data-dtab]', el).forEach((btn) => btn.onclick = () => {
    $$('[data-dtab]', el).forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    dtab = btn.dataset.dtab;
    renderDelivery();
  });
  renderDelivery();

  const dlEnabledEl = $('#dlEnabled', el);
  const dlFields = ['dlDaysField','dlFloorsField','dlTimeFields','dlMaxField'];
  if (dlEnabledEl) dlEnabledEl.onchange = () => {
    cfg.deliveryEnabled = dlEnabledEl.checked;
    dlFields.forEach(id => {
      const f = $('#' + id, el);
      if (f) { f.style.opacity = cfg.deliveryEnabled ? '' : '.5'; f.style.pointerEvents = cfg.deliveryEnabled ? '' : 'none'; }
    });
    const w = $('#dlWarning', el);
    if (w) w.style.display = cfg.deliveryEnabled ? 'none' : 'block';
  };
  const dlSaveBtn = $('#dlSave', el);
  if (dlSaveBtn) dlSaveBtn.onclick = () => {
    cfg.orderOpen = $('#dlStart', el).value || cfg.orderOpen;
    cfg.orderClose = $('#dlEnd', el).value || cfg.orderClose;
    cfg.deliveryMax = parseInt($('#dlMax', el).value) || cfg.deliveryMax;
    cfg.deliveryDays = week.filter((d) => $(`[data-day="${d}"]`, el)?.checked);
    cfg.deliveryFloors = floors.filter((f) => $(`[data-floor="${f}"]`, el)?.checked);
    cfg.deliveryEnabled = $('#dlEnabled', el).checked;
    Store.config = cfg;
    logAudit('Actualizó configuración de delivery', cfg.deliveryEnabled ? 'Delivery habilitado' : 'Delivery deshabilitado');
    toast('Configuración de delivery guardada.', 'success');
    renderBarAdmin('delivery');
  };
}
