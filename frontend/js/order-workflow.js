/* Contrato único para el ciclo de vida de los pedidos. */
const OrderWorkflow = (() => {
  const flow = Object.freeze(['queue', 'confirmed', 'prep', 'ready', 'delivered']);
  const labels = Object.freeze({ queue: 'En cola', confirmed: 'Confirmado', prep: 'En preparación', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado', nopickup: 'No retirado', refunded: 'Reembolsado' });
  const actions = Object.freeze({
    confirm: { from: ['queue'], to: 'confirmed', button: 'Confirmar', result: 'Confirmado', cls: 'btn-success' },
    prep: { from: ['confirmed'], to: 'prep', button: 'Iniciar preparación', result: 'En preparación', cls: 'btn-warning' },
    ready: { from: ['prep'], to: 'ready', button: 'Marcar listo', result: 'Marcado listo', cls: 'btn-success' },
    delivered: { from: ['ready'], to: 'delivered', button: 'Entregar', result: 'Entregado', cls: 'btn-success' },
    cancel: { from: ['queue', 'confirmed'], to: 'cancelled', button: 'Cancelar', result: 'Cancelado', cls: 'btn-danger-outline' },
  });

  const getLabel = (status) => labels[status] || labels.queue;
  const getFlow = () => [...flow];
  const isTerminal = (status) => ['cancelled', 'nopickup', 'refunded'].includes(status);
  const getAvailableActions = (status) => Object.entries(actions)
    .filter(([, action]) => action.from.includes(status))
    .map(([id, action]) => ({ id, ...action }));

  function getCustomerEta(order) {
    if (order.status === 'ready') return 'Retira ahora';
    if (['queue', 'confirmed', 'prep'].includes(order.status)) return `${order.prepMin || '—'} min`;
    return order.eta || getLabel(order.status) || '—';
  }

  function getCustomerMessage(order) {
    const messages = { queue: 'Tu pedido está en cola', confirmed: 'Pedido confirmado', prep: 'Estamos preparando tu pedido', ready: '¡Tu pedido está listo!', delivered: 'Pedido entregado', cancelled: 'Pedido cancelado', nopickup: 'Pedido no retirado', refunded: 'Reembolso procesado' };
    return messages[order.status] || 'Estado actualizado';
  }

  function transition(order, actionId) {
    const action = actions[actionId];
    if (!action || !action.from.includes(order.status)) return { ok: false, message: 'La transición no es válida para el estado actual.' };
    order.status = action.to;
    order.eta = getLabel(action.to);
    if (actionId === 'cancel' && order.payment !== 'efectivo') order.paymentStatus = 'refunded';
    if (actionId === 'delivered' && order.paymentStatus === 'pending') order.paymentStatus = 'paid';
    return { ok: true, label: action.result, status: action.to, eta: order.eta };
  }

  return Object.freeze({ getFlow, getLabel, isTerminal, getAvailableActions, getCustomerEta, getCustomerMessage, transition });
})();

window.OrderWorkflow = OrderWorkflow;
