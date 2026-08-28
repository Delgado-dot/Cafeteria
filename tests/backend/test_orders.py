"""
Tests de la aplicación de pedidos.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.orders.models import Order, OrderItem, OrderStatus
from apps.products.models import Category, Product

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

    def test_order_str(self):
        """Prueba de representación del pedido."""
        self.assertEqual(str(self.order), self.order.order_number)
