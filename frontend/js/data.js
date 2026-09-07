/* ============================================================
   data.js — Caché en memoria + sincronización con API Django
   Mantiene la misma interfaz síncrona: Store.products, Store.orders, etc.
   ============================================================ */

const API_BASE = 'http://localhost:8000/api';

const CATEGORIES = ['Bebidas Frías', 'Bebidas Calientes', 'Snacks', 'Dulces', 'Alimentos Preparados'];

const CATEGORY_EMOJI = {
  'Alimentos Preparados': '🍔', 'Bebidas Frías': '🧃', 'Bebidas Calientes': '☕', 'Snacks': '🍿', 'Dulces': '🍪'
};

const DEFAULT_PRODUCTS = [
  { id: 'p01', name: 'Hamburguesa Clásica', emoji: '🍔', image: '', category: 'Alimentos Preparados', price: 3.50, stock: 10, minStock: 3, prepMin: 8, available: true, desc: 'Pan, carne, queso, lechuga, tomate y salsas. Jugosa y económica.', addedAt: '2025-01-05' },
  { id: 'p02', name: 'Hamburguesa Especial', emoji: '🍔', image: '', category: 'Alimentos Preparados', price: 4.50, stock: 8, minStock: 3, prepMin: 10, available: true, desc: 'Doble carne, tocineta, queso derretido, aros de cebolla y salsa de la casa.', addedAt: '2025-01-05' },
  { id: 'p03', name: 'Hamburguesa de Pollo', emoji: '🍗', image: '', category: 'Alimentos Preparados', price: 4.00, stock: 6, minStock: 2, prepMin: 9, available: true, desc: 'Pechuga de pollo empanizada, lechuga, tomate y mayonesa.', addedAt: '2025-01-12' },
  { id: 'p04', name: 'Hot Dog Clásico', emoji: '🌭', image: '', category: 'Alimentos Preparados', price: 2.00, stock: 12, minStock: 4, prepMin: 4, available: true, desc: 'Salchicha, pan, cebolla, papitas y salsas a elección.', addedAt: '2025-01-05' },
  { id: 'p05', name: 'Hot Dog Especial', emoji: '🌭', image: '', category: 'Alimentos Preparados', price: 2.75, stock: 5, minStock: 2, prepMin: 6, available: true, desc: 'Con tocineta, queso y salsas. El favorito de los viernes.', addedAt: '2025-01-20' },
  { id: 'p06', name: 'Sándwich de Jamón y Queso', emoji: '🥪', image: '', category: 'Alimentos Preparados', price: 2.50, stock: 9, minStock: 3, prepMin: 5, available: true, desc: 'Pan, jamón, queso, lechuga y tomate.', addedAt: '2025-01-05' },
  { id: 'p07', name: 'Sándwich Mixto', emoji: '🥪', image: '', category: 'Alimentos Preparados', price: 2.80, stock: 0, minStock: 2, prepMin: 6, available: true, desc: 'Jamón, quesillo y huevo. Rápido y completo.', addedAt: '2025-02-01' },
  { id: 'p08', name: 'Salchipapa Pequeña', emoji: '🍟', image: '', category: 'Alimentos Preparados', price: 2.50, stock: 10, minStock: 3, prepMin: 7, available: true, desc: 'Papas fritas con salchicha, salsas y mayonesa.', addedAt: '2025-01-05' },
  { id: 'p09', name: 'Salchipapa Grande', emoji: '🍟', image: '', category: 'Alimentos Preparados', price: 3.50, stock: 7, minStock: 2, prepMin: 9, available: true, desc: 'Porción grande para compartir.', addedAt: '2025-01-05' },
  { id: 'p10', name: 'Papas Fritas', emoji: '🍿', image: '', category: 'Alimentos Preparados', price: 1.75, stock: 4, minStock: 3, prepMin: 5, available: true, desc: 'Porción de papas fritas con sal y salsas.', addedAt: '2025-01-05' },
  { id: 'p11', name: 'Jugo Natural', emoji: '🧃', image: '', category: 'Bebidas Frías', price: 1.50, stock: 15, minStock: 5, prepMin: 2, available: true, desc: 'Naranja, mora, piña o maracuyá.', addedAt: '2025-01-05' },
  { id: 'p12', name: 'Gaseosa 350ml', emoji: '🥤', image: '', category: 'Bebidas Frías', price: 1.00, stock: 20, minStock: 6, prepMin: 1, available: true, desc: 'Bebida gaseosa fría.', addedAt: '2025-01-05' },
  { id: 'p13', name: 'Agua 600ml', emoji: '💧', image: '', category: 'Bebidas Frías', price: 0.80, stock: 2, minStock: 5, prepMin: 1, available: true, desc: 'Agua natural.', addedAt: '2025-01-05' },
  { id: 'p14', name: 'Café', emoji: '☕', image: '', category: 'Bebidas Calientes', price: 1.20, stock: 25, minStock: 8, prepMin: 2, available: true, desc: 'Café americano o con leche.', addedAt: '2025-01-05' },
  { id: 'p15', name: 'Chocolate Caliente', emoji: '🍫', image: '', category: 'Bebidas Calientes', price: 1.40, stock: 12, minStock: 4, prepMin: 3, available: true, desc: 'Bebida caliente de chocolate.', addedAt: '2025-02-10' },
  { id: 'p16', name: 'Nachos con Queso', emoji: '🧀', image: '', category: 'Snacks', price: 2.20, stock: 8, minStock: 3, prepMin: 6, available: true, desc: 'Totopos con queso derretido.', addedAt: '2025-01-05' },
  { id: 'p17', name: 'Galletas', emoji: '🍪', image: '', category: 'Dulces', price: 0.75, stock: 30, minStock: 10, prepMin: 1, available: true, desc: 'Paquete de galletas surtidas.', addedAt: '2025-01-05' },
  { id: 'p18', name: 'Empanada', emoji: '🥟', image: '', category: 'Snacks', price: 1.25, stock: 0, minStock: 5, prepMin: 4, available: true, desc: 'Empanada de carne o queso.', addedAt: '2025-02-15' },
];

const DEFAULT_USERS = [
  { id: 'u1', name: 'Estudiante Demo', email: 'usuario@intesud.edu.ec', username: 'usuario@intesud.edu.ec', role: 'user', cargo: 'Estudiante', aula: '2B', active: true, registeredAt: '2025-03-10', lastAccess: '2025-03-10 10:00' },
  { id: 'u2', name: 'Administradora Bar', email: 'adminbar@intesud.edu.ec', username: 'adminbar@intesud.edu.ec', role: 'adminbar', cargo: 'Administradora de cafetería', active: true, registeredAt: '2025-01-05', lastAccess: '2025-03-10 10:00' },
  { id: 'u3', name: 'Administrador Desarrollador', email: 'developer@system.local', username: 'developer@system.local', role: 'admindev', cargo: 'Administrador desarrollador', active: true, registeredAt: '2024-11-20', lastAccess: '2025-03-10 10:00' },
  { id: 'u4', name: 'María Fernanda Torres', email: 'maria.torres@intesud.edu.ec', username: 'maria.torres', role: 'user', cargo: 'Estudiante', aula: '3C', active: true, registeredAt: '2025-02-14', lastAccess: '2025-03-09 10:00' },
  { id: 'u5', name: 'Juan Pablo Ruiz', email: 'juan.ruiz@intesud.edu.ec', username: 'juan.ruiz', role: 'user', cargo: 'Estudiante', aula: '1A', active: true, registeredAt: '2025-02-18', lastAccess: '2025-03-07 10:00' },
  { id: 'u6', name: 'Docente Demo', email: 'docente@intesud.edu.ec', username: 'docente.demo', role: 'user', cargo: 'Docente', aula: '—', active: false, registeredAt: '2025-04-01', lastAccess: '2025-02-26 10:00' },
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
  deliveryFloors: ['1', '2', '3'],
  deliveryZones: ['Aulas', 'Biblioteca', 'Sala de docentes'],
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

const DEFAULT_SUPPLIERS = [
  { id: 's1', name: 'Distribuciones Andinas', type: 'Bebidas', phone: '0991234567' },
  { id: 's2', name: 'Panadería La Unión', type: 'Panadería', phone: '0987654321' },
];

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

const STATUS_MAP = {
  'queue': 'queue', 'prep': 'prep', 'ready': 'ready',
  'delivered': 'delivered', 'cancelled': 'cancelled', 'nopickup': 'nopickup'
};

const PRIORITY_MAP = { 'normal': 'normal', 'priority': 'priority', 'urgent': 'urgent' };

const PAYMENT_MAP = { 'deuna': 'deuna', 'efectivo': 'efectivo', 'transferencia': 'transferencia' };

const PAYMENT_STATUS_MAP = { 'pending': 'pending', 'paid': 'paid', 'approved': 'approved', 'review': 'review', 'refunded': 'refunded' };

const DELIVERY_MAP = { 'pickup': 'pickup', 'delivery': 'delivery' };

function mapProductFromApi(apiProduct) {
  return {
    id: String(apiProduct.id),
    name: apiProduct.nombre,
    emoji: CATEGORY_EMOJI[apiProduct.categoria] || '🍔',
    image: apiProduct.imagen_base64 || '',
    category: apiProduct.categoria,
    price: parseFloat(apiProduct.precio),
    stock: apiProduct.stock,
    minStock: apiProduct.stock_minimo,
    prepMin: apiProduct.tiempo_preparacion,
    available: apiProduct.disponible,
    desc: apiProduct.descripcion || '',
    addedAt: new Date().toISOString().slice(0, 10)
  };
}

function mapProductToApi(product) {
  return {
    nombre: product.name,
    descripcion: product.desc || '',
    categoria: product.category,
    precio: product.price,
    stock: product.stock,
    stock_minimo: product.minStock,
    tiempo_preparacion: product.prepMin,
    imagen_base64: product.image || '',
    disponible: product.available
  };
}

function mapOrderFromApi(apiOrder) {
  const items = (apiOrder.items || []).map(item => ({
    productId: String(item.producto),
    qty: item.cantidad,
    name: item.producto_nombre || '',
    price: parseFloat(item.producto_precio || 0)
  }));
  const fecha = new Date(apiOrder.fecha);
  const dateStr = fecha.toISOString().slice(0, 10);
  const timeStr = String(fecha.getHours()).padStart(2, '0') + ':' + String(fecha.getMinutes()).padStart(2, '0');
  return {
    id: apiOrder.numero,
    userEmail: '',
    userName: apiOrder.usuario_nombre,
    date: dateStr,
    time: timeStr,
    items,
    total: parseFloat(apiOrder.total),
    status: STATUS_MAP[apiOrder.estado_pedido] || 'queue',
    priority: PRIORITY_MAP[apiOrder.prioridad] || 'normal',
    delivery: DELIVERY_MAP[apiOrder.tipo_entrega] || 'pickup',
    deliveryInfo: (apiOrder.piso || apiOrder.aula) ? { piso: apiOrder.piso, aula: apiOrder.aula } : null,
    payment: PAYMENT_MAP[apiOrder.metodo_pago] || 'efectivo',
    paymentStatus: PAYMENT_STATUS_MAP[apiOrder.estado_pago] || 'pending',
    prepMin: items.reduce((sum, i) => sum + (i.price || 0), 0),
    eta: apiOrder.estado_pedido === 'ready' ? 'Listo' : apiOrder.estado_pedido === 'delivered' ? 'Entregado' : 'En cola',
    note: apiOrder.observaciones || ''
  };
}

function mapOrderToApi(order) {
  return {
    usuario_nombre: order.userName,
    total: order.total,
    metodo_pago: order.payment,
    estado_pago: order.paymentStatus,
    estado_pedido: order.status,
    piso: order.deliveryInfo?.piso || '',
    aula: order.deliveryInfo?.aula || '',
    observaciones: order.note || '',
    items: order.items.map(i => ({
      producto: i.productId,
      cantidad: i.qty
    }))
  };
}

function mapSupplierFromApi(apiSupplier) {
  return { id: String(apiSupplier.id), name: apiSupplier.nombre, type: apiSupplier.tipo, phone: apiSupplier.telefono };
}

function mapSupplierToApi(supplier) {
  return { nombre: supplier.name, tipo: supplier.type, telefono: supplier.phone, activo: true };
}

function mapConfigFromApi(apiConfig) {
  return {
    orderOpen: apiConfig.horario_apertura || '09:00',
    orderClose: apiConfig.horario_cierre || '09:45',
    breakStart: apiConfig.horario_receso_inicio || '10:00',
    breakEnd: apiConfig.horario_receso_fin || '10:15',
    capacity: apiConfig.capacidad || 10,
    currentCapacity: 8,
    cafeOpen: apiConfig.estado_abierto !== false,
    deliveryEnabled: apiConfig.delivery_habilitado !== false,
    deliveryDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    deliveryMax: 4,
    deliveryCurrent: 2,
    timeRemainingMinutes: 78
  };
}

function mapConfigToApi(config) {
  return {
    horario_apertura: config.orderOpen,
    horario_cierre: config.orderClose,
    horario_receso_inicio: config.breakStart,
    horario_receso_fin: config.breakEnd,
    capacidad: config.capacity,
    estado_abierto: config.cafeOpen,
    delivery_habilitado: config.deliveryEnabled,
    pisos_habilitados: '1,2,3'
  };
}

function mapStockFromApi(apiStock) {
  return { id: String(apiStock.id), productId: String(apiStock.producto), type: apiStock.tipo, qty: apiStock.cantidad, date: new Date(apiStock.fecha).toISOString() };
}

/* ---------- Caché en memoria ---------- */
const _cache = {
  products: null,
  orders: null,
  users: null,
  config: null,
  audit: null,
  stockHistory: null,
  suppliers: null
};

let _initialized = false;
let _initPromise = null;

function apiGet(endpoint) {
  return fetch(`${API_BASE}${endpoint}`).then(r => {
    if (!r.ok) throw new Error(`API ${endpoint}: ${r.status}`);
    return r.json();
  });
}

function apiPost(endpoint, data) {
  return fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => {
    if (!r.ok) throw new Error(`API POST ${endpoint}: ${r.status}`);
    return r.json();
  });
}

function apiPut(endpoint, data) {
  return fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => {
    if (!r.ok) throw new Error(`API PUT ${endpoint}: ${r.status}`);
    return r.json();
  });
}

function apiPatch(endpoint, data) {
  return fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => {
    if (!r.ok) throw new Error(`API PATCH ${endpoint}: ${r.status}`);
    return r.json();
  });
}

function apiDelete(endpoint) {
  return fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' }).then(r => {
    if (!r.ok) throw new Error(`API DELETE ${endpoint}: ${r.status}`);
    return true;
  });
}

function syncToApi(key, data, isArray = true) {
  const endpointMap = {
    products: '/productos/',
    orders: '/pedidos/',
    stockHistory: '/stock/',
    suppliers: '/proveedores/',
    config: '/configuracion/',
    audit: '/auditoria/',
    users: '/usuarios/'
  };
  const endpoint = endpointMap[key];
  if (!endpoint) return Promise.resolve();

  const item = isArray ? data[data.length - 1] : data;
  if (!item) return Promise.resolve();

  const id = item.id || item.numero;
  const mapToApi = {
    products: mapProductToApi,
    orders: mapOrderToApi,
    suppliers: mapSupplierToApi,
    config: mapConfigToApi
  }[key];

  const apiData = mapToApi ? mapToApi(item) : item;

  const promise = id && !String(id).startsWith('p') && !String(id).startsWith('PED-') && !String(id).startsWith('s')
    ? apiPut(`${endpoint}${id}/`, apiData)
    : apiPost(endpoint, apiData);

  return promise
    .then(result => {
      if (result && result.id && isArray) {
        const idx = data.findIndex(d => d.id === item.id);
        if (idx >= 0) data[idx].id = String(result.id);
      }
    })
    .catch(err => console.error(`Sync ${key} to API failed:`, err));
}

async function loadProducts() {
  try {
    const data = await apiGet('/productos/');
    _cache.products = data.map(mapProductFromApi);
  } catch (e) {
    console.warn('Failed to load products from API, using defaults:', e);
    _cache.products = [...DEFAULT_PRODUCTS];
  }
}

async function loadOrders() {
  try {
    const data = await apiGet('/pedidos/');
    _cache.orders = data.map(mapOrderFromApi);
  } catch (e) {
    console.warn('Failed to load orders from API, using defaults:', e);
    _cache.orders = [...DEFAULT_ORDERS];
  }
}

async function loadUsers() {
  _cache.users = [...DEFAULT_USERS];
}

async function loadConfig() {
  try {
    const data = await apiGet('/configuracion/');
    _cache.config = data.length ? mapConfigFromApi(data[0]) : { ...DEFAULT_CONFIG };
  } catch (e) {
    console.warn('Failed to load config from API, using defaults:', e);
    _cache.config = { ...DEFAULT_CONFIG };
  }
}

async function loadAudit() {
  _cache.audit = [...DEFAULT_AUDIT];
}

async function loadStockHistory() {
  try {
    const data = await apiGet('/stock/');
    _cache.stockHistory = data.map(mapStockFromApi);
  } catch (e) {
    console.warn('Failed to load stock history from API, using defaults:', e);
    _cache.stockHistory = [];
  }
}

async function loadSuppliers() {
  try {
    const data = await apiGet('/proveedores/');
    _cache.suppliers = data.map(mapSupplierFromApi);
  } catch (e) {
    console.warn('Failed to load suppliers from API, using defaults:', e);
    _cache.suppliers = [...DEFAULT_SUPPLIERS];
  }
}

async function initStore() {
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadUsers(),
      loadConfig(),
      loadAudit(),
      loadStockHistory(),
      loadSuppliers()
    ]);
    _initialized = true;
    console.log('Store initialized with API data');
  })();

  return _initPromise;
}

/* ---------- Store público (interfaz idéntica a antes) ---------- */
const Store = {
  get products() { return _cache.products ?? DEFAULT_PRODUCTS; },
  set products(v) {
    _cache.products = v;
    syncToApi('products', v);
  },

  get orders() { return _cache.orders ?? DEFAULT_ORDERS; },
  set orders(v) {
    _cache.orders = v;
    syncToApi('orders', v);
  },

  get users() { return _cache.users ?? DEFAULT_USERS; },
  set users(v) {
    _cache.users = v;
  },

  get config() { return _cache.config ?? DEFAULT_CONFIG; },
  set config(v) {
    _cache.config = v;
    syncToApi('config', v, false);
  },

  get audit() { return _cache.audit ?? DEFAULT_AUDIT; },
  set audit(v) {
    _cache.audit = v;
  },

  get stockHistory() { return _cache.stockHistory ?? []; },
  set stockHistory(v) {
    _cache.stockHistory = v;
    syncToApi('stockHistory', v);
  },

  get suppliers() { return _cache.suppliers ?? DEFAULT_SUPPLIERS; },
  set suppliers(v) {
    _cache.suppliers = v;
    syncToApi('suppliers', v);
  },

  reset() {
    _cache.products = null;
    _cache.orders = null;
    _cache.users = null;
    _cache.config = null;
    _cache.audit = null;
    _cache.stockHistory = null;
    _cache.suppliers = null;
    _initialized = false;
    _initPromise = null;
    ['int_products', 'int_orders', 'int_users', 'int_config', 'int_audit', 'int_stockHistory', 'int_suppliers', 'int_session', 'int_remember'].forEach(k => localStorage.removeItem(k));
  },

  save(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
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

window.initStore = initStore;