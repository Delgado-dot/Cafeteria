"""Proveedores y sus relaciones comerciales con productos."""

from decimal import Decimal

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models


phone_validator = RegexValidator(
    regex=r"^\+?[0-9()\-\s]{7,25}$",
    message="Ingrese un numero telefonico valido.",
)


class Supplier(models.Model):
    name = models.CharField("nombre", max_length=200)
    contact_name = models.CharField("persona de contacto", max_length=200, blank=True)
    phone = models.CharField("telefono", max_length=25, blank=True, validators=[phone_validator])
    email = models.EmailField("correo electronico", blank=True)
    address = models.TextField("direccion", blank=True)
    tax_id = models.CharField("identificacion fiscal", max_length=30, null=True, blank=True)
    active = models.BooleanField("activo", default=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "proveedores"
        verbose_name = "proveedor"
        verbose_name_plural = "proveedores"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tax_id"],
                condition=models.Q(tax_id__isnull=False) & ~models.Q(tax_id=""),
                name="supplier_tax_id_unique",
            )
        ]
        indexes = [models.Index(fields=["active", "name"], name="supplier_active_name_idx")]

    def __str__(self):
        return self.name


class ProductSupplier(models.Model):
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="supplier_links",
        verbose_name="producto",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name="product_links",
        verbose_name="proveedor",
    )
    supplier_code = models.CharField("codigo del proveedor", max_length=100, blank=True)
    cost_price = models.DecimalField(
        "precio de costo",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    is_primary = models.BooleanField("principal", default=False)
    active = models.BooleanField("activo", default=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "productos_proveedores"
        verbose_name = "proveedor de producto"
        verbose_name_plural = "proveedores de productos"
        constraints = [
            models.UniqueConstraint(fields=["product", "supplier"], name="product_supplier_unique"),
            models.CheckConstraint(
                check=models.Q(cost_price__gte=0), name="product_supplier_cost_gte_0"
            ),
            models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(is_primary=True, active=True),
                name="one_primary_supplier_product",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "active"], name="ps_product_active_idx"),
            models.Index(fields=["supplier", "active"], name="ps_supplier_active_idx"),
        ]

    def __str__(self):
        return f"{self.product} - {self.supplier}"
