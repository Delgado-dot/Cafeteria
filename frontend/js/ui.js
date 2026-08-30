/* ============================================================
   ui.js — Helpers de UI: render, modal, drawer, toast, estado
   Cafetería INTESUD · Sistema de diseño v2
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const money = (v) => '$' + Number(v).toFixed(2);

function toast(msg, type = 'info') {
  const wrap = $('.toast-wrap') || (() => {
    const d = document.createElement('div');
    d.className = 'toast-wrap';
    document.body.appendChild(d);
    return d;
  })();
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  el.innerHTML = `<span class="t-ico">${icons[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 2800);
}
window.toast = toast;

/* ---------- Modal ---------- */
function modal(html, { wide = false, title = '', sub = '' } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal${wide ? ' wide' : ''}">
      ${title ? `<div class="modal-header"><div><div class="modal-title">${title}</div>${sub ? `<div class="modal-sub">${sub}</div>` : ''}</div><button class="modal-close" data-mclose title="Cerrar">×</button></div>` : ''}
      <div class="modal-body">${html}</div>
    </div>`;
  const close = () => {
    document.removeEventListener('keydown', handleEscape);
    overlay.remove();
  };
  const handleEscape = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', handleEscape);
  $('[data-mclose]', overlay)?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  return overlay;
}
window.modal = modal;
window.closeModal = () => { const o = $('.modal-overlay'); if (o) o.remove(); };

function confirmDialog(title, message, okLabel = 'Confirmar', danger = false) {
  return new Promise((resolve) => {
    const overlay = modal(`
      <div class="alert neutral" style="margin-bottom:18px"><span class="a-ico">ℹ️</span><div>${esc(message)}</div></div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-neutral" data-cancel>Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okLabel)}</button>
      </div>`, { title });
    $('[data-cancel]', overlay).onclick = () => { overlay.remove(); resolve(false); };
    $('[data-ok]', overlay).onclick = () => { overlay.remove(); resolve(true); };
  });
}
window.confirmDialog = confirmDialog;

/* ---------- Drawer (panel lateral) ---------- */
function drawer(html, { title = '', bodyOnly = false, footer = '' } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.innerHTML = `
    <div class="drawer">
      ${bodyOnly ? '' : `<div class="drawer-header"><h3 style="font-size:var(--fs-lg)">${title || ''}</h3><button class="modal-close" data-dclose title="Cerrar">×</button></div>`}
      <div class="drawer-body">${html}</div>
      ${footer ? `<div class="drawer-footer">${footer}</div>` : ''}
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('[data-dclose]', overlay)?.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
  return { overlay, body: $('.drawer-body', overlay), close: () => overlay.remove() };
}
window.drawer = drawer;

function showLoadingInto(el, message = 'Cargando...') {
  el.innerHTML = `<div class="loading-state"><div class="spinner"></div><p class="muted">${esc(message)}</p></div>`;
}
window.showLoadingInto = showLoadingInto;

function emptyState(icon, title, text) {
  return `<div class="empty-state"><div class="es-ico">${icon}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}
window.emptyState = emptyState;

/* ---------- Estado de pedido chip ---------- */
function statusMeta(status) {
  const map = {
    queue: { label: 'En cola', cls: 'badge badge-warning' },
    confirmed: { label: 'Confirmado', cls: 'badge badge-info' },
    prep: { label: 'En preparación', cls: 'badge badge-warning' },
    ready: { label: 'Listo', cls: 'badge badge-success' },
    delivered: { label: 'Entregado', cls: 'badge badge-success' },
    cancelled: { label: 'Cancelado', cls: 'badge badge-danger' },
    nopickup: { label: 'No retirado', cls: 'badge badge-danger' },
    refunded: { label: 'Reembolsado', cls: 'badge badge-info' },
  };
  const m = map[status] || map.queue;
  return `<span class="${m.cls}"><span class="dot"></span>${m.label}</span>`;
}
window.statusMeta = statusMeta;

function paymentMeta(ps) {
  const map = {
    pending: { label: 'Pendiente', cls: 'badge badge-warning' },
    review: { label: 'En revisión', cls: 'badge badge-info' },
    approved: { label: 'Aprobado', cls: 'badge badge-success' },
    paid: { label: 'Pagado', cls: 'badge badge-success' },
    rejected: { label: 'Rechazado', cls: 'badge badge-danger' },
    refunded: { label: 'Reembolso', cls: 'badge badge-info' },
  };
  const m = map[ps] || map.pending;
  return `<span class="${m.cls}">${m.label}</span>`;
}
window.paymentMeta = paymentMeta;

function deliveryMeta(o) {
  if (o.delivery === 'delivery') {
    return `Delivery interno · Piso ${o.deliveryInfo?.piso} · Aula ${o.deliveryInfo?.aula || '—'}`;
  }
  return 'Retiro en cafetería';
}
window.deliveryMeta = deliveryMeta;

function paymentMethodLabel(m) {
  return ({ deuna: 'DEUNA', transferencia: 'Transferencia', efectivo: 'Efectivo' }[m] || m);
}
window.paymentMethodLabel = paymentMethodLabel;

/* Categoría icono por categoría */
function catIcon(cat) {
  if (cat === 'Hamburguesas') return '🍔';
  if (cat === 'Hot Dogs') return '🌭';
  if (cat === 'Sándwiches') return '🥪';
  if (cat === 'Papas y Salchipapas') return '🍟';
  if (cat === 'Bebidas') return '🥤';
  if (cat === 'Snacks') return '🍿';
  return '🍽️';
}
window.catIcon = catIcon;

function productIcon(p) {
  return p.emoji || catIcon(p.category);
}
window.productIcon = productIcon;

function fmtTime(t) { return t; }
window.fmtTime = fmtTime;
