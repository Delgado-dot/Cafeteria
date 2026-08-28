"""
Modelos de la aplicación de pedidos.
"""

from django.conf import settings
from django.db import models

from apps.products.models import Product


class OrderStatus(models.TextChoices):
    """Estados del ciclo de vida de un pedido."""

    QUEUE = "queue", "En cola"
    CONFIRMED = "confirmed", "Confirmado"
    PREPARATION = "prep", "En preparación"
    READY = "ready", "Listo"
    DELIVERED = "delivered", "Entregado"
    CANCELLED = "cancelled", "Cancelado"
    NOT_PICKED_UP = "nopickup", "No retirado"


class Priority(models.TextChoices):
    """Prioridad de un pedido."""

    NORMAL = "normal", "Normal"
    PRIORITY = "priority", "Prioridad"
    URGENT = "urgent", "Urgente"


class DeliveryMethod(models.TextChoices):
    """Método de entrega del pedido."""

    PICKUP = "pickup", "Retiro en cafetería"
    DELIVERY = "delivery", "Delivery interno"


class Order(models.Model):
    """Pedido realizado por un usuario."""

    order_number = models.CharField(
        "número de pedido",
        max_length=20,
        unique=True,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",
        verbose_name="usuario",
    )
    items = models.ManyToManyField(
        Product,
        through="OrderItem",
        related_name="orders",
        verbose_name="productos",
    )
    status = models.CharField(
        "estado",
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.QUEUE,
    )
    priority = models.CharField(
        "prioridad",
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    delivery_method = models.CharField(
        "método de entrega",
        max_length=20,
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.PICKUP,
    )
    delivery_piso = models.PositiveIntegerField("piso", null=True, blank=True)
    delivery_aula = models.CharField("aula", max_length=20, blank=True)
    total = models.DecimalField("total", max_digits=10, decimal_places=2, default=0.00)
    estimated_time = models.PositiveIntegerField("tiempo estimado (min)", default=5)
    note = models.TextField("nota", blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "pedido"
        verbose_name_plural = "pedidos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return self.order_number or f"Pedido #{self.id}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)

    def _generate_order_number(self):
        """Genera un número de pedido secuencial tipo PED-001."""
        last = (
            Order.objects.filter(order_number__startswith="PED-")
            .order_by("-order_number")
            .first()
        )
        if last and last.order_number:
            num = int(last.order_number.split("-")[1]) + 1
        else:
            num = 1
        return f"PED-{num:03d}"

    def calculate_total(self):
        """Calcula el total del pedido desde sus items."""
        total = 0
        for item in self.order_items.all():
            total += item.unit_price * item.quantity
        self.total = total
        self.save(update_fields=["total"])
        return total


class OrderItem(models.Model):
    """Producto individual dentro de un pedido."""

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
    unit_price = models.DecimalField("precio unitario", max_digits=10, decimal_places=2)
    addons = models.JSONField("adicionales", default=list, blank=True)
    note = models.CharField("nota", max_length=300, blank=True)

    class Meta:
        verbose_name = "ítem de pedido"
        verbose_name_plural = "ítems de pedido"

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class OrderStatusHistory(models.Model):
    """Historial de cambios de estado de un pedido."""

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
        related_name="order_status_changes",
        verbose_name="cambiado por",
    )
    changed_at = models.DateTimeField("fecha", auto_now_add=True)
    note = models.CharField("nota", max_length=200, blank=True)

    class Meta:
        verbose_name = "historial de estado"
        verbose_name_plural = "historial de estados"
        ordering = ["changed_at"]

    def __str__(self):
        return f"{self.order} → {self.status}"
