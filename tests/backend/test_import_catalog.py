"""
Tests del comando import_catalog.
"""

from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.products.management.commands.import_catalog import CATALOG, PENDING
from apps.products.models import Category, Product


class ImportCatalogTests(TestCase):
    """Pruebas del comando de importación del catálogo del Bar INTESUD."""

    def run_command(self, **kwargs):
        out = StringIO()
        call_command("import_catalog", stdout=out, **kwargs)
        return out.getvalue()

    @property
    def catalog_count(self):
        return sum(len(items) for items in CATALOG.values())

    def test_dry_run_does_not_write(self):
        """--dry-run no crea ni productos ni categorías."""
        out = self.run_command(dry_run=True)
        self.assertIn("SIMULACIÓN", out)
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(Category.objects.count(), 0)

    def test_import_creates_all_products(self):
        """La primera ejecución crea todo el catálogo con las reglas pedidas."""
        out = self.run_command()
        self.assertIn(f"Catálogo: {self.catalog_count} nuevos", out)
        self.assertEqual(Product.objects.count(), self.catalog_count)
        self.assertEqual(Category.objects.count(), 5)
        self.assertEqual(
            Product.objects.filter(stock=0, available=False).count(),
            self.catalog_count,
        )
        self.assertEqual(Product.objects.exclude(image="").count(), 0)

    def test_products_have_real_prices_and_categories(self):
        """Cada producto guarda el precio del catálogo en su categoría."""
        self.run_command()
        for label, items in CATALOG.items():
            category = Category.objects.get(name=label)
            self.assertEqual(
                Product.objects.filter(category=category).count(), len(items)
            )
            for name, price_text in items:
                product = Product.objects.get(name=name)
                self.assertEqual(product.price, Decimal(price_text))
                self.assertEqual(product.category, category)

    def test_import_is_idempotent(self):
        """Repetir la ejecución no duplica ni altera nada."""
        self.run_command()
        out = self.run_command()
        self.assertIn(f"Catálogo: 0 nuevos, {self.catalog_count} ya existían", out)
        self.assertEqual(Product.objects.count(), self.catalog_count)
        self.assertEqual(Product.objects.values("name").distinct().count(), self.catalog_count)

    def test_existing_different_price_is_kept_without_confirmation(self):
        """Sin stdin interactivo no se reemplaza un precio existente distinto."""
        category = Category.objects.create(name="Bebidas", icon="🥤")
        Product.objects.create(
            category=category,
            name="Monster",
            price=Decimal("2.00"),
            stock=5,
            available=True,
        )
        out = self.run_command()
        self.assertIn("[precio-conservado] Monster", out)
        monster = Product.objects.get(name="Monster")
        self.assertEqual(monster.price, Decimal("2.00"))
        self.assertEqual(monster.stock, 5)
        self.assertTrue(monster.available)

    def test_pending_items_are_not_created(self):
        """Los productos sin precio quedan pendientes y no se publican."""
        self.run_command()
        pending_names = [item.lower() for item in PENDING]
        for product in Product.objects.all():
            self.assertNotIn(product.name.lower(), pending_names)
        self.assertNotIn("ensalada de frutas", [p.name.lower() for p in Product.objects.all()])