"""Trazabilidad de movimientos de inventario."""

from django.conf import settings
from django.db import models


class StockMovementType(models.TextChoices):
    PURCHASE = "purchase", "Compra"
    SALE = "sale", "Venta"
    ADJUSTMENT = "adjustment", "Ajuste"
    RETURN = "return", "Devolucion"
    WASTE = "waste", "Merma"


class StockMovement(models.Model):
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="stock_movements",
        verbose_name="producto",
    )
    movement_type = models.CharField("tipo", max_length=20, choices=StockMovementType.choices)
    quantity = models.PositiveIntegerField("cantidad")
    previous_stock = models.PositiveIntegerField("stock anterior")
    new_stock = models.PositiveIntegerField("stock nuevo")
    reason = models.CharField("motivo", max_length=255)
    reference = models.CharField("referencia", max_length=100, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
        verbose_name="usuario",
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        db_table = "movimientos_inventario"
        verbose_name = "movimiento de inventario"
        verbose_name_plural = "movimientos de inventario"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(check=models.Q(quantity__gt=0), name="stock_move_qty_gt_0"),
            models.CheckConstraint(
                check=models.Q(previous_stock__gte=0), name="stock_move_previous_gte_0"
            ),
            models.CheckConstraint(check=models.Q(new_stock__gte=0), name="stock_move_new_gte_0"),
            models.CheckConstraint(
                check=(
                    models.Q(
                        movement_type__in=[
                            StockMovementType.PURCHASE,
                            StockMovementType.RETURN,
                        ],
                        new_stock=models.F("previous_stock") + models.F("quantity"),
                    )
                    | models.Q(
                        movement_type__in=[
                            StockMovementType.SALE,
                            StockMovementType.WASTE,
                        ],
                        previous_stock=models.F("new_stock") + models.F("quantity"),
                    )
                    | models.Q(
                        movement_type=StockMovementType.ADJUSTMENT,
                        new_stock=models.F("previous_stock") + models.F("quantity"),
                    )
                    | models.Q(
                        movement_type=StockMovementType.ADJUSTMENT,
                        previous_stock=models.F("new_stock") + models.F("quantity"),
                    )
                ),
                name="stock_move_balances_match",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "-created_at"], name="stock_move_product_created_idx"),
            models.Index(
                fields=["movement_type", "-created_at"],
                name="stock_move_type_created_idx",
            ),
            models.Index(fields=["reference"], name="stock_move_reference_idx"),
        ]

    def __str__(self):
        return f"{self.product}: {self.get_movement_type_display()} ({self.quantity})"
