/* ============================================================
   admin/helpers.js — Helpers compartidos del panel de la
   Administradora del Bar (adminbar).
   ============================================================ */

// Mapeo de presentación de estados de pago (solo label + color, sin tocar valores internos)
const paymentStatusLabels = {
  pending: { label: 'Pendiente', cls: 'badge-warning' },
  review: { label: 'En revisión', cls: 'badge-info' },
  approved: { label: 'Aprobado', cls: 'badge-success' },
  paid: { label: 'Pagado', cls: 'badge-success' },
  rejected: { label: 'Rechazado', cls: 'badge-danger' },
  refunded: { label: 'Reembolsado', cls: 'badge-neutral' },
};

// Criterio único para "Por cobrar" — usado en Dashboard y Pagos para evitar desincronización
function isPendingPayment(order) {
  return order.paymentStatus === 'pending' && ['queue', 'confirmed', 'prep', 'ready'].includes(order.status);
}
function getPendingPayments(orders = Store.orders) {
  return orders.filter(isPendingPayment);
}

function isValidSale(order) {
  return ['approved', 'paid'].includes(order.paymentStatus);
}

function paymentMethodIcon(method) {
  return ({ deuna: 'bx-mobile-alt', transferencia: 'bx-transfer-alt', efectivo: 'bx-money' }[method] || 'bx-credit-card');
}

function stockBadge(p) {
  if (p.stock === 0) return '<span class="badge badge-danger">AGOTADO</span>';
  if (p.stock <= p.minStock) return `<span class="badge badge-warning">${p.stock} · bajo</span>`;
  return `<span class="badge badge-success">${p.stock}</span>`;
}

function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// Helper for config-status toggle - defined globally for onclick handlers
function confirmToggleState(toOpen, btn) {
  const msg = toOpen ? '¿Seguro que quieres abrir la cafetería?' : '¿Seguro que quieres cerrar la cafetería?';
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2.5px;margin-right:8px"></span>Procesando...';

  confirmDialog(msg, msg, 'Confirmar', false).then((ok) => {
    if (!ok) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    setTimeout(() => {
      const cfg = Store.config;
      cfg.cafeOpen = toOpen;
      Store.config = cfg;
      logAudit('Cambió estado de la cafetería', toOpen ? 'Abierta' : 'Cerrada');
      toast('La cafetería está ' + (toOpen ? 'ABIERTA' : 'CERRADA') + '.', toOpen ? 'success' : 'warning');

      btn.innerHTML = '<i class="bx bx-check" style="margin-right:6px"></i>' + (toOpen ? 'Abierta' : 'Cerrada');
      btn.classList.add('btn-success');
      btn.classList.remove('btn-primary', 'btn-secondary');

      setTimeout(() => {
        renderBarAdmin('config-status');
      }, 600);
    }, 500);
  });
}
window.confirmToggleState = confirmToggleState;

// Funciones comunes de renderizado de estilos del adminbar
function ensureAdminbarPresentationStyles() {
  if (document.getElementById('adminbar-presentation')) return;
  const style = document.createElement('style');
  style.id = 'adminbar-presentation';
  style.textContent = `
    @keyframes adminbarEnter {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes adminbarBadgePop {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes adminbarModalIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .sales-summary-grid .sales-summary-card { animation: adminbarEnter var(--t-slow) both; }
    .sales-summary-grid .sales-summary-card:nth-child(2) { animation-delay: 70ms; }
    .sales-summary-grid .sales-summary-card:nth-child(3) { animation-delay: 140ms; }
    .sales-summary-grid .sales-summary-card:nth-child(4) { animation-delay: 210ms; }

    .grid-3 .stat-card { animation: adminbarEnter var(--t-slow) both; }
    .grid-3 .stat-card:nth-child(2) { animation-delay: 70ms; }
    .grid-3 .stat-card:nth-child(3) { animation-delay: 140ms; }

    .admin-table tbody tr { animation: adminbarEnter var(--t-med) both; }
    .admin-table tbody tr:nth-child(1)  { animation-delay: 10ms; }
    .admin-table tbody tr:nth-child(2)  { animation-delay: 25ms; }
    .admin-table tbody tr:nth-child(3)  { animation-delay: 40ms; }
    .admin-table tbody tr:nth-child(4)  { animation-delay: 55ms; }
    .admin-table tbody tr:nth-child(5)  { animation-delay: 70ms; }
    .admin-table tbody tr:nth-child(6)  { animation-delay: 85ms; }
    .admin-table tbody tr:nth-child(7)  { animation-delay: 100ms; }
    .admin-table tbody tr:nth-child(8)  { animation-delay: 115ms; }
    .admin-table tbody tr:nth-child(9)  { animation-delay: 130ms; }
    .admin-table tbody tr:nth-child(10) { animation-delay: 145ms; }
    .admin-table tbody tr:nth-child(11) { animation-delay: 160ms; }
    .admin-table tbody tr:nth-child(12) { animation-delay: 175ms; }
    .admin-table tbody tr:nth-child(13) { animation-delay: 190ms; }
    .admin-table tbody tr:nth-child(14) { animation-delay: 205ms; }
    .admin-table tbody tr:nth-child(15) { animation-delay: 220ms; }
    .admin-table tbody tr:nth-child(16) { animation-delay: 235ms; }
    .admin-table tbody tr:nth-child(17) { animation-delay: 250ms; }
    .admin-table tbody tr:nth-child(18) { animation-delay: 265ms; }
    .admin-table tbody tr:nth-child(19) { animation-delay: 280ms; }
    .admin-table tbody tr:nth-child(20) { animation-delay: 295ms; }

    .admin-table .badge,
    .sales-summary-grid .badge,
    .queue-order .badge,
    .stat-card .badge { animation: adminbarBadgePop var(--t-fast) both; }

    .modal-overlay .modal { animation: adminbarModalIn var(--t-med) both; }

    @media (prefers-reduced-motion: reduce) {
      .sales-summary-grid .sales-summary-card,
      .grid-3 .stat-card,
      .admin-table tbody tr,
      .admin-table .badge,
      .sales-summary-grid .badge,
      .queue-order .badge,
      .stat-card .badge,
      .modal-overlay .modal { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

function animateSalesMetrics(el) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const duration = 800;
  $$('[data-sales-count]', el).forEach((metric) => {
    const target = Number(metric.dataset.salesCount);
    const format = metric.dataset.salesFormat;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = target * (1 - Math.pow(1 - progress, 3));
      metric.textContent = format === 'money' ? money(value) : String(Math.round(value));
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}
