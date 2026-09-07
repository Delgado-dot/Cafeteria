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

from apps.config.models import PaymentMethod
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.orders.serializers import OrderCreateSerializer
from apps.products.models import Addon, Category, Product
from apps.stock.models import StockMovement

User = get_user_model()


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
