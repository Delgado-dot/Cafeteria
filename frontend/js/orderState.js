/* ============================================================
   orderState.js — State Pattern para ciclo de vida de pedidos
   Centraliza transiciones, valida estados, unifica criterios
   activo vs historial, elimina condicionales dispersos.
   ============================================================ */

const OrderStateMachine = (() => {
  const FLOW = ['queue', 'confirmed', 'prep', 'ready', 'delivered'];
  const LABELS = { queue: 'En cola', confirmed: 'Confirmado', prep: 'En preparación', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado', nopickup: 'No retirado', refunded: 'Reembolsado' };
  const ETA = { queue: 'En cola', confirmed: 'Confirmado', prep: 'En preparación', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado', nopickup: 'No retirado' };

  // Matriz de transiciones válidas
  const TRANSITIONS = {
    queue: ['confirmed', 'cancelled'],
    confirmed: ['prep', 'cancelled'],
    prep: ['ready'],
    ready: ['delivered'],
    delivered: [],
    cancelled: [],
    nopickup: [],
    refunded: [],
  };

  // Criterios unificados (antes duplicados orders.js:20 vs admin.js:799)
  const ACTIVE_STATUSES = ['queue', 'confirmed', 'prep', 'ready'];
  const HISTORY_STATUSES = ['delivered', 'cancelled', 'nopickup', 'refunded'];

  function canTransition(from, to) {
    const allowed = TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  function transition(order, to) {
    if (!canTransition(order.status, to)) {
      const err = new Error(`Transición inválida ${order.status} → ${to}`);
      err.from = order.status;
      err.to = to;
      throw err;
    }
    const prev = order.status;
    order.status = to;
    order.eta = ETA[to] || LABELS[to] || to;
    // pago: al entregar, marcar pagado si estaba pendiente (lógica antes en cart.js:428 y admin.js:934)
    if (to === 'delivered' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'paid';
    }
    if (to === 'cancelled' && order.payment !== 'efectivo' && order.paymentStatus !== 'refunded') {
      // no auto-refund aquí, lo decide caller según contexto admin vs cliente
    }
    // emitir evento desacoplado
    if (typeof CafeteriaEventBus !== 'undefined') {
      CafeteriaEventBus.emit('order:statusChanged', { orderId: order.id, from: prev, to, order });
    }
    return order;
  }

  // Helpers que reemplazan lógica duplicada
  function isActive(status) { return ACTIVE_STATUSES.includes(status); }
  function isHistory(status) { return HISTORY_STATUSES.includes(status); }
  function getFlowIndex(status) { return FLOW.indexOf(status); }
  function getLabel(status) { return LABELS[status] || status; }
  function getEta(status) { return ETA[status] || LABELS[status] || status; }

  // Para validar flujo completo en admin
  function validateFlow(orders) {
    const errors = [];
    orders.forEach(o => {
      if (![...FLOW, 'cancelled','nopickup','refunded'].includes(o.status)) {
        errors.push({ id: o.id, status: o.status, error: 'Estado desconocido' });
      }
    });
    return errors;
  }

  return {
    FLOW,
    LABELS,
    TRANSITIONS,
    ACTIVE_STATUSES,
    HISTORY_STATUSES,
    canTransition,
    transition,
    isActive,
    isHistory,
    getFlowIndex,
    getLabel,
    getEta,
    validateFlow,
  };
})();

window.OrderStateMachine = OrderStateMachine;
// Alias compatibilidad: ORDER_FLOW mantiene API antigua
window.ORDER_FLOW = OrderStateMachine.FLOW;
window.ORDER_FLOW_LABEL = OrderStateMachine.LABELS;
