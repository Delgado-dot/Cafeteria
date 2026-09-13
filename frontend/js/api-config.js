/* ============================================================
   api-config.js — Configuración centralizada de API
   ============================================================ */

// Base URL del API. Cambiar según entorno:
// Desarrollo: http://127.0.0.1:8000
// Producción: https://api.cafeteria.intesud.edu.ec
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'https://api.cafeteria.intesud.edu.ec';

const API_ENDPOINTS = {
  // Autenticación
  auth: {
    login: `${API_BASE_URL}/api/auth/login/`,
    logout: `${API_BASE_URL}/api/auth/logout/`,
    refresh: `${API_BASE_URL}/api/auth/refresh/`,
    verify: `${API_BASE_URL}/api/auth/verify/`,
    register: `${API_BASE_URL}/api/auth/register/`,
    me: `${API_BASE_URL}/api/auth/me/`,
    password: `${API_BASE_URL}/api/auth/password/`,
    users: `${API_BASE_URL}/api/auth/users/`,
    userDetail: (id) => `${API_BASE_URL}/api/auth/users/${id}/`,
    permissions: `${API_BASE_URL}/api/auth/permissions/`,
    permissionsBulk: `${API_BASE_URL}/api/auth/permissions/bulk/`,
  },
  
  // Productos
  products: {
    list: `${API_BASE_URL}/api/products/`,
    categories: `${API_BASE_URL}/api/products/categories/`,
    detail: (id) => `${API_BASE_URL}/api/products/${id}/`,
  },
  
  // Órdenes
  orders: {
    create: `${API_BASE_URL}/api/orders/`,
    list: `${API_BASE_URL}/api/orders/mine/`,
    all: `${API_BASE_URL}/api/orders/all/`,
    detail: (id) => `${API_BASE_URL}/api/orders/${id}/`,
  },
  
  // Pagos
  payments: {
    list: `${API_BASE_URL}/api/payments/`,
    create: `${API_BASE_URL}/api/payments/`,
    methods: `${API_BASE_URL}/api/payments/methods/`,
    methodsAdmin: `${API_BASE_URL}/api/payments/methods/admin/`,
    methodDetail: (id) => `${API_BASE_URL}/api/payments/methods/${id}/`,
    mine: `${API_BASE_URL}/api/payments/mine/`,
    all: `${API_BASE_URL}/api/payments/all/`,
    review: (id) => `${API_BASE_URL}/api/payments/${id}/review/`,
  },
  
  // Delivery
  delivery: {
    list: `${API_BASE_URL}/api/delivery/requests/`,
    config: `${API_BASE_URL}/api/delivery/config/`,
  },
  
  // Configuración
  config: {
    get: `${API_BASE_URL}/api/config/current/`,
    update: `${API_BASE_URL}/api/config/`,
  },
  
  // Auditoría
  audit: {
    list: `${API_BASE_URL}/api/audit/`,
  },
  
  // Proveedores
  suppliers: {
    list: `${API_BASE_URL}/api/suppliers/`,
    detail: (id) => `${API_BASE_URL}/api/suppliers/${id}/`,
  },
  
  // Stock
  stock: {
    movements: `${API_BASE_URL}/api/stock/movements/`,
  },

  // Activos visuales (almacenados en PostgreSQL)
  // Las claves pueden contener "/" (p. ej. "images/Cafeteria1"); se codifica
  // por segmento para conservar las rutas sin que Django reciba "%2F".
  assets: {
    get: (key) =>
      `${API_BASE_URL}/api/assets/${key.split('/').map(encodeURIComponent).join('/')}/`,
  },
  
  // Usuarios (admin)
  users: {
    list: `${API_BASE_URL}/api/auth/users/`,
    detail: (id) => `${API_BASE_URL}/api/auth/users/${id}/`,
  },
};

function apiList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

/* ---------- Activos visuales (imágenes servidas por PostgreSQL) ---------- */

// Devuelve la URL pública de un activo almacenado en /api/assets/.
function assetUrl(key) {
  return API_ENDPOINTS.assets.get(key);
}

// Reapunta las variables CSS de fondos a /api/assets/ para que el navegador
// deje de pedir los archivos locales y use la copia centralizada. Si la
// configuración guardó imágenes propias (apariencia del sistema), se aplican.
function bindAssetCssVars(config) {
  const cfg = config || {};
  const loginBg = cfg.login_background_url || assetUrl('bar-intesud-login');
  const map = {
    '--intesud-white-mark': `url('${assetUrl('intesud-white-mark')}')`,
    '--login-background': `url('${loginBg}')`,
    '--auth-background': `url('${cfg.login_background_url || assetUrl('images/image')}')`,
    '--dashboard-background': `url('${assetUrl('images/Como-decorar-una-cafeteria-pequena-con-poco-dinero')}')`,
  };
  const root = document.documentElement;
  for (const [prop, url] of Object.entries(map)) {
    root.style.setProperty(prop, url);
  }
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = cfg.system_logo_url || assetUrl('bar-intesud-logo');
}

/* ---------- Sesión por pestaña (OBS-001) ----------
   Cada pestaña mantiene su propia sesión: los tokens y el usuario actual se
   guardan en sessionStorage (aislado por pestaña), no en localStorage
   (compartido entre pestañas del mismo origen). */
const SessionStore = {
  get(key, fallback = null) {
    try {
      const v = sessionStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    sessionStorage.removeItem(key);
  },
};

/* ---------- Utilidades para peticiones HTTP ---------- */
const ApiClient = {
  // Obtener token JWT de la sesión de esta pestaña
  getToken() {
    return SessionStore.get('access_token', '') || '';
  },
  
  // Guardar token JWT en la sesión de esta pestaña
  setToken(token) {
    if (token) SessionStore.set('access_token', token);
  },
  
  // Guardar refresh token (sesión de esta pestaña)
  setRefreshToken(token) {
    if (token) SessionStore.set('refresh_token', token);
  },
  
  // Obtener refresh token
  getRefreshToken() {
    return SessionStore.get('refresh_token', '') || '';
  },
  
  // Limpiar tokens
  clearTokens() {
    SessionStore.remove('access_token');
    SessionStore.remove('refresh_token');
  },
  
  // Encabezados por defecto con autorización
  getHeaders(includeAuth = true, includeJsonContentType = true) {
    const headers = {};
    if (includeJsonContentType) headers['Content-Type'] = 'application/json';
    if (includeAuth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },
  
  // GET
  async get(url) {
    return ApiClient._request('GET', url);
  },

  // Para historiales y agregados: nunca devolver un total parcial si falla
  // una página. El menú conserva su carga paginada independiente.
  async getAll(url) {
    const items = [];
    const visited = new Set();
    const origin = new URL(url, API_BASE_URL).origin;
    let next = new URL(url, API_BASE_URL).href;
    try {
      while (next) {
        const pageUrl = new URL(next);
        if (pageUrl.origin !== origin || visited.has(next)) {
          return { ok: false, error: 'La paginación recibida no es válida.' };
        }
        visited.add(next);
        const response = await ApiClient.get(next);
        if (!response.ok) return response;
        const data = response.data;
        if (!Array.isArray(data) && !Array.isArray(data?.results)) {
          return { ok: false, error: 'No se pudo cargar la lista completa.' };
        }
        items.push(...apiList(data));
        next = !Array.isArray(data) && data.next ? new URL(data.next, next).href : null;
      }
      return { ok: true, data: items };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },
  
  // POST
  async post(url, data, includeAuth = true) {
    return ApiClient._request('POST', url, data, includeAuth);
  },
  
  // PATCH
  async patch(url, data) {
    return ApiClient._request('PATCH', url, data);
  },
  
  // PUT
  async put(url, data) {
    return ApiClient._request('PUT', url, data);
  },
  
  // DELETE
  async delete(url) {
    return ApiClient._request('DELETE', url);
  },

  async _request(method, url, data, includeAuth = true, allowRefresh = true) {
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method,
        headers: ApiClient.getHeaders(includeAuth, !isFormData),
      };
      if (data !== undefined) options.body = isFormData ? data : JSON.stringify(data);
      const response = await fetch(url, {
        ...options,
      });
      if (response.status === 401 && includeAuth && allowRefresh && ApiClient.getRefreshToken()) {
        const refreshed = await ApiClient._refreshAccessToken();
        if (refreshed) return ApiClient._request(method, url, data, includeAuth, false);
      }
      return ApiClient._handleResponse(response);
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  async _refreshAccessToken() {
    try {
      const response = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: ApiClient.getRefreshToken() }),
      });
      if (!response.ok) {
        ApiClient.clearTokens();
        SessionStore.remove('int_session');
        return false;
      }
      const data = await response.json();
      ApiClient.setToken(data.access);
      if (data.refresh) ApiClient.setRefreshToken(data.refresh);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Manejar respuesta
  async _handleResponse(response) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;
    
    if (!response.ok) {
      return { ok: false, status: response.status, data };
    }
    
    return { ok: true, data };
  },
};

window.API_BASE_URL = API_BASE_URL;
window.API_ENDPOINTS = API_ENDPOINTS;
window.ApiClient = ApiClient;
window.SessionStore = SessionStore;
window.apiList = apiList;
window.assetUrl = assetUrl;
window.bindAssetCssVars = bindAssetCssVars;
