"""
Modelos de la aplicación de productos.
"""

from django.db import models


class Category(models.Model):
    """Categoría de productos."""

    name = models.CharField("nombre", max_length=100, unique=True)
    icon = models.CharField("icono", max_length=50, blank=True)
    order = models.PositiveIntegerField("orden", default=0)

    class Meta:
        verbose_name = "categoría"
        verbose_name_plural = "categorías"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    """Producto de la cafetería."""

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
        verbose_name="categoría",
    )
    name = models.CharField("nombre", max_length=150)
    description = models.TextField("descripción", blank=True)
    price = models.DecimalField("precio", max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField("stock", default=0)
    min_stock = models.PositiveIntegerField("stock mínimo", default=3)
    prep_time = models.PositiveIntegerField(
        "tiempo de preparación (min)",
        default=5,
        help_text="Tiempo estimado de preparación en minutos.",
    )
    available = models.BooleanField("disponible", default=True)
    image = models.ImageField(
        "imagen",
        upload_to="product_images/",
        null=True,
        blank=True,
    )
    emoji = models.CharField("emoji", max_length=10, blank=True)
    added_at = models.DateTimeField("agregado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["category", "name"]

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return 0 < self.stock <= self.min_stock

    @property
    def is_out_of_stock(self):
        return self.stock == 0

    def decrease_stock(self, quantity):
        """Reduce el stock del producto."""
        if quantity < 0:
            raise ValueError("La cantidad no puede ser negativa.")
        self.stock = max(0, self.stock - quantity)
        self.save(update_fields=["stock", "updated_at"])


class Addon(models.Model):
    """Adicional que puede agregarse a un producto."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="addons",
        verbose_name="producto",
    )
    name = models.CharField("nombre", max_length=100)
    price = models.DecimalField("precio", max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "adicional"
        verbose_name_plural = "adicionales"

    def __str__(self):
        return f"{self.name} ({self.product.name})"
