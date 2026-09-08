"""Modelos de pagos."""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    REVIEW = "review", "En revision"
    APPROVED = "approved", "Aprobado"
    PAID = "paid", "Pagado"
    REJECTED = "rejected", "Rechazado"
    REFUNDED = "refunded", "Reembolsado"


class Payment(models.Model):
    """Unico registro de estado y datos de pago de un pedido."""

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
    payment_method = models.ForeignKey(
        "config.PaymentMethod",
        on_delete=models.PROTECT,
        related_name="payments",
        verbose_name="metodo de pago",
    )
    status = models.CharField(
        "estado",
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    amount = models.DecimalField(
        "monto",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    voucher = models.FileField("comprobante", upload_to="vouchers/", null=True, blank=True)
    transaction_id = models.CharField("ID de transaccion", max_length=100, blank=True)
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
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "pagos"
        verbose_name = "pago"
        verbose_name_plural = "pagos"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(check=models.Q(amount__gte=0), name="payment_amount_gte_0")
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="payment_status_created_idx"),
            models.Index(fields=["payment_method", "status"], name="payment_method_status_idx"),
        ]

    def __str__(self):
        return f"Pago de {self.order} ({self.status})"
