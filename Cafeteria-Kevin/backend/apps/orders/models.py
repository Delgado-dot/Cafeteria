"""Modelos de pedidos y su historial inmutable de precios y estados."""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models, transaction

from apps.products.models import Addon, Product


class OrderStatus(models.TextChoices):
    QUEUE = "queue", "En cola"
    CONFIRMED = "confirmed", "Confirmado"
    PREPARATION = "prep", "En preparacion"
    READY = "ready", "Listo"
    DELIVERED = "delivered", "Entregado"
    CANCELLED = "cancelled", "Cancelado"
    NOT_PICKED_UP = "nopickup", "No retirado"


class Priority(models.TextChoices):
    NORMAL = "normal", "Normal"
    PRIORITY = "priority", "Prioridad"
    URGENT = "urgent", "Urgente"


class DeliveryMethod(models.TextChoices):
    PICKUP = "pickup", "Retiro en cafeteria"
    DELIVERY = "delivery", "Delivery interno"


class Order(models.Model):
    order_number = models.CharField("numero de pedido", max_length=20, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",
        verbose_name="usuario",
    )
    items = models.ManyToManyField(
        Product, through="OrderItem", related_name="orders", verbose_name="productos"
    )
    status = models.CharField(
        "estado", max_length=20, choices=OrderStatus.choices, default=OrderStatus.QUEUE
    )
    priority = models.CharField(
        "prioridad", max_length=20, choices=Priority.choices, default=Priority.NORMAL
    )
    delivery_method = models.CharField(
        "metodo de entrega",
        max_length=20,
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.PICKUP,
    )
    total = models.DecimalField(
        "total",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    estimated_time = models.PositiveIntegerField("tiempo estimado (min)", default=5)
    note = models.TextField("nota", blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "pedidos"
        verbose_name = "pedido"
        verbose_name_plural = "pedidos"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(check=models.Q(total__gte=0), name="order_total_gte_0"),
            models.CheckConstraint(
                check=models.Q(estimated_time__gte=0), name="order_estimated_time_gte_0"
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="order_status_created_idx"),
            models.Index(fields=["user", "-created_at"], name="order_user_created_idx"),
            models.Index(fields=["delivery_method", "status"], name="order_delivery_status_idx"),
        ]

    def __str__(self):
        return self.order_number or f"Pedido #{self.pk}"

    def save(self, *args, changed_by=None, status_note="", **kwargs):
        """
        Generate PED numbers from the database-assigned primary key and log real status changes.

        The temporary UUID is unique during the INSERT. The final visible number derives from
        the atomic database identity, so concurrent requests cannot select the same number.
        """
        is_new = self._state.adding
        previous_status = None
        if not is_new:
            previous_status = (
                type(self).objects.filter(pk=self.pk).values_list("status", flat=True).first()
            )

        needs_number = is_new and not self.order_number
        if needs_number:
            self.order_number = f"TMP-{uuid.uuid4().hex[:16]}"

        with transaction.atomic():
            super().save(*args, **kwargs)

            if needs_number:
                final_number = f"PED-{self.pk:06d}"
                type(self).objects.filter(pk=self.pk).update(order_number=final_number)
                self.order_number = final_number

            update_fields = kwargs.get("update_fields")
            status_was_persisted = update_fields is None or "status" in update_fields
            if is_new or (status_was_persisted and previous_status != self.status):
                OrderStatusHistory.objects.create(
                    order=self,
                    status=self.status,
                    changed_by=changed_by,
                    note=status_note,
                )

    def transition_to(self, new_status, *, changed_by=None, note=""):
        """Change status under a row lock; no-op transitions do not duplicate history."""
        if new_status not in OrderStatus.values:
            raise ValueError("Estado de pedido invalido.")

        with transaction.atomic():
            locked = type(self).objects.select_for_update().get(pk=self.pk)
            if locked.status == new_status:
                return False
            locked.status = new_status
            locked.save(
                changed_by=changed_by,
                status_note=note,
                update_fields=["status", "updated_at"],
            )
            self.status = locked.status
            self.updated_at = locked.updated_at
        return True

    def calculate_total(self, *, save=True):
        total = sum(
            (item.subtotal for item in self.order_items.prefetch_related("item_addons")),
            Decimal("0.00"),
        )
        self.total = total
        if save:
            self.save(update_fields=["total", "updated_at"])
        return total


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="order_items",
        verbose_name="pedido",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_items",
        verbose_name="producto",
    )
    product_name = models.CharField("nombre del producto", max_length=200)
    quantity = models.PositiveIntegerField("cantidad", default=1)
    unit_price = models.DecimalField(
        "precio unitario",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    note = models.CharField("nota", max_length=300, blank=True)

    class Meta:
        db_table = "detalle_pedidos"
        verbose_name = "item de pedido"
        verbose_name_plural = "items de pedido"
        constraints = [
            models.CheckConstraint(check=models.Q(quantity__gt=0), name="order_item_qty_gt_0"),
            models.CheckConstraint(
                check=models.Q(unit_price__gte=0), name="order_item_unit_price_gte_0"
            ),
        ]
        indexes = [models.Index(fields=["order", "product"], name="order_item_order_product_idx")]

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"

    @property
    def subtotal(self):
        product_total = self.unit_price * self.quantity
        addon_total = sum((addon.subtotal for addon in self.item_addons.all()), Decimal("0.00"))
        return product_total + addon_total

    @property
    def line_total(self):
        """Backward-compatible name for the server-calculated subtotal."""
        return self.subtotal


class OrderItemAddon(models.Model):
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="item_addons",
        verbose_name="item de pedido",
    )
    addon = models.ForeignKey(
        Addon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_item_snapshots",
        verbose_name="adicional",
    )
    addon_name = models.CharField("nombre del adicional", max_length=100)
    unit_price = models.DecimalField(
        "precio unitario",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    quantity = models.PositiveIntegerField("cantidad", default=1)

    class Meta:
        db_table = "detalle_pedido_adicionales"
        verbose_name = "adicional de item"
        verbose_name_plural = "adicionales de items"
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gt=0), name="order_item_addon_qty_gt_0"
            ),
            models.CheckConstraint(
                check=models.Q(unit_price__gte=0), name="order_item_addon_price_gte_0"
            ),
            models.UniqueConstraint(
                fields=["order_item", "addon"],
                condition=models.Q(addon__isnull=False),
                name="order_item_addon_unique",
            ),
        ]

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.addon_name}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
        verbose_name="pedido",
    )
    status = models.CharField("estado", max_length=20, choices=OrderStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_status_changes",
        verbose_name="cambiado por",
    )
    changed_at = models.DateTimeField("fecha", auto_now_add=True)
    note = models.CharField("nota", max_length=200, blank=True)

    class Meta:
        db_table = "historial_estado_pedidos"
        verbose_name = "historial de estado"
        verbose_name_plural = "historial de estados"
        ordering = ["changed_at"]
        indexes = [
            models.Index(fields=["order", "changed_at"], name="order_history_order_time_idx"),
            models.Index(fields=["status", "-changed_at"], name="order_history_status_time_idx"),
        ]

    def __str__(self):
        return f"{self.order} - {self.status}"
