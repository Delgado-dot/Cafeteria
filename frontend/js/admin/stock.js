/* ============================================================
   admin/stock.js — Stock de la Administradora del Bar
   ============================================================ */

function barStock(el) {
  ensureAdminbarPresentationStyles();
  const products = Store.products;
  const history = Store.stockHistory;

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);

  el.innerHTML = `
    <div class="page-title"><h1>Stock</h1></div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <div class="input-wrap" style="flex:1"><span class="leading-ico"><i class="bx bx-search"></i></span><input class="input" id="stockSearch" placeholder="Buscar producto..." style="padding-left:36px"></div>
      <button class="btn btn-outline btn-sm" id="stockFilterBtn"><i class="bx bx-filter"></i> Filtros</button>
    </div>
    <div class="adv-tabs" style="margin-bottom:16px">
      <button class="category-chip active" data-stock-tab="todos">Todos</button>
      <button class="category-chip" data-stock-tab="bajo">Bajo stock</button>
      <button class="category-chip" data-stock-tab="agotados">Agotados</button>
    </div>
    <div class="grid grid-3" style="gap:12px;margin-bottom:16px">
      <div class="stat-card"><div class="st-label">Total productos</div><div class="st-value">${products.length}</div><div class="st-sub">${products.filter((p)=>p.available).length} activos</div><span class="stat-ico bx bx-package muted"></span></div>
      <div class="stat-card warning-card"><div class="st-label">Bajo stock</div><div class="st-value warning">${lowStock.length}</div><div class="st-sub">requieren reposición</div><span class="stat-ico bx bx-error warning"></span></div>
      <div class="stat-card danger-card"><div class="st-label">Agotados</div><div class="st-value danger">${outOfStock.length}</div><div class="st-sub">sin existencias</div><span class="stat-ico bx bx-x-circle danger"></span></div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:12px">Productos con bajo stock</div>
      <div id="lowStockList" style="display:flex;flex-direction:column;gap:10px">
        ${lowStock.length ? lowStock.slice(0,4).map((p)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer" data-low="${p.id}">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--warning-soft);display:flex;align-items:center;justify-content:center;color:var(--warning-strong)"><i class="bx bx-error"></i></div>
            <div style="flex:1;min-width:0"><div class="bold" style="font-size:14px">${esc(p.name)}</div><div class="tiny muted">${esc(p.category)}</div></div>
            <span class="badge ${p.stock <= 2 ? 'badge-danger' : 'badge-warning'}">${p.stock <= 2 ? 'Muy bajo' : 'Bajo'}</span>
            <span class="bold tabular-nums">${p.stock}</span>
          </div>
        `).join('') : '<div class="tiny muted" style="text-align:center;padding:12px">Sin productos con bajo stock</div>'}
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:12px">Productos agotados</div>
      <div id="outStockList" style="display:flex;flex-direction:column;gap:10px">
        ${outOfStock.length ? outOfStock.slice(0,4).map((p)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--r-md)">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--danger-soft);display:flex;align-items:center;justify-content:center;color:var(--danger)"><i class="bx bx-x-circle"></i></div>
            <div style="flex:1"><div class="bold" style="font-size:14px">${esc(p.name)}</div><div class="tiny muted">${esc(p.category)}</div></div>
            <span class="badge badge-danger">Agotado</span>
          </div>
        `).join('') : '<div class="tiny muted" style="text-align:center;padding:12px">Ningún producto agotado</div>'}
      </div>
    </div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th><th>Última actualización</th><th></th></tr></thead>
      <tbody id="stockRows"></tbody>
    </table></div>
    <div style="margin-top:24px">
      <h3 class="section-title">Movimientos recientes</h3>
      <div class="card" id="stockHist"></div>
    </div>`;

  let stockCat = 'Todas';
  const renderRows = () => {
    const list = stockCat === 'Todas' ? products : products.filter((p) => p.category === stockCat);
    const tbody = $('#stockRows', el);
    tbody.innerHTML = list.map((p) => {
      const h = history.find((x) => x.productId === p.id);
      const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
      const fillCls = p.stock === 0 ? 'background:var(--danger)' : p.stock <= p.minStock ? 'background:var(--warning)' : 'background:var(--success)';
      return `<tr>
        <td data-label="Producto"><div class="bold" style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(p.name)}">${esc(p.name)}</div></td>
        <td data-label="Stock actual"><div class="stock-line"><b class="tabular-nums">${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td>
        <td data-label="Stock mínimo"><span class="tabular-nums">${p.minStock}</span></td>
        <td data-label="Estado">${stockBadge(p)}</td>
        <td data-label="Última actualización"><span>${h ? `${h.time} ${h.date}` : '—'}</span></td>
        <td data-label="Acciones">
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn-success btn-icon" title="Aumentar stock" aria-label="Aumentar stock" data-inc="${p.id}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0;background:var(--success);border-color:var(--success)">
                <span class="ico bx bx-plus" style="font-size:18px;color:#fff;line-height:1"></span>
              </button>
              <button class="btn btn-neutral btn-icon" title="Disminuir stock" aria-label="Disminuir stock" data-dec="${p.id}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0">
                <span class="ico bx bx-minus" style="font-size:18px;color:var(--danger);line-height:1"></span>
              </button>
            </div>
          </td>
        </td>
      </tr>`;
    }).join('');
    $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
    $$('[data-dec]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });
  };
  $$('[data-stock-cat]', el).forEach((btn) => btn.onclick = () => {
    $$('[data-stock-cat]', el).forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    stockCat = btn.dataset.stockCat;
    renderRows();
  });
  $$('[data-stock-tab]', el).forEach((btn) => btn.onclick = () => {
    $$('[data-stock-tab]', el).forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.stockTab;
    if (tab === 'bajo') {
      const low = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
      const tbody = $('#stockRows', el);
      tbody.innerHTML = low.map((p) => {
        const h = history.find((x) => x.productId === p.id);
        const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
        const fillCls = 'background:var(--warning)';
        return `<tr><td data-label="Producto"><div class="bold" style="font-size:15px">${esc(p.name)}</div></td><td data-label="Stock actual"><div class="stock-line"><b>${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td><td data-label="Estado"><span class="badge badge-warning">Bajo</span></td><td data-label="Acciones"><div style="display:flex;gap:8px"><button class="btn btn-success btn-icon" data-inc="${p.id}"><i class="bx bx-plus"></i></button><button class="btn btn-neutral btn-icon" data-dec="${p.id}"><i class="bx bx-minus"></i></button></div></td></tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px" class="tiny muted">Sin bajo stock</td></tr>';
      $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
      $$('[data-dec]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });
    } else if (tab === 'agotados') {
      const out = products.filter((p) => p.stock === 0);
      const tbody = $('#stockRows', el);
      tbody.innerHTML = out.map((p) => `<tr><td data-label="Producto"><div class="bold" style="font-size:15px">${esc(p.name)}</div></td><td data-label="Stock actual"><b>0</b></td><td data-label="Estado"><span class="badge badge-danger">Agotado</span></td><td data-label="Acciones"><button class="btn btn-success btn-icon" data-inc="${p.id}"><i class="bx bx-plus"></i></button></td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px" class="tiny muted">Sin agotados</td></tr>';
      $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
    } else {
      renderRows();
    }
  });
  const stockSearch = $('#stockSearch', el);
  if (stockSearch) stockSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const tbody = $('#stockRows', el);
    const filtered = products.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    tbody.innerHTML = filtered.map((p) => {
      const h = history.find((x) => x.productId === p.id);
      const pct = p.minStock ? Math.min(100, Math.round((p.stock / (p.minStock * 3)) * 100)) : 100;
      const fillCls = p.stock === 0 ? 'background:var(--danger)' : p.stock <= p.minStock ? 'background:var(--warning)' : 'background:var(--success)';
      return `<tr><td data-label="Producto"><div class="bold" style="font-size:15px">${esc(p.name)}</div></td><td data-label="Stock actual"><div class="stock-line"><b>${p.stock}</b><div class="stock-bar"><div class="fill" style="width:${pct}%;${fillCls}"></div></div></div></td><td data-label="Estado">${stockBadge(p)}</td><td data-label="Acciones"><div style="display:flex;gap:8px"><button class="btn btn-success btn-icon" data-inc="${p.id}"><i class="bx bx-plus"></i></button><button class="btn btn-neutral btn-icon" data-dec="${p.id}"><i class="bx bx-minus"></i></button></div></td></tr>`;
    }).join('');
    $$('[data-inc]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.inc); adjust(p, 1); });
    $$('[data-dec]', tbody).forEach((b) => b.onclick = () => { const p = products.find((x) => x.id === b.dataset.dec); adjust(p, -1); });
  });
  $$('[data-low]', el).forEach((item) => item.onclick = () => {
    const p = products.find((x) => x.id === item.dataset.low);
    if (p) { stockCat = p.category; $$('[data-stock-cat]', el).forEach((x) => x.classList.toggle('active', x.dataset.stockCat === p.category)); renderRows(); }
  });

  const histWrap = $('#stockHist');
  if (!history.length) histWrap.innerHTML = emptyState('<i class="bx bx-history"></i>', 'Aún no hay movimientos', 'Cuando ajustes el stock, verás aquí el historial con cariño.');

  const adjust = (p, delta) => {
    const newVal = p.stock + delta;
    if (newVal < 0) { toast('El stock no puede ser negativo.', 'warning'); return; }
    const entry = { productId: p.id, name: p.name, delta, newVal, time: nowTime(), date: new Date().toISOString().slice(0, 10) };
    p.stock = newVal;
    Store.products = products;
    history.unshift(entry);
    Store.stockHistory = history;
    logAudit(`${delta > 0 ? 'Aumentó' : 'Disminuyó'} stock`, p.name);
    toast(p.name + ' ' + (delta > 0 ? '+' : '') + delta + ' unidades.', 'success');
    renderBarAdmin('stock');
  };

  const tbody = $('#stockRows', el);
  tbody.innerHTML = Array.from({ length: 5 }, () => `
    <tr>
      <td><div class="skeleton" style="width:120px;height:16px"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
      <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
      <td><div class="skeleton" style="width:90px;height:14px"></div></td>
      <td><div class="skeleton" style="width:60px;height:28px;border-radius:var(--r-sm)"></div></td>
    </tr>
  `).join('');
  setTimeout(renderRows, 350);

  histWrap.innerHTML = history.slice(0, 15).map((h) => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.88rem">
      <span>${esc(h.name)} <span class="badge ${h.delta > 0 ? 'badge-success' : 'badge-danger'}">${h.delta > 0 ? '+' + h.delta : h.delta}</span> → <b>${h.newVal}</b></span>
      <span class="tiny muted">${h.time} · ${h.date}</span>
    </div>`).join('');
}

/* ============================================================
   HISTORIAL DE STOCK
   ============================================================ */
function barStockHistory(el) {
  ensureAdminbarPresentationStyles();
  const history = Store.stockHistory;

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-history"></span> Historial de stock</h1></div>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Fecha/hora</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock resultante</th></tr></thead>
      <tbody id="stockHistoryRows"></tbody></table></div>
  `;

  const renderRows = () => {
    const tbody = $('#stockHistoryRows', el);
    if (!history.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-history"></i></div><div style="font-weight:600">Aún no hay movimientos de stock</div><div class="tiny muted" style="margin-top:4px">Los ajustes de stock aparecerán aquí</div></td></tr>';
      return;
    }

    const byDate = history.reduce((acc, h) => {
      const date = h.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(h);
      return acc;
    }, {});

    tbody.innerHTML = Object.entries(byDate).map(([date, entries]) => `
      <tr class="stock-history-date-header">
        <td colspan="5" style="background:var(--surface-2); font-weight:var(--fw-semibold); padding:8px 16px; border-bottom:1px solid var(--border);">
          ${date}
        </td>
      </tr>
      ${entries.map((h) => {
        const type = h.delta > 0 ? 'entrada' : 'salida';
        const typeBadge = h.delta > 0 ? 'badge-success' : 'badge-danger';
        const typeIcon = h.delta > 0 ? '⬆️' : '⬇️';
        const deltaClass = h.delta > 0 ? 'stock-delta-positive' : 'stock-delta-negative';
        return `
          <tr>
            <td data-label="Fecha/hora"><span class="small" style="white-space:nowrap;">${h.time}</span></td>
            <td data-label="Producto"><span>${esc(h.name)}</span></td>
            <td data-label="Tipo"><span class="badge ${typeBadge}">${typeIcon} ${type}</span></td>
            <td data-label="Cantidad"><span class="bold tabular-nums ${deltaClass}">${h.delta > 0 ? '+' : ''}${h.delta}</span></td>
            <td data-label="Stock resultante"><span class="tabular-nums">${h.newVal}</span></td>
          </tr>
        `;
      }).join('')}
    `).join('');
  };

  const tbody = $('#stockHistoryRows', el);
  tbody.innerHTML = Array.from({ length: 5 }, () => `
    <tr>
      <td><div class="skeleton" style="width:90px;height:14px"></div></td>
      <td><div class="skeleton" style="width:120px;height:16px"></div></td>
      <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
      <td><div class="skeleton" style="width:60px;height:16px"></div></td>
    </tr>
  `).join('');
  setTimeout(renderRows, 350);
}
