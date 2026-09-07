/* ============================================================
   admin/reports.js — Informes de la Administradora del Bar
   ============================================================ */

function barReports(el) {
  const orders = Store.orders.filter(isValidSale);
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date === today);
  const totalVentas = orders.reduce((s, o) => s + o.total, 0);
  const totalHoy = todayOrders.reduce((s, o) => s + o.total, 0);
  const byMethod = { deuna: 0, transferencia: 0, efectivo: 0 };
  orders.forEach((o) => { if (byMethod.hasOwnProperty(o.payment)) byMethod[o.payment] += o.total; });
  const totalMetodo = byMethod.deuna + byMethod.transferencia + byMethod.efectivo || 1;
  const pct = (v) => Math.round((v / totalMetodo) * 100);
  const hours = [7,9,11,13,15,17,19];
  const hourTotals = hours.map((h) => todayOrders.filter((o) => {
    const hr = parseInt((o.time || '0:0').split(':')[0], 10);
    return hr >= h && hr < h + 2;
  }).reduce((s, o) => s + o.total, 0));
  const maxHour = Math.max(...hourTotals, 1);
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const date = d.toISOString().slice(0, 10); const t = orders.filter((o) => o.date === date).reduce((s, o) => s + o.total, 0); days.push({ label: d.toLocaleDateString('es-EC', { weekday: 'short' }), total: t }); }

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-bar-chart-alt-2"></span> Informes</h1></div>
    <p class="page-sub" style="margin-bottom:16px">Resumen visual adaptado a la lógica real del proyecto</p>
    <div class="adv-tabs" style="margin-bottom:20px">
      <button class="category-chip active" data-rpt="ventas">Ventas</button>
      <button class="category-chip" data-rpt="productos">Productos</button>
      <button class="category-chip" data-rpt="pagos">Pagos</button>
      <button class="category-chip" data-rpt="resumen">Resumen</button>
    </div>
    <div id="rptContent"></div>
    <div class="grid grid-3" style="gap:14px;margin-top:20px">
      <div class="stat-card" style="padding:18px;text-align:center">
        <div style="font-size:2.2rem;color:var(--primary);margin-bottom:10px"><i class="bx bx-line-chart"></i></div>
        <div style="font-weight:700;margin-bottom:4px">Reporte de Ventas</div>
        <div class="tiny muted" style="margin-bottom:14px">Resumen de ventas por período</div>
        <button class="btn btn-outline btn-sm" disabled title="Próximamente" style="opacity:0.6;cursor:not-allowed"><i class="bx bx-download" style="margin-right:4px"></i>Descargar</button>
      </div>
      <div class="stat-card" style="padding:18px;text-align:center">
        <div style="font-size:2.2rem;color:var(--primary);margin-bottom:10px"><i class="bx bx-box"></i></div>
        <div style="font-weight:700;margin-bottom:4px">Reporte de Stock</div>
        <div class="tiny muted" style="margin-bottom:14px">Movimientos y existencias</div>
        <button class="btn btn-outline btn-sm" disabled title="Próximamente" style="opacity:0.6;cursor:not-allowed"><i class="bx bx-download" style="margin-right:4px"></i>Descargar</button>
      </div>
      <div class="stat-card" style="padding:18px;text-align:center">
        <div style="font-size:2.2rem;color:var(--primary);margin-bottom:10px"><i class="bx bx-credit-card"></i></div>
        <div style="font-weight:700;margin-bottom:4px">Reporte de Pagos</div>
        <div class="tiny muted" style="margin-bottom:14px">Estado de pagos y cobros</div>
        <button class="btn btn-outline btn-sm" disabled title="Próximamente" style="opacity:0.6;cursor:not-allowed"><i class="bx bx-download" style="margin-right:4px"></i>Descargar</button>
      </div>
    </div>
  `;

  const rptContent = $('#rptContent', el);
  const renderTab = (tab) => {
    if (tab === 'ventas') {
      rptContent.innerHTML = `
        <div class="grid grid-2" style="gap:16px;margin-bottom:16px">
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px">
            <div>
              <div class="tiny muted" style="text-transform:uppercase;letter-spacing:0.06em;font-weight:700">Ventas totales</div>
              <div style="font-size:2rem;font-weight:800;color:var(--primary-strong)">${money(totalVentas)}</div>
              <div class="tiny muted">${orders.length} pedidos válidos · ${money(totalHoy)} hoy</div>
            </div>
            <svg width="120" height="48" viewBox="0 0 120 48" style="flex-shrink:0">
              <polyline fill="none" stroke="var(--primary)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${days.map((d, i) => `${(i / 6) * 110 + 5},${40 - (d.total / Math.max(...days.map(x=>x.total),1)) * 30}`).join(' ')}" />
              <polygon fill="var(--primary-glass)" stroke="none" points="${days.map((d, i) => `${(i / 6) * 110 + 5},${40 - (d.total / Math.max(...days.map(x=>x.total),1)) * 30}`).join(' ')} 115,40 5,40" />
            </svg>
          </div>
          <div class="card">
            <div style="font-weight:700;margin-bottom:12px">Ventas por método de pago</div>
            <div style="display:flex;align-items:center;gap:16px">
              <svg width="110" height="110" viewBox="0 0 42 42" style="flex-shrink:0">
                ${(() => {
                  const vals = [byMethod.deuna, byMethod.transferencia, byMethod.efectivo];
                  const colors = ['#40807E', '#3b7cc3', '#22a06b'];
                  let acc = 0;
                  return vals.map((v, i) => {
                    const pctVal = v / totalMetodo;
                    const dash = pctVal * 100;
                    const gap = 0.5;
                    const offset = 25 - acc * 100;
                    acc += pctVal;
                    return `<circle r="15.915" cx="21" cy="21" fill="transparent" stroke="${colors[i]}" stroke-width="6" stroke-dasharray="${dash - gap} ${100 - dash + gap}" stroke-dashoffset="${offset}" />`;
                  }).join('');
                })()}
                <circle r="10" cx="21" cy="21" fill="var(--surface)" />
              </svg>
              <div style="flex:1;display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#40807E"></span>DEUNA</span><span class="bold">${money(byMethod.deuna)} · ${pct(byMethod.deuna)}%</span></div>
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#3b7cc3"></span>Transferencia</span><span class="bold">${money(byMethod.transferencia)} · ${pct(byMethod.transferencia)}%</span></div>
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#22a06b"></span>Efectivo</span><span class="bold">${money(byMethod.efectivo)} · ${pct(byMethod.efectivo)}%</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <div style="font-weight:700;margin-bottom:12px">Ventas por hora (hoy)</div>
          <div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding:8px 8px 0;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md)">
            ${hours.map((h, i) => {
              const v = hourTotals[i];
              const hPct = (v / maxHour) * 100;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px"><div style="font-size:10px;color:var(--text-3);font-weight:600">${money(v)}</div><div style="width:100%;height:100px;background:var(--surface-3);border-radius:6px 6px 0 0;overflow:hidden;display:flex;align-items:flex-end"><div style="width:100%;height:${Math.max(6, hPct)}%;background:var(--primary);border-radius:6px 6px 0 0"></div></div><div style="font-size:11px;font-weight:700;color:var(--text-2)">${h}h</div></div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else if (tab === 'productos') {
      const prodSales = {};
      orders.forEach((o) => o.items.forEach((i) => { prodSales[i.productId] = (prodSales[i.productId] || 0) + i.qty; }));
      const top = Object.entries(prodSales).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=> ({ product: Store.products.find((p)=>p.id===id), qty})).filter(x=>x.product);
      rptContent.innerHTML = `<div class="card"><div style="font-weight:700;margin-bottom:12px">Productos más vendidos</div>${top.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">${top.map(({product,qty})=>`<div class="stat-card" style="padding:14px;text-align:center"><div style="font-size:2rem;margin-bottom:6px">${product.emoji||'📦'}</div><div class="bold" style="font-size:var(--fs-sm)">${esc(product.name)}</div><div class="st-value primary" style="font-size:1.3rem">${qty} uds</div></div>`).join('')}</div>` : '<div class="tiny muted">Sin ventas aún</div>'}</div>`;
    } else if (tab === 'pagos') {
      rptContent.innerHTML = `
        <div class="grid grid-3" style="gap:12px">
          <div class="stat-card"><div class="st-label">DEUNA</div><div class="st-value primary">${money(byMethod.deuna)}</div><div class="st-sub">${pct(byMethod.deuna)}% del total</div></div>
          <div class="stat-card"><div class="st-label">Transferencia</div><div class="st-value" style="color:var(--info)">${money(byMethod.transferencia)}</div><div class="st-sub">${pct(byMethod.transferencia)}%</div></div>
          <div class="stat-card"><div class="st-label">Efectivo</div><div class="st-value success">${money(byMethod.efectivo)}</div><div class="st-sub">${pct(byMethod.efectivo)}%</div></div>
        </div>
        <div class="card" style="margin-top:16px"><div class="tiny muted">Métodos reales del proyecto: DEUNA, Transferencia y Efectivo. No se usa Tarjeta.</div></div>
      `;
    } else {
      rptContent.innerHTML = `
        <div class="grid grid-2" style="gap:16px">
          <div class="card"><div style="font-weight:700;margin-bottom:8px">Resumen general</div><div class="tiny muted">Ventas totales ${money(totalVentas)} en ${orders.length} pedidos. Hoy ${money(totalHoy)}.</div><div style="margin-top:12px;display:flex;gap:8px"><span class="badge badge-primary">DEUNA ${pct(byMethod.deuna)}%</span><span class="badge badge-info">Transferencia ${pct(byMethod.transferencia)}%</span><span class="badge badge-success">Efectivo ${pct(byMethod.efectivo)}%</span></div></div>
          <div class="card"><div style="font-weight:700;margin-bottom:8px">Accesos rápidos</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-goto="adminbar/sales-dashboard">Ver Ventas</button><button class="btn btn-outline btn-sm" data-goto="adminbar/payments">Ver Pagos</button><button class="btn btn-outline btn-sm" data-goto="adminbar/stock">Ver Stock</button></div></div>
        </div>
      `;
      $$('[data-goto]', rptContent).forEach((a)=> a.onclick=(e)=>{e.preventDefault(); const [s,p]=a.dataset.goto.split('/'); setRoute(s+'/'+p);});
    }
  };
  $$('[data-rpt]', el).forEach((btn)=> btn.onclick=()=>{
    $$('[data-rpt]', el).forEach((x)=> x.classList.remove('active'));
    btn.classList.add('active');
    renderTab(btn.dataset.rpt);
  });
  renderTab('ventas');
}
