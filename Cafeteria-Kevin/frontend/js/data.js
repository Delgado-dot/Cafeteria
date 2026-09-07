/* ============================================================
   data.js — Configuración, utilidades y almacenamiento
   NOTA: Los datos de productos, usuarios, órdenes, config ahora vienen del API backend
   ============================================================ */

const CATEGORIES = ['Hamburguesas', 'Hot Dogs', 'Sándwiches', 'Papas y Salchipapas', 'Bebidas', 'Snacks'];

const ROLE_LABELS = { user: 'Usuario institucional', adminbar: 'Administradora bar', admindev: 'Administrador desarrollador' };

function normalizeApiProduct(product) {
  const categoryObject = product.category && typeof product.category === 'object' ? product.category : null;
  return {
    ...product,
    categoryId: categoryObject?.id ?? product.category,
    category: product.category_name || categoryObject?.name || 'Otros',
    price: Number(product.price || 0),
    desc: product.description || '',
    prepMin: product.prep_time ?? product.prep_time_minutes ?? 15,
    minStock: product.min_stock ?? 0,
    addons: product.addons || [],
  };
}
window.normalizeApiProduct = normalizeApiProduct;

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
  _cache: {},
  
  // Productos: se cargan desde API al iniciar
  get products() { 
    return this._cache['int_products'] || []; 
  },
  set products(v) { 
    this._cache['int_products'] = v; 
  },
  
  // Órdenes: se cargan desde API
  get orders() { 
    return this._cache['int_orders'] || []; 
  },
  set orders(v) { 
    this._cache['int_orders'] = v; 
  },
  
  // Usuarios: se cargan desde API
  get users() { 
    return this._cache['int_users'] || []; 
  },
  set users(v) { 
    this._cache['int_users'] = v; 
  },
  
  // Configuración: se carga desde API
  get config() {
    if (this._cache['int_config'] !== undefined) return this._cache['int_config'];
    return {};
  },
  set config(v) { 
    this._cache['int_config'] = v; 
  },
  
  // Auditoría: registrada en backend
  get audit() { 
    return this._cache['int_audit'] || []; 
  },
  set audit(v) { 
    this._cache['int_audit'] = v; 
  },
  
  get stockHistory() { 
    return this._cache['int_stockHistory'] || []; 
  },
  set stockHistory(v) { 
    this._cache['int_stockHistory'] = v; 
  },
  
  get suppliers() { 
    return this._cache['int_suppliers'] || []; 
  },
  set suppliers(v) { 
    this._cache['int_suppliers'] = v; 
  },
  
  reset() {
    this._cache = {};
  },
};

/* ---------- Funciones para cargar datos del API ---------- */

async function loadInitialData() {
  try {
    // Cargar productos
    const productsRes = await ApiClient.get(API_ENDPOINTS.products.list);
    if (productsRes.ok) {
      Store.products = apiList(productsRes.data).map(normalizeApiProduct);
    }
    
    // Cargar configuración
    const configRes = await ApiClient.get(API_ENDPOINTS.config.get);
    if (configRes.ok && configRes.data) {
      Store.config = configRes.data;
    }
  } catch (error) {
    console.error('Error cargando datos iniciales:', error);
  }
}

window.loadInitialData = loadInitialData;

function logAudit(action, target) {
  // La auditoría se registra automáticamente en el backend
  const user = Auth.current();
  const name = user ? user.name : 'Sistema';
  console.log(`[AUDIT] ${name} - ${action} - ${target}`);
}
