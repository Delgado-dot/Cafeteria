"""Catalogo de productos y operaciones seguras de inventario."""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models, transaction


class Category(models.Model):
    name = models.CharField("nombre", max_length=100, unique=True)
    icon = models.CharField("icono", max_length=50, blank=True)
    order = models.PositiveIntegerField("orden", default=0)

    class Meta:
        db_table = "categorias"
        verbose_name = "categoria"
        verbose_name_plural = "categorias"
        ordering = ["order", "name"]
        indexes = [models.Index(fields=["order", "name"], name="category_order_name_idx")]

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
        verbose_name="categoria",
    )
    name = models.CharField("nombre", max_length=150)
    description = models.TextField("descripcion", blank=True)
    price = models.DecimalField(
        "precio",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    stock = models.PositiveIntegerField("stock", default=0)
    min_stock = models.PositiveIntegerField("stock minimo", default=3)
    prep_time = models.PositiveIntegerField(
        "tiempo de preparacion (min)",
        default=5,
        help_text="Tiempo estimado de preparacion en minutos.",
    )
    available = models.BooleanField("disponible", default=True)
    image = models.ImageField("imagen", upload_to="product_images/", null=True, blank=True)
    emoji = models.CharField("emoji", max_length=10, blank=True)
    added_at = models.DateTimeField("agregado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "productos"
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["category", "available"], name="product_cat_available_idx"),
            models.Index(fields=["available", "name"], name="product_available_name_idx"),
            models.Index(fields=["stock"], name="product_stock_idx"),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(price__gte=0), name="product_price_gte_0"),
            models.CheckConstraint(check=models.Q(stock__gte=0), name="product_stock_gte_0"),
            models.CheckConstraint(
                check=models.Q(min_stock__gte=0), name="product_min_stock_gte_0"
            ),
            models.CheckConstraint(
                check=models.Q(prep_time__gte=0), name="product_prep_time_gte_0"
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return 0 < self.stock <= self.min_stock

    @property
    def is_out_of_stock(self):
        return self.stock == 0

    def decrease_stock(self, quantity, *, user=None, reason="Venta", reference=""):
        """Decrease stock under a row lock and persist its audit movement."""
        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor que cero.")
        if not self.pk:
            raise ValueError("El producto debe estar guardado antes de modificar su stock.")

        from apps.stock.models import StockMovement, StockMovementType

        with transaction.atomic():
            product = Product.objects.select_for_update().get(pk=self.pk)
            if product.stock < quantity:
                raise ValueError(
                    f"Stock insuficiente para {product.name}. Disponible: {product.stock}"
                )

            previous_stock = product.stock
            product.stock -= quantity
            product.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(
                product=product,
                movement_type=StockMovementType.SALE,
                quantity=quantity,
                previous_stock=previous_stock,
                new_stock=product.stock,
                reason=reason,
                reference=reference,
                user=user,
            )
            self.stock = product.stock
            self.updated_at = product.updated_at

        return self.stock

    def adjust_stock(
        self,
        new_stock,
        *,
        movement_type,
        user=None,
        reason,
        reference="",
    ):
        """Set stock under lock and record a purchase, return, waste or adjustment."""
        if new_stock < 0:
            raise ValueError("El stock nuevo no puede ser negativo.")
        if not self.pk:
            raise ValueError("El producto debe estar guardado antes de modificar su stock.")

        from apps.stock.models import StockMovement, StockMovementType

        valid_types = {choice.value for choice in StockMovementType}
        if movement_type not in valid_types:
            raise ValueError("Tipo de movimiento de inventario invalido.")

        with transaction.atomic():
            product = Product.objects.select_for_update().get(pk=self.pk)
            previous_stock = product.stock
            if previous_stock == new_stock:
                return new_stock

            product.stock = new_stock
            product.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(
                product=product,
                movement_type=movement_type,
                quantity=abs(new_stock - previous_stock),
                previous_stock=previous_stock,
                new_stock=new_stock,
                reason=reason,
                reference=reference,
                user=user,
            )
            self.stock = product.stock
            self.updated_at = product.updated_at

        return self.stock


class Addon(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="addons",
        verbose_name="producto",
    )
    name = models.CharField("nombre", max_length=100)
    price = models.DecimalField(
        "precio",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    available = models.BooleanField("disponible", default=True)

    class Meta:
        db_table = "adicionales"
        verbose_name = "adicional"
        verbose_name_plural = "adicionales"
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(check=models.Q(price__gte=0), name="addon_price_gte_0"),
            models.UniqueConstraint(fields=["product", "name"], name="addon_product_name_unique"),
        ]
        indexes = [
            models.Index(fields=["product", "available"], name="addon_product_available_idx")
        ]

    def __str__(self):
        return f"{self.name} ({self.product.name})"
