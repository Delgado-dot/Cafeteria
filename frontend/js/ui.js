/* ============================================================
   ui.js — Helpers de UI: render, modal, drawer, toast, estado
   Cafetería INTESUD · Sistema de diseño v2
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const money = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/* ---------- Iconografía profesional (SVG consistente, sin emojis) ---------- */
const ICONS = {
  search: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20L16.5 16.5"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6H5L4 2H1"/><path d="M6 6L8 13H19L21 6H6Z"/><circle cx="9" cy="19" r="1.8"/><circle cx="18" cy="19" r="1.8"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 17C16 14.8 13.9 13 11 13C8.1 13 6 14.8 6 17"/><circle cx="11" cy="8" r="3.2"/></svg>`,
  home: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10L11 3L19 10V20H14V14H10V20H3V10Z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6H20"/><path d="M4 12H20"/><path d="M4 18H20"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3H17L19 7V20C19 20.6 18.6 21 18 21H6C5.4 21 5 20.6 5 20V7L7 3Z"/><path d="M9 9H15"/><path d="M9 13H15"/><path d="M9 17H12"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 18.5C6.8 15.8 9.2 14 12 14C14.8 14 17.2 15.8 18.5 18.5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7V12L15 14"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7H18L17 20H7L6 7Z"/><path d="M9 7C9 5.3 10.3 4 12 4C13.7 4 15 5.3 15 7"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8H16C17.1 8 18 8.9 18 10V13C18 15.2 16.2 17 14 17H6C4.9 17 4 16.1 4 15V8Z"/><path d="M18 10H19C20.1 10 21 10.9 21 12C21 13.1 20.1 14 19 14H18"/><path d="M6 4V8"/><path d="M10 4V8"/><path d="M14 4V8"/></svg>`,
  burger: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10H20"/><path d="M5 10C5 7.2 7.2 5 10 5H14C16.8 5 19 7.2 19 10"/><path d="M4 14H20C20 16.2 18.2 18 16 18H8C5.8 18 4 16.2 4 14Z"/><path d="M4 10V14"/><path d="M20 10V14"/></svg>`,
  hotdog: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12C5 9 7 7 12 7C17 7 19 9 19 12C19 15 17 17 12 17C7 17 5 15 5 12Z"/><path d="M5 12H19"/><path d="M7 9L8.5 12L7 15"/><path d="M17 9L15.5 12L17 15"/></svg>`,
  sandwich: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8L12 4L20 8V14L12 18L4 14V8Z"/><path d="M4 12H20"/></svg>`,
  fries: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20L8 10L9 20"/><path d="M11 20L12 9L13 20"/><path d="M15 20L16 10L17 20"/><path d="M6 20H18"/></svg>`,
  drink: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4H17L16 14H8L7 4Z"/><path d="M11 14V20"/><path d="M8 20H16"/></svg>`,
  snack: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="11" r="6"/><path d="M9 15C9 15 10.2 16.5 12 16.5C13.8 16.5 15 15 15 15"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15C6 15 4 16 4 13C4 8 7 5 12 5C17 5 20 8 20 13C20 16 18 15 18 15L17 17H7L6 15Z"/><path d="M10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6L15 12L9 18"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5V19"/><path d="M5 12H19"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12H19"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6L18 18"/><path d="M18 6L6 18"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12L10 17L19 8"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7V12"/><path d="M12 16H12.01"/><path d="M2.5 18L11.2 4.5C11.6 3.8 12.4 3.8 12.8 4.5L21.5 18C21.9 18.7 21.4 19.5 20.6 19.5H3.4C2.6 19.5 2.1 18.7 2.5 18Z"/></svg>`,
};
function svgIcon(name, cls='') {
  const raw = ICONS[name] || ICONS.bag;
  if (!cls) return raw;
  return raw.replace('<svg', `<svg class="${cls}"`);
}
window.svgIcon = svgIcon;
function catSvg(cat) {
  const map = {
    'Hamburguesas': 'burger',
    'Hot Dogs': 'hotdog',
    'Sándwiches': 'sandwich',
    'Papas y Salchipapas': 'fries',
    'Bebidas': 'drink',
    'Snacks': 'snack',
  };
  return map[cat] || 'bag';
}
window.catSvg = catSvg;
