"""
Tests de la aplicación de productos.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.products.models import Category, Product
from apps.stock.models import StockMovement, StockMovementType

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
        movement = StockMovement.objects.get(product=self.product)
        self.assertEqual(movement.movement_type, StockMovementType.SALE)
        self.assertEqual(movement.previous_stock, 25)
        self.assertEqual(movement.new_stock, 20)

    def test_decrease_stock_rejects_insufficient_stock_without_mutating(self):
        """El stock insuficiente revierte la operacion completa."""
        with self.assertRaises(ValueError):
            self.product.decrease_stock(100)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 25)
        self.assertFalse(StockMovement.objects.exists())

    def test_decrease_stock_rejects_negative(self):
        """Prueba de rechazo de cantidades negativas."""
        with self.assertRaises(ValueError):
            self.product.decrease_stock(-1)


class ProductApiPaginatedListTests(TestCase):
    """La lista pública paginada filtra por la categoría real y permite
    navegar páginas para que nada quede oculto en la primera página."""

    def setUp(self):
        self.client = APIClient()
        self.snacks = Category.objects.create(name="Snacks", order=1)
        self.bebidas = Category.objects.create(name="Bebidas", order=4)
        for i in range(25):
            Product.objects.create(
                category=self.snacks,
                name=f"Snack {i:02d}",
                price=Decimal("1.00"),
                stock=0,
                available=False,
            )
        self.monster = Product.objects.create(
            category=self.bebidas,
            name="Monster",
            price=Decimal("3.00"),
            stock=0,
            available=False,
        )
        self.jugo = Product.objects.create(
            category=self.bebidas,
            name="Jugo natural",
            price=Decimal("1.50"),
            stock=0,
            available=False,
        )

    def test_list_is_paginated_with_count_next_previous(self):
        """count/next/results: la página 1 trae 20 y el enlace next lleva al resto."""
        res = self.client.get("/api/products/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 27)
        self.assertEqual(len(res.data["results"]), 20)
        self.assertIsNotNone(res.data["next"])
        self.assertIsNone(res.data["previous"])

        page2 = self.client.get(res.data["next"])
        self.assertEqual(page2.status_code, 200)
        self.assertEqual(len(page2.data["results"]), 7)
        self.assertIsNone(page2.data["next"])
        self.assertIsNotNone(page2.data["previous"])

    def test_category_filter_uses_real_category_id(self):
        """?category=<id real> devuelve solo productos de esa categoría."""
        res = self.client.get(f"/api/products/?category={self.bebidas.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 2)
        names = {p["name"] for p in res.data["results"]}
        self.assertEqual(names, {"Monster", "Jugo natural"})
        # Los productos de la otra categoría (aunque paginen primero) no aparecen
        self.assertFalse(any("Snack" in p["name"] for p in res.data["results"]))
        self.assertTrue(all(p["category"] == self.bebidas.id for p in res.data["results"]))

    def test_beverage_beyond_first_twenty_is_reachable_by_category_filter(self):
        """Una bebida situada después de los primeros 20 registros aparece al
        filtrar por categoría (raíz del bug del menú)."""
        sidelined = Product.objects.create(
            category=self.bebidas,
            name="Cocacola grande",
            price=Decimal("0.85"),
            stock=0,
            available=False,
        )
        res = self.client.get(f"/api/products/?category={self.bebidas.id}")
        self.assertEqual(res.data["count"], 3)
        names = {p["name"] for p in res.data["results"]}
        self.assertEqual(names, {"Monster", "Jugo natural", "Cocacola grande"})

    def test_page_size_param_is_honored_and_capped(self):
        """El cliente puede pedir más de 20 por request (?page_size=N)."""
        res = self.client.get("/api/products/?page_size=100")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 27)
        self.assertEqual(len(res.data["results"]), 27)

        capped = self.client.get("/api/products/?page_size=99999")
        self.assertEqual(len(capped.data["results"]), 27)

    def test_search_filters_across_the_catalog(self):
        res = self.client.get("/api/products/?search=monster")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["name"], "Monster")

    def test_unavailable_or_zero_stock_products_are_not_hidden(self):
        """available=False y stock=0 no ocultan productos: se listan sin inventar stock."""
        res = self.client.get(f"/api/products/?category={self.bebidas.id}")
        self.assertEqual(len(res.data["results"]), 2)
        for p in res.data["results"]:
            self.assertFalse(p["available"])
            self.assertEqual(p["stock"], 0)
