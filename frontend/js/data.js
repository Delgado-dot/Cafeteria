/* ============================================================
   data.js — Datos simulados iniciales del sistema (no backend)
   ============================================================ */

const CATEGORIES = ['Hamburguesas', 'Hot Dogs', 'Sándwiches', 'Papas y Salchipapas', 'Bebidas', 'Snacks'];

const DEFAULT_PRODUCTS = [
  { id: 'p01', name: 'Hamburguesa Clásica', emoji: '🍔', image: '', category: 'Hamburguesas', price: 3.50, stock: 10, minStock: 3, prepMin: 8, available: true, desc: 'Pan, carne, queso, lechuga, tomate y salsas. Jugosa y económica.', addedAt: '2025-01-05' },
  { id: 'p02', name: 'Hamburguesa Especial', emoji: '🍔', image: '', category: 'Hamburguesas', price: 4.50, stock: 8, minStock: 3, prepMin: 10, available: true, desc: 'Doble carne, tocineta, queso derretido, aros de cebolla y salsa de la casa.', addedAt: '2025-01-05' },
  { id: 'p03', name: 'Hamburguesa de Pollo', emoji: '🍗', image: '', category: 'Hamburguesas', price: 4.00, stock: 6, minStock: 2, prepMin: 9, available: true, desc: 'Pechuga de pollo empanizada, lechuga, tomate y mayonesa.', addedAt: '2025-01-12' },
  { id: 'p04', name: 'Hot Dog Clásico', emoji: '🌭', image: '', category: 'Hot Dogs', price: 2.00, stock: 12, minStock: 4, prepMin: 4, available: true, desc: 'Salchicha, pan, cebolla, papitas y salsas a elección.', addedAt: '2025-01-05' },
  { id: 'p05', name: 'Hot Dog Especial', emoji: '🌭', image: '', category: 'Hot Dogs', price: 2.75, stock: 5, minStock: 2, prepMin: 6, available: true, desc: 'Con tocineta, queso y salsas. El favorito de los viernes.', addedAt: '2025-01-20' },
  { id: 'p06', name: 'Sándwich de Jamón y Queso', emoji: '🥪', image: '', category: 'Sándwiches', price: 2.50, stock: 9, minStock: 3, prepMin: 5, available: true, desc: 'Pan, jamón, queso, lechuga y tomate.', addedAt: '2025-01-05' },
  { id: 'p07', name: 'Sándwich Mixto', emoji: '🥪', image: '', category: 'Sándwiches', price: 2.80, stock: 0, minStock: 2, prepMin: 6, available: true, desc: 'Jamón, quesillo y huevo. Rápido y completo.', addedAt: '2025-02-01' },
  { id: 'p08', name: 'Salchipapa Pequeña', emoji: '🍟', image: '', category: 'Papas y Salchipapas', price: 2.50, stock: 10, minStock: 3, prepMin: 7, available: true, desc: 'Papas fritas con salchicha, salsas y mayonesa.', addedAt: '2025-01-05' },
  { id: 'p09', name: 'Salchipapa Grande', emoji: '🍟', image: '', category: 'Papas y Salchipapas', price: 3.50, stock: 7, minStock: 2, prepMin: 9, available: true, desc: 'Porción grande para compartir.', addedAt: '2025-01-05' },
  { id: 'p10', name: 'Papas Fritas', emoji: '🍿', image: '', category: 'Papas y Salchipapas', price: 1.75, stock: 4, minStock: 3, prepMin: 5, available: true, desc: 'Porción de papas fritas con sal y salsas.', addedAt: '2025-01-05' },
  { id: 'p11', name: 'Jugo Natural', emoji: '🧃', image: '', category: 'Bebidas', price: 1.50, stock: 15, minStock: 5, prepMin: 2, available: true, desc: 'Naranja, mora, piña o maracuyá.', addedAt: '2025-01-05' },
  { id: 'p12', name: 'Gaseosa 350ml', emoji: '🥤', image: '', category: 'Bebidas', price: 1.00, stock: 20, minStock: 6, prepMin: 1, available: true, desc: 'Bebida gaseosa fría.', addedAt: '2025-01-05' },
  { id: 'p13', name: 'Agua 600ml', emoji: '💧', image: '', category: 'Bebidas', price: 0.80, stock: 2, minStock: 5, prepMin: 1, available: true, desc: 'Agua natural.', addedAt: '2025-01-05' },
  { id: 'p14', name: 'Café', emoji: '☕', image: '', category: 'Bebidas', price: 1.20, stock: 25, minStock: 8, prepMin: 2, available: true, desc: 'Café americano o con leche.', addedAt: '2025-01-05' },
  { id: 'p15', name: 'Chocolate Caliente', emoji: '🍫', image: '', category: 'Bebidas', price: 1.40, stock: 12, minStock: 4, prepMin: 3, available: true, desc: 'Bebida caliente de chocolate.', addedAt: '2025-02-10' },
  { id: 'p16', name: 'Nachos con Queso', emoji: '🧀', image: '', category: 'Snacks', price: 2.20, stock: 8, minStock: 3, prepMin: 6, available: true, desc: 'Totopos con queso derretido.', addedAt: '2025-01-05' },
  { id: 'p17', name: 'Galletas', emoji: '🍪', image: '', category: 'Snacks', price: 0.75, stock: 30, minStock: 10, prepMin: 1, available: true, desc: 'Paquete de galletas surtidas.', addedAt: '2025-01-05' },
  { id: 'p18', name: 'Empanada', emoji: '🥟', image: '', category: 'Snacks', price: 1.25, stock: 0, minStock: 5, prepMin: 4, available: true, desc: 'Empanada de carne o queso.', addedAt: '2025-02-15' },
];

function recentDt(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
}

const DEFAULT_USERS = [
  { id: 'u1', name: 'Estudiante Demo', email: 'usuario@intesud.edu.ec', username: 'usuario@intesud.edu.ec', role: 'user', cargo: 'Estudiante', aula: '2B', active: true, registeredAt: '2025-03-10', lastAccess: recentDt(0) },
  { id: 'u2', name: 'Administradora Bar', email: 'adminbar@intesud.edu.ec', username: 'adminbar@intesud.edu.ec', role: 'adminbar', cargo: 'Administradora de cafetería', active: true, registeredAt: '2025-01-05', lastAccess: recentDt(0) },
  { id: 'u3', name: 'Administrador Desarrollador', email: 'developer@system.local', username: 'developer@system.local', role: 'admindev', cargo: 'Administrador desarrollador', active: true, registeredAt: '2024-11-20', lastAccess: recentDt(0) },
  { id: 'u4', name: 'María Fernanda Torres', email: 'maria.torres@intesud.edu.ec', username: 'maria.torres', role: 'user', cargo: 'Estudiante', aula: '3C', active: true, registeredAt: '2025-02-14', lastAccess: recentDt(1) },
  { id: 'u5', name: 'Juan Pablo Ruiz', email: 'juan.ruiz@intesud.edu.ec', username: 'juan.ruiz', role: 'user', cargo: 'Estudiante', aula: '1A', active: true, registeredAt: '2025-02-18', lastAccess: recentDt(3) },
  { id: 'u6', name: 'Docente Demo', email: 'docente@intesud.edu.ec', username: 'docente.demo', role: 'user', cargo: 'Docente', aula: '—', active: false, registeredAt: '2025-04-01', lastAccess: recentDt(12) },
];

const PASSWORDS = {
  'usuario@intesud.edu.ec': 'estudiante123',
  'adminbar@intesud.edu.ec': 'adminbar123',
  'developer@system.local': 'developer123',
};

const DEFAULT_CONFIG = {
  orderOpen: '09:00',
  orderClose: '09:45',
  breakStart: '10:00',
  breakEnd: '10:15',
  capacity: 10,
  currentCapacity: 8,
  cafeOpen: true,
  deliveryEnabled: true,
  deliveryDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  deliveryMax: 4,
  deliveryCurrent: 2,
  timeRemainingMinutes: 78,
};

const DEFAULT_AUDIT = [
  { id: 'a1', user: 'Administradora Bar', action: 'Actualizó stock', target: 'Hamburguesa Clásica', time: '08:42' },
  { id: 'a2', user: 'Administrador Desarrollador', action: 'Modificó permisos', target: 'Administradora Bar', time: '08:50' },
  { id: 'a3', user: 'Estudiante Demo', action: 'Realizó pedido', target: 'PED-004', time: '09:05' },
  { id: 'a4', user: 'Administradora Bar', action: 'Cambió estado de pedido', target: 'PED-001 → Listo', time: '09:12' },
  { id: 'a5', user: 'Administrador Desarrollador', action: 'Actualizó configuración', target: 'Horario de pedidos', time: '09:30' },
];

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_ORDERS = [
  { id: 'PED-001', userEmail: 'maria.torres@intesud.edu.ec', userName: 'María Torres', date: daysAgo(0), time: '09:02', items: [{ productId: 'p01', qty: 2, name: 'Hamburguesa Clásica', price: 3.50 }], total: 7.00, status: 'queue', priority: 'normal', delivery: 'pickup', payment: 'deuna', paymentStatus: 'pending', prepMin: 8, eta: 'En cola', note: '' },
  { id: 'PED-002', userEmail: 'juan.ruiz@intesud.edu.ec', userName: 'Juan Ruiz', date: daysAgo(0), time: '09:05', items: [{ productId: 'p04', qty: 1, name: 'Hot Dog Clásico', price: 2.00 }, { productId: 'p12', qty: 1, name: 'Gaseosa 350ml', price: 1.00 }], total: 3.00, status: 'queue', priority: 'priority', delivery: 'delivery', deliveryInfo: { piso: '1', aula: '1A' }, payment: 'efectivo', paymentStatus: 'pending', prepMin: 4, eta: 'En cola', note: '' },
  { id: 'PED-003', userEmail: 'usuario@intesud.edu.ec', userName: 'Estudiante Demo', date: daysAgo(0), time: '09:07', items: [{ productId: 'p08', qty: 1, name: 'Salchipapa Pequeña', price: 2.50 }], total: 2.50, status: 'queue', priority: 'priority', delivery: 'pickup', payment: 'transferencia', paymentStatus: 'review', prepMin: 7, eta: 'En cola', note: 'Sin cebolla' },
  { id: 'PED-004', userEmail: 'usuario@intesud.edu.ec', userName: 'Estudiante Demo', date: daysAgo(0), time: '09:10', items: [{ productId: 'p02', qty: 1, name: 'Hamburguesa Especial', price: 4.50 }, { productId: 'p11', qty: 1, name: 'Jugo Natural', price: 1.50 }], total: 6.00, status: 'queue', priority: 'urgent', delivery: 'delivery', deliveryInfo: { piso: '2', aula: '2B' }, payment: 'deuna', paymentStatus: 'pending', prepMin: 10, eta: 'En cola', note: '' },
  { id: 'PED-005', userEmail: 'maria.torres@intesud.edu.ec', userName: 'María Torres', date: daysAgo(0), time: '08:50', items: [{ productId: 'p14', qty: 2, name: 'Café', price: 1.20 }], total: 2.40, status: 'prep', priority: 'normal', delivery: 'pickup', payment: 'efectivo', paymentStatus: 'paid', prepMin: 2, eta: 'En preparación', note: '' },
  { id: 'PED-006', userEmail: 'juan.ruiz@intesud.edu.ec', userName: 'Juan Ruiz', date: daysAgo(0), time: '08:52', items: [{ productId: 'p16', qty: 1, name: 'Nachos con Queso', price: 2.20 }], total: 2.20, status: 'ready', priority: 'normal', delivery: 'pickup', payment: 'deuna', paymentStatus: 'approved', prepMin: 6, eta: 'Listo', note: '' },
  { id: 'PED-007', userEmail: 'usuario@intesud.edu.ec', userName: 'Estudiante Demo', date: daysAgo(0), time: '08:45', items: [{ productId: 'p06', qty: 1, name: 'Sándwich de Jamón y Queso', price: 2.50 }], total: 2.50, status: 'delivered', priority: 'normal', delivery: 'pickup', payment: 'efectivo', paymentStatus: 'paid', prepMin: 5, eta: 'Entregado', note: '' },
  { id: 'PED-008', userEmail: 'maria.torres@intesud.edu.ec', userName: 'María Torres', date: daysAgo(1), items: [{ productId: 'p09', qty: 1, name: 'Salchipapa Grande', price: 3.50 }], total: 3.50, status: 'delivered', priority: 'normal', delivery: 'pickup', payment: 'transferencia', paymentStatus: 'approved', prepMin: 9, eta: 'Entregado', note: '' },
  { id: 'PED-009', userEmail: 'usuario@intesud.edu.ec', userName: 'Estudiante Demo', date: daysAgo(1), items: [{ productId: 'p01', qty: 1, name: 'Hamburguesa Clásica', price: 3.50 }, { productId: 'p12', qty: 2, name: 'Gaseosa 350ml', price: 1.00 }], total: 5.50, status: 'cancelled', priority: 'normal', delivery: 'pickup', payment: 'deuna', paymentStatus: 'refunded', prepMin: 8, eta: 'Cancelado', note: 'Cancelado por el usuario' },
  { id: 'PED-010', userEmail: 'juan.ruiz@intesud.edu.ec', userName: 'Juan Ruiz', date: daysAgo(2), items: [{ productId: 'p05', qty: 1, name: 'Hot Dog Especial', price: 2.75 }], total: 2.75, status: 'delivered', priority: 'normal', delivery: 'delivery', deliveryInfo: { piso: '1', aula: '1A' }, payment: 'efectivo', paymentStatus: 'paid', prepMin: 6, eta: 'Entregado', note: '' },
  { id: 'PED-011', userEmail: 'usuario@intesud.edu.ec', userName: 'Estudiante Demo', date: daysAgo(2), items: [{ productId: 'p10', qty: 1, name: 'Papas Fritas', price: 1.75 }], total: 1.75, status: 'nopickup', priority: 'normal', delivery: 'pickup', payment: 'transferencia', paymentStatus: 'refunded', prepMin: 5, eta: 'No retirado', note: '' },
];

const ROLE_LABELS = { user: 'Usuario institucional', adminbar: 'Administradora bar', admindev: 'Administrador desarrollador' };

const PERMISSION_MATRIX = [
  { fn: 'Inicio', user: '✓', adminbar: '✓', admindev: '✓' },
  { fn: 'Menú', user: '✓', adminbar: '✓', admindev: '✓' },
  { fn: 'Pedidos', user: '✓ propios', adminbar: '✓ todos', admindev: '—' },
  { fn: 'Productos', user: '—', adminbar: '✓', admindev: '—' },
  { fn: 'Stock', user: '—', adminbar: '✓', admindev: '—' },
  { fn: 'Ventas', user: '—', adminbar: '✓', admindev: '—' },
  { fn: 'Delivery', user: '✓ pedir', adminbar: '✓ config', admindev: '—' },
  { fn: 'Usuarios', user: '—', adminbar: '—', admindev: '✓' },
  { fn: 'Roles y permisos', user: '—', adminbar: '—', admindev: '✓' },
  { fn: 'Auditoría', user: '—', adminbar: '—', admindev: '✓' },
];

/* ---------- Utilidades de persistencia ---------- */

const Store = {
  save(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  },
  // Cache: keep loaded data in memory so repeated access returns the SAME
  // reference (mutation + resave works reliably).
  _cache: {},
  _get(key, seed, saveKey) {
    if (this._cache[saveKey] !== undefined) return this._cache[saveKey];
    const val = this.load(key, null) ?? seed;
    if (!localStorage.getItem(key)) this.save(saveKey, val);
    this._cache[saveKey] = val;
    return val;
  },
  get products() { return this._get('int_products', DEFAULT_PRODUCTS, 'int_products'); },
  set products(v) { this._cache['int_products'] = v; this.save('int_products', v); },
  get orders() { return this._get('int_orders', DEFAULT_ORDERS, 'int_orders'); },
  set orders(v) { this._cache['int_orders'] = v; this.save('int_orders', v); },
  get users() { return this._get('int_users', DEFAULT_USERS, 'int_users'); },
  set users(v) { this._cache['int_users'] = v; this.save('int_users', v); },
  get config() {
    if (this._cache['int_config'] !== undefined) return this._cache['int_config'];
    const c = this.load('int_config', null);
    const val = c ?? DEFAULT_CONFIG;
    if (!c) this.save('int_config', val);
    this._cache['int_config'] = val;
    return val;
  },
  set config(v) { this._cache['int_config'] = v; this.save('int_config', v); },
  get audit() { return this._get('int_audit', DEFAULT_AUDIT, 'int_audit'); },
  set audit(v) { this._cache['int_audit'] = v; this.save('int_audit', v); },
  get stockHistory() { return this._get('int_stockHistory', [], 'int_stockHistory'); },
  set stockHistory(v) { this._cache['int_stockHistory'] = v; this.save('int_stockHistory', v); },
  reset() {
    this._cache = {};
    ['int_products', 'int_orders', 'int_users', 'int_config', 'int_audit', 'int_stockHistory'].forEach((k) => localStorage.removeItem(k));
  },
};

function logAudit(action, target) {
  const audit = Store.audit;
  const user = Store.load('int_session', null);
  const name = user ? user.name : 'Sistema';
  const now = new Date();
  const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  audit.unshift({ id: 'a' + Date.now(), user: name, action, target, time });
  Store.audit = audit;
}
