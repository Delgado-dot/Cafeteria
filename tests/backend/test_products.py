"""
Tests de la aplicación de productos.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.products.models import Category, Product

User = get_user_model()


class ProductModelTests(TestCase):
    """Pruebas del modelo de producto."""

    def setUp(self):
        self.category = Category.objects.create(name="Bebidas", icon="🥤")
        self.product = Product.objects.create(
            category=self.category,
            name="Café",
            description="Café americano",
            price=1.20,
            stock=25,
            min_stock=8,
            prep_time=2,
        )

    def test_product_creation(self):
        """Prueba de creación exitosa de un producto."""
        self.assertEqual(self.product.name, "Café")
        self.assertEqual(self.product.price, 1.20)
        self.assertEqual(self.product.category.name, "Bebidas")

    def test_low_stock_property(self):
        """Prueba de la propiedad de stock bajo."""
        self.assertFalse(self.product.is_low_stock)
        self.product.stock = 5
        self.product.save()
        self.assertTrue(self.product.is_low_stock)

    def test_out_of_stock_property(self):
        """Prueba de la propiedad de agotado."""
        self.assertFalse(self.product.is_out_of_stock)
        self.product.stock = 0
        self.product.save()
        self.assertTrue(self.product.is_out_of_stock)

    def test_decrease_stock(self):
        """Prueba de reducción de stock."""
        self.product.decrease_stock(5)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 20)

    def test_decrease_stock_never_negative(self):
        """Prueba de que el stock nunca es negativo."""
        self.product.decrease_stock(100)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)

    def test_decrease_stock_rejects_negative(self):
        """Prueba de rechazo de cantidades negativas."""
        with self.assertRaises(ValueError):
            self.product.decrease_stock(-1)
