"""
Servicio de transiciones de estado de pedidos.

Orquesta de forma atomica el cambio de estado y sus efectos:
- Restauracion de stock (exactamente una vez) al cancelar.
- Refund interno (PAID -> REFUNDED) al cancelar cuando el dinero fue recibido.
- Marcado de pago como PAID al entregar pedidos de efectivo.

Toda operacion que modifica pedido + stock + movimiento + pago ocurre dentro
de una unica transaccion: si una parte falla, TODO hace rollback.
"""

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.config.models import CafeConfig
from apps.delivery.models import DeliveryConfig
from apps.payments.models import Payment, PaymentStatus
from apps.products.models import Product
from apps.stock.models import StockMovementType

from .models import DeliveryMethod, OrderStatus


def time_in_window(now_time, start, end):
    """True si ``now_time`` cae en el rango [start, end) (fin excluido).

    Rangos que cruzan la medianoche (end < start) se interpretan como ventana
    nocturna. Si ``start`` y ``end`` son iguales (o alguno vacio) no hay
    restriccion horaria.
    """
    if not start or not end or start == end:
        return True
    if start < end:
        return start <= now_time < end
    return now_time >= start or now_time < end


def cafe_accepts_orders(now=None):
    """Devuelve ``(acepta, codigo)`` para pedidos de la cafeteria.

    Codigos: ok, cafe_closed, cafe_hours, break_active. Respeta el interruptor
    ``is_open`` y la configuracion de horario y receso ya existente.
    """
    cfg = CafeConfig.get_solo()
    if not cfg.is_open:
        return False, "cafe_closed"
    now_time = (now or timezone.localtime()).time()
    if not time_in_window(now_time, cfg.order_open_time, cfg.order_close_time):
        return False, "cafe_hours"
    if cfg.break_start != cfg.break_end and time_in_window(
        now_time, cfg.break_start, cfg.break_end
    ):
        return False, "break_active"
    return True, "ok"


def delivery_accepts_orders(now=None):
    """Devuelve ``(acepta, codigo)`` para el servicio de delivery interno.

    Codigos: ok, delivery_disabled, delivery_day, delivery_hours. Respeta la
    configuracion de delivery ya existente: habilitador, dias (0=lunes..6=domingo,
    coincidente con DeliveryConfigSerializer) y franja horaria.
    """
    cfg = DeliveryConfig.get_solo()
    if not cfg.enabled:
        return False, "delivery_disabled"
    now = now or timezone.localtime()
    if cfg.delivery_days:
        days = {int(day) for day in cfg.delivery_days}
        if now.weekday() not in days:
            return False, "delivery_day"
    if not time_in_window(now.time(), cfg.start_time, cfg.end_time):
        return False, "delivery_hours"
    return True, "ok"


def reserve_cafe_capacity():
    """Reserva una unidad de capacidad de preparacion bajo bloqueo de fila.

    Debe ejecutarse dentro de ``transaction.atomic()``. Devuelve False si ya
    esta llena; en ese caso no modifica nada.
    """
    cfg = CafeConfig.objects.select_for_update().get(pk=1)
    if cfg.current_capacity >= cfg.total_capacity:
        return False
    cfg.current_capacity += 1
    cfg.save(update_fields=["current_capacity", "updated_at"])
    return True


def reserve_delivery_capacity():
    """Reserva una unidad de capacidad de delivery bajo bloqueo de fila."""
    cfg = DeliveryConfig.objects.select_for_update().get(pk=1)
    if cfg.current_capacity >= cfg.max_capacity:
        return False
    cfg.current_capacity += 1
    cfg.save(update_fields=["current_capacity", "updated_at"])
    return True


def _release_capacity(order):
    """Libera la capacidad reservada al crear el pedido (estados terminales).

    Idempotente: usa F() con filtro ``> 0`` (nunca baja de cero) y solo se invoca
    cuando la maquina de estados confirma una transicion unica a CANCELLED o
    DELIVERED, por lo que no hay dobles liberaciones.
    """
    CafeConfig.objects.filter(pk=1, current_capacity__gt=0).update(
        current_capacity=F("current_capacity") - 1
    )
    if order.delivery_method == DeliveryMethod.DELIVERY:
        DeliveryConfig.objects.filter(pk=1, current_capacity__gt=0).update(
            current_capacity=F("current_capacity") - 1
        )


def _restore_stock_once(order, actor):
    """Devuelve el stock de cada item del pedido con exactamente un RETURN.

    La "exactamente una vez" esta garantizada a nivel de maquina de estados
    (CANCELLED es terminal y `transition_to` bloquea la fila), de modo que una
    cancelacion valida restaura una unica vez; un segundo intento no llega aqui.
    `adjust_stock` ademas ignora no-cambios como red de seguridad.
    """
    for item in order.order_items.all():
        if not item.product_id:
            continue
        product = Product.objects.select_for_update().get(pk=item.product_id)
        product.adjust_stock(
            product.stock + item.quantity,
            movement_type=StockMovementType.RETURN,
            user=actor,
            reason=f"Cancelacion del pedido {order.order_number}",
            reference=order.order_number,
        )


def _refund_if_received(order, actor):
    """Refund interno del sistema cuando el dinero ya fue recibido.

    Solo PAYMENT PAID se marca REFUNDED (implica devolucion de dinero ya
    recibido). Pagos no completados (pending/review/approved/rejected) NO se
    marcan artificialmente como REFUNDED porque nunca hubo dinero recibido.
    """
    payment = Payment.objects.select_for_update().filter(order=order).first()
    if not payment:
        return
    if payment.status == PaymentStatus.PAID:
        payment.status = PaymentStatus.REFUNDED
        payment.reviewed_by = actor
        payment.reviewed_at = timezone.now()
        payment.save(
            update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"]
        )


def _mark_paid_on_delivery(order, actor):
    """Efectivo se paga al entregar; voucher requiere flujo de revision."""
    payment = Payment.objects.select_for_update().filter(order=order).first()
    if (
        payment
        and not payment.payment_method.requires_voucher
        and payment.status in (PaymentStatus.PENDING, PaymentStatus.APPROVED)
    ):
        payment.status = PaymentStatus.PAID
        payment.reviewed_by = actor
        payment.reviewed_at = timezone.now()
        payment.save(
            update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"]
        )


def change_order_status(order, new_status, *, changed_by=None, note=""):
    """Aplica la transicion con toda la consistencia de stock y pagos.

    Devuelve ``(order, transitioned)``. Lanza ``InvalidOrderTransition`` si la
    transicion no esta permitida; cualquier error de stock/pago hara rollback
    completo del cambio de estado.
    """
    with transaction.atomic():
        transitioned = order.transition_to(
            new_status, changed_by=changed_by, note=note
        )
        if not transitioned:
            return order, False

        if new_status in (OrderStatus.CANCELLED, OrderStatus.DELIVERED):
            _release_capacity(order)
        if new_status == OrderStatus.CANCELLED:
            _restore_stock_once(order, changed_by)
            _refund_if_received(order, changed_by)
        elif new_status == OrderStatus.DELIVERED:
            _mark_paid_on_delivery(order, changed_by)

    return order, True
