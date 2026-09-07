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
    refresh: `${API_BASE_URL}/api/auth/refresh/`,
    verify: `${API_BASE_URL}/api/auth/verify/`,
    register: `${API_BASE_URL}/api/auth/register/`,
    me: `${API_BASE_URL}/api/auth/me/`,
    password: `${API_BASE_URL}/api/auth/password/`,
    users: `${API_BASE_URL}/api/auth/users/`,
    userDetail: (id) => `${API_BASE_URL}/api/auth/users/${id}/`,
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

/* ---------- Utilidades para peticiones HTTP ---------- */
const ApiClient = {
  // Obtener token JWT del localStorage
  getToken() {
    return localStorage.getItem('access_token');
  },
  
  // Guardar token JWT en localStorage
  setToken(token) {
    if (token) localStorage.setItem('access_token', token);
  },
  
  // Guardar refresh token
  setRefreshToken(token) {
    if (token) localStorage.setItem('refresh_token', token);
  },
  
  // Obtener refresh token
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },
  
  // Limpiar tokens
  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
    return this._request('GET', url);
  },
  
  // POST
  async post(url, data, includeAuth = true) {
    return this._request('POST', url, data, includeAuth);
  },
  
  // PATCH
  async patch(url, data) {
    return this._request('PATCH', url, data);
  },
  
  // PUT
  async put(url, data) {
    return this._request('PUT', url, data);
  },
  
  // DELETE
  async delete(url) {
    return this._request('DELETE', url);
  },

  async _request(method, url, data, includeAuth = true, allowRefresh = true) {
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const options = {
        method,
        headers: this.getHeaders(includeAuth, !isFormData),
      };
      if (data !== undefined) options.body = isFormData ? data : JSON.stringify(data);
      const response = await fetch(url, {
        ...options,
      });
      if (response.status === 401 && includeAuth && allowRefresh && this.getRefreshToken()) {
        const refreshed = await this._refreshAccessToken();
        if (refreshed) return this._request(method, url, data, includeAuth, false);
      }
      return this._handleResponse(response);
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  async _refreshAccessToken() {
    try {
      const response = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.getRefreshToken() }),
      });
      if (!response.ok) {
        this.clearTokens();
        localStorage.removeItem('int_session');
        return false;
      }
      const data = await response.json();
      this.setToken(data.access);
      if (data.refresh) this.setRefreshToken(data.refresh);
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
window.apiList = apiList;
