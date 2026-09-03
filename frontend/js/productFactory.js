/* ============================================================
   productFactory.js — Factory Method para productos y órdenes
   Centraliza creación y validación, evita duplicación en
   data.js y admin.js:productFormModal
   ============================================================ */

const ProductFactory = (() => {
  const ALLOWED_CATEGORIES = new Set(CATEGORIES || ['Hamburguesas','Hot Dogs','Sándwiches','Papas y Salchipapas','Bebidas','Snacks']);

  function validateProduct(data) {
    const errors = {};
    if (!data.name || !String(data.name).trim()) errors.name = 'Nombre requerido';
    if (!data.category || !ALLOWED_CATEGORIES.has(data.category)) errors.category = 'Categoría inválida';
    const price = Number(data.price);
    if (isNaN(price) || price <= 0) errors.price = 'Precio debe ser > 0';
    const stock = Number(data.stock);
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) errors.stock = 'Stock debe ser entero >=0';
    const prepMin = Number(data.prepMin);
    if (isNaN(prepMin) || prepMin <= 0 || !Number.isInteger(prepMin)) errors.prepMin = 'Tiempo prep debe ser entero >0';
    const minStock = Number(data.minStock);
    if (isNaN(minStock) || minStock < 0 || !Number.isInteger(minStock)) errors.minStock = 'Stock mínimo debe ser entero >=0';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function createProduct(data) {
    const { valid, errors } = validateProduct(data);
    if (!valid) {
      const err = new Error('Producto inválido');
      err.errors = errors;
      throw err;
    }
    return {
      id: data.id || 'p' + Date.now(),
      name: String(data.name).trim(),
      emoji: data.emoji || (typeof catIcon === 'function' ? catIcon(data.category) : '🍽️'),
      image: data.image || '',
      category: data.category,
      price: Number(data.price),
      stock: Number(data.stock),
      minStock: Number(data.minStock),
      prepMin: Number(data.prepMin),
      available: data.available !== undefined ? !!data.available : Number(data.stock) > 0,
      desc: String(data.desc || '').trim(),
      allowExtras: !!data.allowExtras,
      addedAt: data.addedAt || new Date().toISOString().slice(0,10),
    };
  }

  function updateProduct(existing, data) {
    // mezcla y revalida
    const merged = { ...existing, ...data, id: existing.id };
    const { valid, errors } = validateProduct(merged);
    if (!valid) {
      const err = new Error('Producto inválido en actualización');
      err.errors = errors;
      throw err;
    }
    return createProduct(merged);
  }

  function createOrderPayload({ user, items, delivery, deliveryInfo, payment, prepMin }) {
    const now = new Date();
    const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    // nextOrderNumber existe en cart.js, usar fallback si no
    const nextNum = typeof nextOrderNumber === 'function' ? nextOrderNumber() : 'PED-' + String(Date.now()).slice(-3);
    return {
      id: nextNum,
      userEmail: user.email,
      userName: user.name,
      date: now.toISOString().slice(0,10),
      time,
      items: items.map(i => ({ productId: i.productId, qty: i.qty, name: i.name, price: i.price })),
      total: items.reduce((s,i)=> s + i.price * i.qty, 0),
      status: 'queue',
      priority: 'normal',
      delivery: delivery === 'delivery' ? 'delivery' : 'pickup',
      deliveryInfo: delivery === 'delivery' ? deliveryInfo : null,
      payment,
      paymentStatus: 'pending',
      prepMin: prepMin || Math.max(...items.map(i=> Store.products.find(p=>p.id===i.productId)?.prepMin || 5), 5),
      eta: 'En cola',
      note: ''
    };
  }

  return { createProduct, updateProduct, validateProduct, createOrderPayload };
})();

window.ProductFactory = ProductFactory;
