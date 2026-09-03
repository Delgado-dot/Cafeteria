/* ============================================================
   eventBus.js — Observer / PubSub con namespace
   Patrón Observer: desacopla Cart ↔ UI, Order ↔ Admin, Auth ↔ Shell
   Regla 13: eventos con namespace cart:*, order:*, auth:*
   ============================================================ */

const CafeteriaEventBus = (() => {
  const listeners = new Map(); // event -> Set<callback>

  function on(event, callback) {
    if (!event || typeof callback !== 'function') return () => {};
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    // retorno para off
    return () => off(event, callback);
  }

  function off(event, callback) {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) listeners.delete(event);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    // copiar para permitir off durante iteración
    [...set].forEach((cb) => {
      try { cb(payload); } catch (e) { console.error(`EventBus error ${event}:`, e); }
    });
  }

  function once(event, callback) {
    const wrapper = (payload) => {
      off(event, wrapper);
      callback(payload);
    };
    return on(event, wrapper);
  }

  function clear(event) {
    if (event) listeners.delete(event);
    else listeners.clear();
  }

  return { on, off, emit, once, clear };
})();

// Aliases compatibles
window.CafeteriaEventBus = CafeteriaEventBus;
window.EventBus = CafeteriaEventBus; // compatibilidad corta
