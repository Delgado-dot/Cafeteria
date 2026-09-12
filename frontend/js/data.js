/* ============================================================
   data.js — Configuración, utilidades y almacenamiento
   NOTA: Los datos de productos, usuarios, órdenes, config ahora vienen del API backend
   ============================================================ */

const CATEGORIES = ['Hamburguesas', 'Hot Dogs', 'Sándwiches', 'Papas y Salchipapas', 'Bebidas', 'Snacks'];

const ROLE_LABELS = { user: 'Usuario institucional', adminbar: 'Administradora bar', admindev: 'Administrador desarrollador' };

const PERMISSIONS_CATALOG = {
  "products.view": "Ver catálogo",
  "orders.create": "Crear pedidos",
  "orders.view_own": "Ver pedidos propios",
  "orders.cancel_own": "Cancelar pedidos propios",
  "payments.create": "Crear pagos",
  "payments.view_own": "Ver pagos propios",
  "profile.view": "Ver perfil",
  "profile.edit": "Editar perfil",
  "products.create": "Crear productos",
  "products.edit": "Editar productos",
  "products.delete": "Eliminar productos",
  "orders.view_all": "Ver todos los pedidos",
  "orders.change_status": "Cambiar estado pedidos",
  "stock.view": "Ver stock",
  "stock.edit": "Editar stock",
  "payments.view_all": "Ver todos los pagos",
  "payments.review": "Revisar pagos",
  "delivery.view": "Ver delivery",
  "delivery.edit": "Editar delivery",
  "suppliers.view": "Ver proveedores",
  "suppliers.create": "Crear proveedores",
  "suppliers.edit": "Editar proveedores",
  "suppliers.delete": "Eliminar proveedores",
  "reports.view": "Ver reportes",
  "config.view": "Ver configuración",
  "config.edit": "Editar configuración",
  "users.view": "Ver usuarios",
  "users.create": "Crear usuarios",
  "users.edit": "Editar usuarios",
  "users.disable": "Desactivar usuarios",
  "roles.view": "Ver roles",
  "roles.edit": "Editar roles",
  "audit.view": "Ver auditoría",
};

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

/* Carga TODAS las páginas de /api/products/ siguiendo el enlace "next" de la
   paginación. Con esto el menú del usuario ve todos los productos reales, no
   solo los primeros 20 de la página 1. */
async function fetchAllProducts() {
  const all = [];
  let url = API_ENDPOINTS.products.list;
  while (url) {
    const res = await ApiClient.get(url);
    if (!res.ok) break;
    const data = res.data;
    if (Array.isArray(data)) {
      all.push(...data);
      break;
    }
    if (Array.isArray(data?.results)) all.push(...data.results);
    url = data?.next || null;
  }
  const products = all.map(normalizeApiProduct);
  Store.products = products;
  return products;
}
window.fetchAllProducts = fetchAllProducts;

/* Carga las categorías reales desde la API (id, nombre y orden). */
async function fetchCategories() {
  const res = await ApiClient.get(API_ENDPOINTS.products.categories);
  if (!res.ok) return [];
  const data = res.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}
window.fetchCategories = fetchCategories;

async function loadInitialData() {
  try {
    // Cargar configuración y productos (todas las páginas)
    const [configRes] = await Promise.all([
      ApiClient.get(API_ENDPOINTS.config.get),
      fetchAllProducts(),
    ]);

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
