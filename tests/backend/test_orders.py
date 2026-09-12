"""
Tests de la aplicación de pedidos.
"""

import json
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.utils import override_settings

from rest_framework import serializers
from rest_framework.test import APIClient

from apps.config.models import CafeConfig, PaymentMethod
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.orders.serializers import OrderCreateSerializer
from apps.payments.models import Payment, PaymentStatus
from apps.products.models import Addon, Category, Product
from apps.stock.models import StockMovement, StockMovementType

User = get_user_model()


def open_cafe_all_day(capacity=100):
    """Configura la cafeteria abierta 24/7 para tests de checkout.

    La regla backend 'cafeteria abierta' rechaza pedidos fuera del horario o en
    receso, y la capacidad bloquea cuando esta llena. Estos tests de checkout se
    enfocan en stock/pagos/estados, asi que abren la cafeteria sin limites.
    """
    cfg = CafeConfig.get_solo()
    cfg.is_open = True
    cfg.order_open_time = "00:00"
    cfg.order_close_time = "23:59"
    cfg.break_start = "00:00"
    cfg.break_end = "00:00"
    cfg.total_capacity = capacity
    cfg.current_capacity = 0
    cfg.save()
    return cfg


class OrderModelTests(TestCase):
    """Pruebas del modelo de pedido."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="orderuser",
            email="order@intesud.edu.ec",
            password="testpass123",
        )
        self.category = Category.objects.create(name="Bebidas")
        self.product = Product.objects.create(
            category=self.category,
            name="Jugo Natural",
            price=1.50,
            stock=10,
        )
        self.order = Order.objects.create(user=self.user)
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            unit_price=1.50,
        )

    def test_order_number_generation(self):
        """Prueba de generación del número de pedido."""
        self.assertIsNotNone(self.order.order_number)
        self.assertTrue(self.order.order_number.startswith("PED-"))

    def test_calculate_total(self):
        """Prueba del cálculo del total del pedido."""
        total = self.order.calculate_total()
        self.assertEqual(total, 3.00)

    def test_default_status(self):
        """Prueba del estado por defecto."""
        self.assertEqual(self.order.status, OrderStatus.QUEUE)
        self.assertEqual(self.order.status_history.count(), 1)

    def test_order_str(self):
        """Prueba de representación del pedido."""
        self.assertEqual(str(self.order), self.order.order_number)

    def test_repeated_status_does_not_duplicate_history(self):
        self.assertFalse(
            self.order.transition_to(OrderStatus.QUEUE, changed_by=self.user)
        )
        self.assertEqual(self.order.status_history.count(), 1)
        self.assertTrue(
            self.order.transition_to(OrderStatus.CONFIRMED, changed_by=self.user)
        )
        self.assertEqual(self.order.status_history.count(), 2)


class OrderCreationTests(TestCase):
    def setUp(self):
        open_cafe_all_day()
        self.media_root = tempfile.mkdtemp(prefix="cafeteria-test-media-")
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)
        self.user = User.objects.create_user(
            username="buyer", email="buyer@intesud.edu.ec", password="testpass123"
        )
        self.category = Category.objects.create(name="Comida")
        self.product = Product.objects.create(
            category=self.category,
            name="Sandwich",
            price="2.50",
            stock=5,
            prep_time=3,
        )
        self.addon = Addon.objects.create(
            product=self.product, name="Queso extra", price="0.50"
        )
        self.payment_method = PaymentMethod.objects.create(
            code="cash-test", name="Efectivo test"
        )

    def serializer(self, data):
        request = type("Request", (), {"user": self.user})()
        return OrderCreateSerializer(data=data, context={"request": request})

    def test_server_calculates_snapshots_total_payment_and_stock(self):
        serializer = self.serializer(
            {
                "items": [
                    {
                        "product_id": self.product.pk,
                        "quantity": 2,
                        "unit_price": "0.01",
                        "addons": [{"addon_id": self.addon.pk}],
                    }
                ],
                "payment_method": self.payment_method.pk,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)

        order.refresh_from_db()
        self.product.refresh_from_db()
        item = order.order_items.get()
        item_addon = item.item_addons.get()
        self.assertEqual(str(item.unit_price), "2.50")
        self.assertEqual(str(item_addon.unit_price), "0.50")
        self.assertEqual(item_addon.quantity, 2)
        self.assertEqual(str(order.total), "6.00")
        self.assertEqual(str(order.payment.amount), "6.00")
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(StockMovement.objects.get().reference, order.order_number)

    def test_insufficient_stock_rolls_back_entire_order(self):
        serializer = self.serializer(
            {"items": [{"product_id": self.product.pk, "quantity": 99}]}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(serializers.ValidationError):
            serializer.save(user=self.user)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertFalse(Order.objects.exists())
        self.assertFalse(StockMovement.objects.exists())

    def test_multipart_order_accepts_real_voucher_and_nested_json(self):
        self.payment_method.requires_voucher = True
        self.payment_method.save(update_fields=["requires_voucher"])
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.post(
            "/api/orders/",
            {
                "items": json.dumps(
                    [{"product_id": self.product.pk, "quantity": 1, "addons": []}]
                ),
                "delivery_method": "pickup",
                "payment_method": str(self.payment_method.pk),
                "voucher": SimpleUploadedFile(
                    "voucher.pdf", b"test voucher", content_type="application/pdf"
                ),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Order.objects.get(pk=response.data["id"]).payment.voucher.name)

    def test_owner_can_cancel_queued_order_and_stock_is_restored(self):
        serializer = self.serializer(
            {"items": [{"product_id": self.product.pk, "quantity": 2}]}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

        client = APIClient()
        client.force_authenticate(self.user)
        response = client.patch(
            f"/api/orders/{order.pk}/", {"status": "cancelled"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    def test_owner_cannot_apply_admin_status_transition(self):
        serializer = self.serializer(
            {"items": [{"product_id": self.product.pk, "quantity": 1}]}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.patch(
            f"/api/orders/{order.pk}/", {"status": "delivered"}, format="json"
        )
        self.assertEqual(response.status_code, 403)


class OrderPaymentDeliveryTests(TestCase):
    """Regla de pago al entregar pedidos: efectivo→PAID, voucher→no se voltea."""

    def setUp(self):
        open_cafe_all_day()
        self.media_root = tempfile.mkdtemp(prefix="cafeteria-test-media-")
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)
        self.user = User.objects.create_user(
            username="buyer2", email="buyer2@intesud.edu.ec", password="testpass123"
        )
        self.adminbar = User.objects.create_user(
            username="bar",
            email="bar@intesud.edu.ec",
            password="testpass123",
            role="adminbar",
        )
        self.category = Category.objects.create(name="Comida")
        self.product = Product.objects.create(
            category=self.category,
            name="Sandwich",
            price="2.50",
            stock=5,
            prep_time=3,
        )
        self.cash = PaymentMethod.objects.create(code="efectivo-test", name="Efectivo test")
        self.voucher = PaymentMethod.objects.create(
            code="transferencia-test",
            name="Transferencia test",
            requires_voucher=True,
        )
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.adminbar)

    def voucher_file(self):
        return SimpleUploadedFile(
            "voucher.pdf", b"voucher", content_type="application/pdf"
        )

    def deliver(self, order):
        """Recorre la maquina de estados valida hasta DELIVERED."""
        for s in ["confirmed", "prep", "ready", "delivered"]:
            res = self.admin_client.patch(
                f"/api/orders/{order.pk}/", {"status": s}, format="json"
            )
            self.assertEqual(res.status_code, 200, res.data)

    def test_cash_method_marks_payment_paid_on_delivery(self):
        request = type("Request", (), {"user": self.user})()
        serializer = OrderCreateSerializer(
            data={
                "items": [{"product_id": self.product.pk, "quantity": 1}],
                "payment_method": self.cash.pk,
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)
        self.assertEqual(order.payment.status, "pending")
        self.deliver(order)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, "paid")

    def test_voucher_method_pending_is_not_paid_on_delivery(self):
        request = type("Request", (), {"user": self.user})()
        serializer = OrderCreateSerializer(
            data={
                "items": [{"product_id": self.product.pk, "quantity": 1}],
                "payment_method": self.voucher.pk,
                "voucher": self.voucher_file(),
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)
        self.assertEqual(order.payment.status, "pending")
        self.deliver(order)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, "pending")

    def test_voucher_method_approved_is_not_paid_on_delivery(self):
        request = type("Request", (), {"user": self.user})()
        serializer = OrderCreateSerializer(
            data={
                "items": [{"product_id": self.product.pk, "quantity": 1}],
                "payment_method": self.voucher.pk,
                "voucher": self.voucher_file(),
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)
        review = self.admin_client.patch(
            f"/api/payments/{order.payment.pk}/review/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, "approved")
        self.deliver(order)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, "approved")

    def test_review_can_mark_voucher_payment_paid(self):
        request = type("Request", (), {"user": self.user})()
        serializer = OrderCreateSerializer(
            data={
                "items": [{"product_id": self.product.pk, "quantity": 1}],
                "payment_method": self.voucher.pk,
                "voucher": self.voucher_file(),
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=self.user)
        review = self.admin_client.patch(
            f"/api/payments/{order.payment.pk}/review/",
            {"status": "paid"},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, "paid")


class OrderStateMachineConstraintTests(TestCase):
    """Máquina de estados estricta: rechaza transiciones inválidas sin tocar
    stock ni pagos, y mantiene la consistencia stock/cancelación/pago."""

    def setUp(self):
        open_cafe_all_day()
        self.user = User.objects.create_user(
            username="statemachine",
            email="statemachine@intesud.edu.ec",
            password="testpass123",
        )
        self.adminbar = User.objects.create_user(
            username="barstates",
            email="barstates@intesud.edu.ec",
            password="testpass123",
            role="adminbar",
        )
        self.category = Category.objects.create(name="Comida")
        self.product = Product.objects.create(
            category=self.category,
            name="Empanada",
            price="1.00",
            stock=10,
            prep_time=3,
        )
        self.user_client = APIClient()
        self.user_client.force_authenticate(self.user)
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.adminbar)

    def create_order(self, qty=2, payment_method=None, voucher=None):
        request = type("Request", (), {"user": self.user})()
        data = {
            "items": [{"product_id": self.product.pk, "quantity": qty, "addons": []}]
        }
        if payment_method:
            data["payment_method"] = payment_method.pk
        if voucher:
            data["voucher"] = voucher
        serializer = OrderCreateSerializer(
            data=data, context={"request": request}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        return serializer.save(user=self.user)

    def patch_status(self, client, order, status, expected):
        res = client.patch(
            f"/api/orders/{order.pk}/", {"status": status}, format="json"
        )
        self.assertEqual(res.status_code, expected, res.data)
        return res

    def deliver(self, order):
        """Recorre la ruta válida completa hasta DELIVERED."""
        for s in ("confirmed", "prep", "ready", "delivered"):
            self.patch_status(self.admin_client, order, s, 200)

    # 3-6: cadena válida completa
    def test_valid_chain_queue_to_delivered(self):
        order = self.create_order(qty=2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        steps = [
            ("confirmed", OrderStatus.CONFIRMED),
            ("prep", OrderStatus.PREPARATION),
            ("ready", OrderStatus.READY),
            ("delivered", OrderStatus.DELIVERED),
        ]
        for sent, expected in steps:
            self.patch_status(self.admin_client, order, sent, 200)
            order.refresh_from_db()
            self.assertEqual(order.status, expected)
        # DELIVERED es terminal: no restaura stock ni reabre.
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        self.assertEqual(order.status_history.count(), 5)

    # 7: transición inválida (salto) devuelve error.
    def test_invalid_jump_queue_to_delivered_rejected(self):
        order = self.create_order(qty=3)
        self.product.refresh_from_db()
        stock_before = self.product.stock
        moves_before = StockMovement.objects.count()
        res = self.patch_status(self.admin_client, order, "delivered", 400)
        self.assertIn("no permitida", str(res.data))
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.QUEUE)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, stock_before)
        self.assertEqual(StockMovement.objects.count(), moves_before)

    # 8: CANCELLED no puede regresar a un estado activo.
    def test_cancelled_to_active_rejected(self):
        order = self.create_order(qty=2)
        self.patch_status(self.user_client, order, "cancelled", 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        res = self.patch_status(self.admin_client, order, "confirmed", 400)
        self.assertIn("no permitida", str(res.data))
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.CANCELLED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    # 9: DELIVERED no puede cancelarse.
    def test_delivered_to_cancelled_rejected(self):
        order = self.create_order(qty=1)
        self.deliver(order)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.DELIVERED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 9)
        res = self.patch_status(self.admin_client, order, "cancelled", 400)
        self.assertIn("no permitida", str(res.data))
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.DELIVERED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 9)
        self.assertFalse(
            StockMovement.objects.filter(
                reference=order.order_number,
                movement_type=StockMovementType.RETURN,
            ).exists()
        )

    # 10: cancelar restaura stock exactamente una vez.
    def test_cancel_restores_stock_exactly_once(self):
        order = self.create_order(qty=2)
        self.patch_status(self.user_client, order, "cancelled", 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        moves = StockMovement.objects.filter(reference=order.order_number)
        self.assertEqual(
            moves.filter(movement_type=StockMovementType.SALE).count(), 1
        )
        self.assertEqual(
            moves.filter(movement_type=StockMovementType.RETURN).count(), 1
        )

    # 10: cancelar desde PREPARATION también restaura una sola vez.
    def test_cancel_from_prep_restores_stock_once(self):
        order = self.create_order(qty=2)
        self.patch_status(self.admin_client, order, "confirmed", 200)
        self.patch_status(self.admin_client, order, "prep", 200)
        self.patch_status(self.admin_client, order, "cancelled", 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        moves = StockMovement.objects.filter(
            reference=order.order_number,
            movement_type=StockMovementType.RETURN,
        )
        self.assertEqual(moves.count(), 1)

    # 11: cancelar dos veces no duplica el stock.
    def test_cancel_twice_does_not_duplicate_stock(self):
        order = self.create_order(qty=2)
        self.patch_status(self.user_client, order, "cancelled", 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        # segundo intento de cancelación: no-op, no vuelve a incrementar stock.
        self.patch_status(self.admin_client, order, "cancelled", 200)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.CANCELLED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertEqual(
            StockMovement.objects.filter(
                reference=order.order_number,
                movement_type=StockMovementType.RETURN,
            ).count(),
            1,
        )

    # 12: ninguna transición inválida modifica stock.
    def test_any_invalid_transition_leaves_stock_untouched(self):
        order = self.create_order(qty=4)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 6)
        moves_before = StockMovement.objects.count()
        for bad in ("delivered", "prep", "ready", "nopickup"):
            res = self.patch_status(self.admin_client, order, bad, 400)
            self.assertIn("no permitida", str(res.data))
            order.refresh_from_db()
            self.assertEqual(order.status, OrderStatus.QUEUE)
            self.product.refresh_from_db()
            self.assertEqual(self.product.stock, 6)
            self.assertEqual(StockMovement.objects.count(), moves_before)

    # 13: cancelar un pago PAID lo marca REFUNDED (dinero ya recibido).
    def test_cancel_with_paid_payment_marks_refunded(self):
        cash = PaymentMethod.objects.create(code="efectivo-rm", name="Efectivo RM")
        order = self.create_order(qty=2, payment_method=cash)
        review = self.admin_client.patch(
            f"/api/payments/{order.payment.pk}/review/",
            {"status": "paid"},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, PaymentStatus.PAID)
        self.patch_status(self.user_client, order, "cancelled", 200)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, PaymentStatus.REFUNDED)

    # 13: cancelar un pago PENDING lo deja en PENDING (nunca recibido).
    def test_cancel_with_pending_payment_stays_pending(self):
        cash = PaymentMethod.objects.create(code="efectivo-pend", name="Efectivo pend")
        order = self.create_order(qty=1, payment_method=cash)
        self.assertEqual(order.payment.status, PaymentStatus.PENDING)
        self.patch_status(self.user_client, order, "cancelled", 200)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, PaymentStatus.PENDING)

    # 13: cancelar un pago APPROVED lo deja en APPROVED (no se simula reembolso).
    def test_cancel_with_approved_payment_stays_approved(self):
        voucher = PaymentMethod.objects.create(
            code="transferencia-rm",
            name="Transferencia RM",
            requires_voucher=True,
        )
        order = self.create_order(
            qty=1,
            payment_method=voucher,
            voucher=SimpleUploadedFile(
                "voucher.pdf", b"voucher", content_type="application/pdf"
            ),
        )
        review = self.admin_client.patch(
            f"/api/payments/{order.payment.pk}/review/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, PaymentStatus.APPROVED)
        self.patch_status(self.user_client, order, "cancelled", 200)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, PaymentStatus.APPROVED)

    # Autorización: un usuario no puede reabrir ni entregar un pedido de otro.
    def test_user_cannot_touch_orders_of_another_user(self):
        other = User.objects.create_user(
            username="otheruser",
            email="other@intesud.edu.ec",
            password="testpass123",
        )
        request = type("Request", (), {"user": other})()
        serializer = OrderCreateSerializer(
            data={"items": [{"product_id": self.product.pk, "quantity": 1, "addons": []}]},
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save(user=other)
        other_client = APIClient()
        other_client.force_authenticate(self.user)
        res = other_client.patch(
            f"/api/orders/{order.pk}/", {"status": "cancelled"}, format="json"
        )
        self.assertEqual(res.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.QUEUE)
