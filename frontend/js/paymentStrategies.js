/* ============================================================
   paymentStrategies.js — Strategy Pattern para pagos y delivery
   Elimina if/else en cart.js:renderPayDetail y delivery
   Cada estrategia expone: id, label, description, icon, renderDetail(total), validate()
   ============================================================ */

const PaymentStrategyRegistry = (() => {
  const strategies = new Map();

  function register(id, strategy) {
    // estrategia debe tener {id, label, description, icon, renderDetail(total), validate(context)}
    if (!id || !strategy) throw new Error('Strategy inválida');
    strategies.set(id, { id, ...strategy });
  }

  function get(id) { return strategies.get(id); }
  function getAll() { return [...strategies.values()]; }
  function has(id) { return strategies.has(id); }

  // Registro por defecto — extraído de cart.js:205-209
  register('deuna', {
    label: 'DEUNA',
    description: 'Pago con código QR. Aprobación en línea.',
    icon: () => (typeof clientIcon === 'function' ? clientIcon('mobile') : '📱'),
    renderDetail: (total) => `
        <div class="alert info" style="margin-bottom:16px"><span class="a-ico">${typeof clientIcon === 'function' ? clientIcon('mobile') : '📱'}</span><div><div class="a-title">Pago con DEUNA.</div>Escanea el código QR para pagar <b>${typeof money === 'function' ? money(total) : total}</b>. Se validará en línea y se mostrará en el estado del pedido.</div></div>
        <div class="qr-box"><div class="qr-pattern"></div></div>
        <div style="text-align:center" class="muted small" style="margin-top:10px">Código QR simulado — Total: <b>${typeof money === 'function' ? money(total) : total}</b></div>`,
    validate: () => ({ valid: true }),
  });

  register('transferencia', {
    label: 'Transferencia',
    description: 'Carga tu comprobante. Revisión manual.',
    icon: () => (typeof clientIcon === 'function' ? clientIcon('transfer') : '🏦'),
    renderDetail: (total) => `
        <div class="alert info" style="margin-bottom:16px"><span class="a-ico">${typeof clientIcon === 'function' ? clientIcon('transfer') : '🏦'}</span><div><div class="a-title">Transferencia.</div>Realiza una transferencia por <b>${typeof money === 'function' ? money(total) : total}</b> y adjunta el comprobante (simulado).</div></div>
        <div class="card" style="background:var(--primary-soft);border-color:var(--primary-soft)">
          <div class="muted small">Banco Sudamericano · Cta. ahorros</div>
          <div class="bold" style="font-size:1.15rem">220 456 7890 1</div>
          <div class="muted small">Titular: Bar INTESUD</div>
          <div class="muted small">Cédula/RUC: 0999999999001</div>
        </div>
        <div style="margin-top:12px">
          <label class="label">Comprobante (simulado)</label>
          <div class="file-drop" id="fu"><div class="fd-ico">${typeof clientIcon === 'function' ? clientIcon('clip') : '📎'}</div><div>Haz clic para cargar tu comprobante</div><div class="tiny">PNG, JPG o PDF — máx 2MB</div></div>
          <div class="tiny muted" id="fuName" style="margin-top:6px"></div>
        </div>`,
    validate: (ctx) => {
      if (!ctx || !ctx.voucher) return { valid: false, message: 'Carga el comprobante de transferencia (simulado).' };
      return { valid: true };
    },
    attachEvents: (container) => {
      const fu = container.querySelector('#fu');
      if (!fu) return;
      fu.onclick = () => {
        fu.classList.add('success');
        fu.innerHTML = `<span class="fd-ico" style="color:var(--success)">${typeof clientIcon === 'function' ? clientIcon('check') : '✅'}</span><div style="color:var(--success)">Comprobante cargado (simulado)</div>`;
        // emitir evento para que cart.js lo capture vía strategy
        if (typeof CafeteriaEventBus !== 'undefined') CafeteriaEventBus.emit('payment:voucherLoaded', { payment: 'transferencia' });
        window._voucher = true;
      };
    }
  });

  register('efectivo', {
    label: 'Efectivo',
    description: 'Paga en cafetería durante el receso (10:00 - 10:15).',
    icon: () => (typeof clientIcon === 'function' ? clientIcon('cash') : '💵'),
    renderDetail: (total) => `
        <div class="alert warning" style="margin-bottom:16px"><span class="a-ico">${typeof clientIcon === 'function' ? clientIcon('cash') : '💵'}</span><div><div class="a-title">Pago en cafetería durante el receso.</div>Horario: <b>10:00 - 10:15</b></div></div>
        <div class="capacity-card"><div style="text-align:center"><span class="badge badge-warning">Pendiente de pago</span></div><div class="muted small" style="text-align:center;margin-top:8px">Abona tu pedido al retirarlo en la cafetería. Total: <b>${typeof money === 'function' ? money(total) : total}</b></div></div>`,
    validate: () => ({ valid: true }),
  });

  return { register, get, getAll, has };
})();

const DeliveryStrategyRegistry = (() => {
  const strategies = new Map();

  function register(id, strategy) { strategies.set(id, { id, ...strategy }); }
  function get(id) { return strategies.get(id); }
  function getAll() { return [...strategies.values()]; }

  register('pickup', {
    label: 'Retiro en cafetería',
    description: 'Retiras tu pedido durante el receso 10:00 - 10:15.',
    icon: () => (typeof clientIcon === 'function' ? clientIcon('pickup') : '🏪'),
    validate: () => ({ valid: true }),
  });

  register('delivery', {
    label: 'Delivery interno',
    description: 'Entrega dentro del edificio INTESUD.',
    icon: () => (typeof clientIcon === 'function' ? clientIcon('delivery') : '🛵'),
    validate: (ctx) => {
      if (!ctx || !ctx.deliveryInfo) return { valid: false, message: 'Selecciona el piso y el aula para el delivery interno.' };
      return { valid: true };
    },
  });

  return { register, get, getAll };
})();

window.PaymentStrategyRegistry = PaymentStrategyRegistry;
window.DeliveryStrategyRegistry = DeliveryStrategyRegistry;
