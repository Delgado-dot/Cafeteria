"""
Tests backend de las reglas de negocio al crear pedidos:

- Cafeteria abierta: interruptor maestro + horario + receso.
- Capacidad de preparacion: pedido rechazado cuando esta llena (atomico).
- Delivery interno: habilitado, dias configurados, franja horaria y capacidad.

Tambien verifican atomicidad (sin pedido ni descuento de stock cuando falla una
validacion) y que los contadores de capacidad se liberan en estados terminales.
"""

from datetime import datetime
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.config.models import CafeConfig
from apps.delivery.models import DeliveryConfig
from apps.orders.models import Order
from apps.products.models import Category, Product
from apps.stock.models import StockMovement

User = get_user_model()

# 2026-01-05 es lunes (weekday()==0, igual que delivery_days: lunes=0).
MONDAY_0930 = timezone.make_aware(datetime(2026, 1, 5, 9, 30))
MONDAY_1230 = timezone.make_aware(datetime(2026, 1, 5, 12, 30))
MONDAY_1400 = timezone.make_aware(datetime(2026, 1, 5, 14, 0))
TUESDAY_0100 = timezone.make_aware(datetime(2026, 1, 6, 1, 0))


def open_cafe(
    is_open=True,
    open_time="00:00:00",
    close_time="23:59:59",
    break_start="00:00:00",
    break_end="00:00:00",
    capacity=100,
    current=0,
):
    cfg = CafeConfig.get_solo()
    cfg.is_open = is_open
    cfg.order_open_time = open_time
    cfg.order_close_time = close_time
    cfg.break_start = break_start
    cfg.break_end = break_end
    cfg.total_capacity = capacity
    cfg.current_capacity = current
    cfg.save()
    return cfg


def open_delivery(
    enabled=True,
    start="00:00:00",
    end="23:59:59",
    days=None,
    max_capacity=4,
    current=0,
):
    cfg = DeliveryConfig.get_solo()
    cfg.enabled = enabled
    cfg.start_time = start
    cfg.end_time = end
    cfg.delivery_days = days if days is not None else []
    cfg.max_capacity = max_capacity
    cfg.current_capacity = current
    cfg.save()
    return cfg


class OrderRuleTestCase(TestCase):
    def setUp(self):
        open_cafe()
        open_delivery()
        self.user = User.objects.create_user(
            username="rulesbuyer",
            email="rulesbuyer@intesud.edu.ec",
            password="testpass123",
        )
        self.category = Category.objects.create(name="Comida")
        self.product = Product.objects.create(
            category=self.category,
            name="Sandwich",
            price="2.50",
            stock=100,
            prep_time=3,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def post_order(self, **overrides):
        data = {
            "items": [{"product_id": self.product.pk, "quantity": 1, "addons": []}],
            "delivery_method": "pickup",
        }
        data.update(overrides)
        return self.client.post("/api/orders/", data, format="json")

    def post_delivery_order(self, **overrides):
        payload = {"delivery_method": "delivery", "delivery_info": {"piso": 2, "aula": "B-204"}}
        payload.update(overrides)
        return self.post_order(**payload)


# 1 y 2: cafeteria abierta / cerrada.
class CafeOpenRuleTests(OrderRuleTestCase):
    def test_order_allowed_when_cafe_is_open(self):
        res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 1)

    def test_order_rejected_when_cafe_is_closed(self):
        open_cafe(is_open=False)
        res = self.post_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("cerrada", str(res.data))

    def test_order_rejected_outside_business_hours(self):
        open_cafe(open_time="08:00", close_time="10:00")
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_1400
        ):
            res = self.post_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("horario", str(res.data))

    def test_order_allowed_inside_business_hours(self):
        open_cafe(open_time="08:00", close_time="10:00")
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_0930
        ):
            res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)

    def test_order_rejected_during_break(self):
        open_cafe(
            open_time="08:00",
            close_time="18:00",
            break_start="12:00",
            break_end="13:00",
        )
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_1230
        ):
            res = self.post_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("receso", str(res.data))

    def test_overnight_open_window_serves_orders(self):
        open_cafe(open_time="18:00", close_time="02:00")
        cases = [
            (timezone.make_aware(datetime(2026, 1, 5, 23, 0)), 201),
            (TUESDAY_0100, 201),  # madrugada del dia siguiente
            (MONDAY_1400, 400),   # fuera de la ventana nocturna
        ]
        for now, expected in cases:
            with mock.patch(
                "apps.orders.services.timezone.localtime", return_value=now
            ):
                res = self.post_order()
            self.assertEqual(res.status_code, expected, (now, res.data))


# 3 y 4: capacidad de preparacion.
class CafeCapacityRuleTests(OrderRuleTestCase):
    def test_order_rejected_when_capacity_is_full(self):
        open_cafe(capacity=1, current=1)
        res = self.post_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("capacidad", str(res.data))
        self.assertEqual(Order.objects.count(), 0)

    def test_order_allowed_when_capacity_is_available(self):
        open_cafe(capacity=2, current=1)
        res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 2)

    def test_capacity_counter_returns_to_zero_after_cancel(self):
        open_cafe(capacity=10, current=0)
        res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)
        order_id = res.data["id"]
        r = self.client.patch(
            f"/api/orders/{order_id}/", {"status": "cancelled"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 0)


# 5, 6, 7, 8 y 13: reglas de delivery.
class DeliveryRuleTests(OrderRuleTestCase):
    def test_delivery_rejected_when_disabled(self):
        open_delivery(enabled=False)
        res = self.post_delivery_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("deshabilitado", str(res.data))

    def test_delivery_allowed_inside_schedule(self):
        open_delivery(start="09:00", end="09:45")
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_0930
        ):
            res = self.post_delivery_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(DeliveryConfig.get_solo().current_capacity, 1)

    def test_delivery_rejected_outside_schedule(self):
        open_delivery(start="09:00", end="09:45")
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_1400
        ):
            res = self.post_delivery_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("horario", str(res.data))

    def test_delivery_rejected_when_capacity_full(self):
        open_delivery(max_capacity=1, current=1)
        res = self.post_delivery_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("capacidad de delivery", str(res.data))
        self.assertEqual(Order.objects.count(), 0)

    def test_delivery_allowed_when_capacity_available(self):
        open_delivery(max_capacity=2, current=1)
        res = self.post_delivery_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(DeliveryConfig.get_solo().current_capacity, 2)

    def test_pickup_allowed_even_if_delivery_restricted(self):
        open_delivery(enabled=False, start="09:00", end="09:45", max_capacity=1, current=1)
        res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)

    def test_delivery_allowed_on_configured_day(self):
        open_delivery(days=[0])  # solo lunes
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_0930
        ):
            res = self.post_delivery_order()
        self.assertEqual(res.status_code, 201, res.data)

    def test_delivery_rejected_on_disabled_day(self):
        open_delivery(days=[1])  # hoy es lunes (0)
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_0930
        ):
            res = self.post_delivery_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("hoy", str(res.data))

    def test_delivery_empty_days_means_every_day(self):
        open_delivery(days=[])
        with mock.patch(
            "apps.orders.services.timezone.localtime", return_value=MONDAY_0930
        ):
            res = self.post_delivery_order()
        self.assertEqual(res.status_code, 201, res.data)


# 9 y 10: atomicidad (sin pedido, sin descuento de stock).
class AtomicValidationTests(OrderRuleTestCase):
    def test_failed_validation_creates_no_order_and_keeps_stock(self):
        open_cafe(is_open=False)
        moves_before = StockMovement.objects.count()
        res = self.post_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertEqual(Order.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 100)
        self.assertEqual(StockMovement.objects.count(), moves_before)

    def test_capacity_full_failure_keeps_stock(self):
        open_cafe(capacity=1, current=1)
        moves_before = StockMovement.objects.count()
        res = self.post_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertEqual(Order.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 100)
        self.assertEqual(StockMovement.objects.count(), moves_before)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 1)

    def test_delivery_capacity_full_failure_does_rollback_all(self):
        open_delivery(max_capacity=1, current=1)
        moves_before = StockMovement.objects.count()
        res = self.post_delivery_order()
        self.assertEqual(res.status_code, 400, res.data)
        self.assertEqual(Order.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 100)
        self.assertEqual(StockMovement.objects.count(), moves_before)
        # la capacidad de preparacion reservada tambien se revierte.
        self.assertEqual(CafeConfig.get_solo().current_capacity, 0)


# Liberacion de capacidades en estados terminales (sin fugas/duplicados).
class CapacityReleaseTests(OrderRuleTestCase):
    def setUp(self):
        super().setUp()
        self.adminbar = User.objects.create_user(
            username="rulesbar",
            email="rulesbar@intesud.edu.ec",
            password="testpass123",
            role="adminbar",
        )
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.adminbar)

    def test_cancel_releases_cafe_capacity(self):
        res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 1)
        r = self.client.patch(
            f"/api/orders/{res.data['id']}/", {"status": "cancelled"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 0)

    def test_delivered_releases_cafe_capacity(self):
        res = self.post_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 1)
        order_id = res.data["id"]
        for s in ("confirmed", "prep", "ready", "delivered"):
            r = self.admin_client.patch(
                f"/api/orders/{order_id}/", {"status": s}, format="json"
            )
            self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 0)

    def test_cancel_releases_both_capacities_for_delivery(self):
        res = self.post_delivery_order()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 1)
        self.assertEqual(DeliveryConfig.get_solo().current_capacity, 1)
        r = self.client.patch(
            f"/api/orders/{res.data['id']}/", {"status": "cancelled"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(CafeConfig.get_solo().current_capacity, 0)
        self.assertEqual(DeliveryConfig.get_solo().current_capacity, 0)