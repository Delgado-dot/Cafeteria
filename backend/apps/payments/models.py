"""
Modelos de la aplicación de pagos.
"""

from django.conf import settings
from django.db import models


class PaymentMethod(models.TextChoices):
    """Métodos de pago disponibles."""

    DEUNA = "deuna", "DEUNA"
    TRANSFERENCIA = "transferencia", "Transferencia"
    EFECTIVO = "efectivo", "Efectivo"


class PaymentStatus(models.TextChoices):
    """Estados de un pago."""

    PENDING = "pending", "Pendiente"
    REVIEW = "review", "En revisión"
    APPROVED = "approved", "Aprobado"
    PAID = "paid", "Pagado"
    REJECTED = "rejected", "Rechazado"
    REFUNDED = "refunded", "Reembolsado"


class Payment(models.Model):
    """Registro de pago de un pedido."""

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="payment",
        verbose_name="pedido",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="payments",
        verbose_name="usuario",
    )
    method = models.CharField(
        "método",
        max_length=20,
        choices=PaymentMethod.choices,
    )
    status = models.CharField(
        "estado",
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    amount = models.DecimalField("monto", max_digits=10, decimal_places=2)
    voucher = models.FileField(
        "comprobante",
        upload_to="vouchers/",
        null=True,
        blank=True,
    )
    transaction_id = models.CharField(
        "ID de transacción",
        max_length=100,
        blank=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_payments",
        verbose_name="revisado por",
    )
    reviewed_at = models.DateTimeField("revisado", null=True, blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "pago"
        verbose_name_plural = "pagos"

    def __str__(self):
        return f"Pago de {self.order} ({self.status})"
