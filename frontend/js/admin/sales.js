/* ============================================================
   admin/sales.js — Ventas de la Administradora del Bar
   ============================================================ */

function barSalesDashboard(el) {
  ensureAdminbarPresentationStyles();
  const orders = Store.orders;
  const today = new Date().toISOString().slice(0, 10);
  const validSales = orders.filter(isValidSale);
  const todayOrders = validSales.filter((o) => o.date === today);
  const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const countToday = todayOrders.length;
  const currentMonth = today.slice(0, 7);
  const salesMonth = validSales.filter((o) => o.date.startsWith(currentMonth)).reduce((s, o) => s + o.total, 0);

  const prodSales = {};
  validSales.forEach((o) => o.items.forEach((i) => { prodSales[i.productId] = (prodSales[i.productId] || 0) + i.qty; }));
  const topProducts = Object.entries(prodSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, qty]) => ({ product: Store.products.find((p) => p.id === id), qty }))
    .filter((p) => p.product);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const total = validSales.filter((o) => o.date === date).reduce((sum, o) => sum + o.total, 0);
    days.push({ label: d.toLocaleDateString('es-EC', { weekday: 'short' }), total });
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  const currentMonthStart = new Date(today.slice(0, 7) + '-01');
  const prevMonthEnd = new Date(currentMonthStart);
  prevMonthEnd.setDate(0);
  const prevMonthStr = prevMonthEnd.toISOString().slice(0, 7);
  const salesPrevMonth = validSales.filter((o) => o.date.startsWith(prevMonthStr)).reduce((s, o) => s + o.total, 0);
  const momChange = salesPrevMonth > 0 ? ((salesMonth - salesPrevMonth) / salesPrevMonth) * 100 : (salesMonth > 0 ? 100 : 0);
  const momPositive = momChange >= 0;
  const momAbsChange = Math.abs(momChange);

  let microMsg = '';
  if (validSales.length >= 3 && days.length === 7) {
    const avgWeek = days.reduce((s, d) => s + d.total, 0) / 7;
    const bestDay = [...days].sort((a, b) => b.total - a.total)[0];
    if (avgWeek > 0 && salesToday > avgWeek * 1.1) {
      microMsg = `Hoy vas mejor que el promedio de la semana ✨`;
    } else if (bestDay && bestDay.total > 0 && bestDay.total > avgWeek * 1.2) {
      microMsg = `Tu día más fuerte esta semana fue ${esc(bestDay.label)} con ${money(bestDay.total)}`;
    } else if (avgWeek > 0 && salesToday > 0) {
      microMsg = `Promedio semanal: ${money(avgWeek)} — hoy llevas ${money(salesToday)}`;
    }
  }

  el.innerHTML = `
    <div class="page-title"><h1><span class="ico bx bx-line-chart"></span> Ventas</h1></div>
    ${microMsg ? `<div class="status-banner info"><span class="ico"><i class="bx bx-trending-up"></i></span><div>${microMsg}</div></div>` : ''}
<div class="grid grid-4 sales-summary-grid" style="margin-bottom:24px">
      <div class="stat-card success-card sales-summary-card"><span class="stat-ico bx bx-dollar success"></span><div class="st-label">Ventas del día</div><div class="st-value" data-sales-count="${salesToday}" data-sales-format="money">${money(0)}</div></div>
      <div class="stat-card sales-summary-card"><span class="stat-ico bx bx-receipt muted"></span><div class="st-label">Ticket promedio</div><div class="st-value" ${countToday > 0 ? `data-sales-count="${salesToday / countToday}" data-sales-format="money"` : ''}>${countToday > 0 ? money(0) : '—'}</div></div>
      <div class="stat-card sales-summary-card"><span class="stat-ico bx bx-cart primary"></span><div class="st-label">Número de ventas</div><div class="st-value primary" data-sales-count="${countToday}" data-sales-format="number">0</div></div>
      <div class="stat-card sales-summary-card"><span class="stat-ico bx bx-calendar muted"></span><div class="st-label">Total del mes</div><div class="st-value" data-sales-count="${salesMonth}" data-sales-format="money">${money(0)}</div></div>
    </div>

<div class="grid grid-2" style="margin-bottom:24px;align-items:stretch">
      <div class="card mom-performance-card" style="display:flex;flex-direction:column;min-height:360px"><h3 style="margin-bottom:16px">Rendimiento del mes</h3><div id="momDonutChart" class="mom-donut-chart" style="flex:1;display:flex;align-items:center;justify-content:center"></div></div>

  <div class="card" style="display:flex;flex-direction:column;min-height:360px">
    <h3 style="margin-bottom:16px">Ventas por día (últimos 7 días)</h3>
    <div id="salesLineChart" class="sales-line-chart" style="flex:1;display:flex;align-items:center;justify-content:center"></div>
  </div>
</div>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:16px">Ventas por hora (hoy)</h3>
      <div id="salesHourChart" style="display:flex;align-items:flex-end;gap:8px;height:160px;padding:12px 8px 0;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)"></div>
      <div class="tiny muted" style="margin-top:8px;text-align:center">Agrupado por franja horaria del día actual</div>
    </div>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:16px">Productos más vendidos</h3>
      ${topProducts.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
          ${topProducts.map(({ product, qty }) => `
            <div class="stat-card" style="padding:16px;text-align:center">
              <div style="font-size:2.5rem;margin-bottom:8px">${product.emoji || productIcon(product)}</div>
              <div class="bold" style="font-size:var(--fs-sm);margin-bottom:4px">${esc(product.name)}</div>
              <div class="stat-value primary tabular-nums" style="font-size:1.5rem">${qty}</div>
              <div class="tiny muted">unidades</div>
            </div>
          `).join('')}
        </div>` : `<div style="text-align:center;padding:24px 12px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-bar-chart-alt-2"></i></div><div style="font-weight:600">Aún no hay ventas registradas</div><div class="tiny muted" style="margin-top:4px">Cuando haya movimiento, verás aquí tus productos estrella</div></div>`}
    </div>
  `;
  animateSalesMetrics(el);
  renderSalesLineChart(el, days);
  renderMomDonutChart(el, momChange, momAbsChange, momPositive, salesMonth, salesPrevMonth);
  renderSalesHourChart(el, todayOrders);
}

function renderSalesLineChart(el, days) {
  const container = $('#salesLineChart', el);
  if (!container) return;
  const totals = days.map((d) => d.total);
  const maxVal = Math.max(...totals, 1);
  const minVal = Math.min(...totals, 0);
  const range = maxVal - minVal || 1;
  const padding = { top: 24, right: 16, bottom: 36, left: 56 };
  const width = container.clientWidth || 600;
  const height = 220;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (i) => padding.left + (i / (days.length - 1)) * innerW;
  const y = (val) => padding.top + innerH * (1 - (val - minVal) / range);

  const points = days.map((d, i) => `${x(i)},${y(d.total)}`).join(' ');
  const areaPoints = `${padding.left},${padding.top + innerH} ${points} ${padding.left + innerW},${padding.top + innerH}`;

  const pathLen = 1000;

  container.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sales-chart-svg" role="img" aria-label="Gráfico de ventas de los últimos 7 días">
      <defs>
        <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#40807E" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#40807E" stop-opacity="0.02"/>
        </linearGradient>
        <linearGradient id="salesLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#40807E"/>
          <stop offset="100%" stop-color="#2f605e"/>
        </linearGradient>
      </defs>
      <g class="chart-grid" stroke="var(--border)" stroke-width="0.5">
        ${[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = padding.top + innerH * f;
          const gv = maxVal - range * f;
          return `<line x1="${padding.left}" y1="${gy}" x2="${padding.left + innerW}" y2="${gy}"/><text x="${padding.left - 8}" y="${gy + 4}" text-anchor="end" font-size="10" fill="var(--text-3)">${money(gv)}</text>`;
        }).join('')}
      </g>
      <polygon class="sales-area" points="${areaPoints}" fill="url(#salesAreaGrad)"/>
      <polyline class="sales-line" points="${points}" fill="none" stroke="url(#salesLineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:${pathLen}; stroke-dashoffset:${pathLen};"/>
      <g class="sales-points">
        ${days.map((d, i) => `
          <g class="sales-point-group" data-index="${i}" style="cursor:pointer">
            <circle class="sales-point" cx="${x(i)}" cy="${y(d.total)}" r="5" fill="var(--surface)" stroke="#40807E" stroke-width="2.5"/>
            <title>${d.label}: ${money(d.total)}</title>
            <text class="sales-tooltip" x="${x(i)}" y="${y(d.total) - 18}" text-anchor="middle" font-size="11" fill="var(--text)" opacity="0" pointer-events="none" style="white-space:nowrap">${money(d.total)}</text>
          </g>
        `).join('')}
      </g>
      <g class="chart-x-labels" font-size="11" fill="var(--text-3)" text-anchor="middle">
        ${days.map((d, i) => `<text x="${x(i)}" y="${height - 6}">${d.label}</text>`).join('')}
      </g>
    </svg>`;

  requestAnimationFrame(() => {
    const line = container.querySelector('.sales-line');
    if (line) {
      line.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
      line.style.strokeDashoffset = '0';
    }
  });

  container.querySelectorAll('.sales-point-group').forEach((g) => {
    g.addEventListener('mouseenter', () => {
      const tooltip = g.querySelector('.sales-tooltip');
      const point = g.querySelector('.sales-point');
      if (tooltip) tooltip.style.opacity = '1';
      if (point) point.setAttribute('r', '7');
    });
    g.addEventListener('mouseleave', () => {
      const tooltip = g.querySelector('.sales-tooltip');
      const point = g.querySelector('.sales-point');
      if (tooltip) tooltip.style.opacity = '0';
      if (point) point.setAttribute('r', '5');
    });
  });
}

function renderSalesHourChart(el, todayOrders) {
  const container = $('#salesHourChart', el);
  if (!container) return;
  const hours = [7,9,11,13,15,17,19];
  const totals = hours.map((h) => {
    return todayOrders.filter((o) => {
      const hour = parseInt((o.time || '0:0').split(':')[0], 10);
      return hour >= h && hour < h + 2;
    }).reduce((s, o) => s + o.total, 0);
  });
  const max = Math.max(...totals, 1);
  container.innerHTML = hours.map((h, i) => {
    const val = totals[i];
    const pct = (val / max) * 100;
    const height = Math.max(8, pct);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="font-size:10px;color:var(--text-3);font-weight:600">${money(val)}</div>
      <div style="width:100%;height:100px;background:var(--surface-3);border-radius:6px 6px 0 0;overflow:hidden;display:flex;align-items:flex-end">
        <div style="width:100%;height:${height}%;background:linear-gradient(180deg,var(--primary),var(--primary-hover));border-radius:6px 6px 0 0;transition:height 0.6s ease;min-height:${val ? '4px' : '0'}"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-2)">${h}h</div>
    </div>`;
  }).join('');
}

function renderMomDonutChart(el, momChange, momAbsChange, momPositive, salesMonth, salesPrevMonth) {
  const container = $('#momDonutChart', el);
  if (!container) return;
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(momAbsChange, 200) / 200;
  const dashOffset = circumference * (1 - progress);
  const color = momPositive ? '#22a06b' : '#e09a16';
  const arrowColor = momPositive ? 'var(--success)' : 'var(--warning)';
  const sign = momPositive ? '+' : '';
  const prevMonthLabel = salesPrevMonth > 0 ? money(salesPrevMonth) : '—';

  container.innerHTML = `
    <div class="mom-donut-wrap" style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="mom-donut-svg" role="img" aria-label="Rendimiento del mes">
        <defs>
          <linearGradient id="momGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${momPositive ? '#178a5a' : '#c07d08'}"/>
          </linearGradient>
        </defs>
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="var(--surface-3)" stroke-width="${strokeWidth}"/>
        <circle class="mom-ring" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="url(#momGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})" style="stroke-dasharray:${circumference}; stroke-dashoffset:${circumference};"/>
      </svg>
      <div class="mom-donut-center" style="text-align:center">
        <div style="font-size:2.2rem;font-weight:var(--fw-extrabold);color:${arrowColor};line-height:1.1"><span style="font-size:1.6rem">${sign}${momAbsChange.toFixed(1)}%</span></div>
        <div class="tiny muted" style="margin-top:4px">Rendimiento del mes</div>
        <div class="tiny muted" style="margin-top:2px">${money(salesMonth)} este mes</div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const ring = container.querySelector('.mom-ring');
    if (ring) {
      ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)';
      ring.style.strokeDashoffset = String(dashOffset);
    }
  });
}

function barSalesHistory(el) {
  const orders = Store.orders;
  const tbody = $('#salesHistoryRows');
  if (!tbody) {
    el.innerHTML = `
      <div class="page-title"><h1><span class="ico bx bx-history"></span> Historial de ventas</h1></div>
      <div class="table-wrap"><table class="admin-table">
        <thead><tr><th>Fecha/hora</th><th>Número pedido</th><th>Monto</th><th>Método pago</th><th>Estado</th></tr></thead>
        <tbody id="salesHistoryRows"></tbody></table></div>
    `;
  } else {
    tbody.innerHTML = '';
  }

  const renderSkeletonRows = (count = 5) => {
    const tbodyEl = $('#salesHistoryRows', el);
    if (tbodyEl) {
      tbodyEl.innerHTML = Array.from({ length: count }, () => `
        <tr>
          <td><div class="skeleton" style="width:90px;height:14px"></div></td>
          <td><div class="skeleton" style="width:60px;height:16px"></div></td>
          <td><div class="skeleton" style="width:70px;height:16px"></div></td>
          <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
          <td><div class="skeleton" style="width:80px;height:24px;border-radius:var(--r-pill)"></div></td>
        </tr>
      `).join('');
    }
  };

  const renderRows = () => {
    const tbodyEl = $('#salesHistoryRows', el);
    if (!tbodyEl) return;
    const validSales = orders.filter(isValidSale).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    tbodyEl.innerHTML = validSales.length ? validSales.map((o) => `
      <tr><td data-label="Fecha/hora"><span class="small">${o.date} ${o.time || '—'}</span></td><td data-label="Pedido"><span class="bold">#${o.id}</span></td><td data-label="Monto"><span class="bold tabular-nums">${money(o.total)}</span></td><td data-label="Método pago"><span>${paymentMethodLabel(o.payment)}</span></td><td data-label="Estado">${statusMeta(o.status)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:28px 20px"><div style="font-size:2rem;color:var(--primary);margin-bottom:8px"><i class="bx bx-history"></i></div><div style="font-weight:600">Aún no hay historial de ventas</div><div class="tiny muted" style="margin-top:4px">Tus ventas aparecerán aquí con mucho corazón</div></td></tr>';
  };

  renderSkeletonRows();
  setTimeout(renderRows, 350);
}

function barSalesTabs(el, initialTab) {
  renderAdminTabs(el, [
    { id: 'summary', label: 'Resumen', render: barSalesDashboard },
    { id: 'history', label: 'Historial', render: barSalesHistory },
  ], initialTab);
}
