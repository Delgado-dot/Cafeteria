"""
Modelos de la aplicación de delivery.
"""

from django.db import models


class DeliveryConfig(models.Model):
    """Configuración del servicio de delivery interno."""

    enabled = models.BooleanField("habilitado", default=True)
    start_time = models.TimeField("hora de inicio", default="09:00")
    end_time = models.TimeField("hora de fin", default="09:45")
    max_capacity = models.PositiveIntegerField("capacidad máxima", default=4)
    current_capacity = models.PositiveIntegerField("capacidad actual", default=0)
    delivery_days = models.JSONField(
        "días de entrega",
        default=list,
        blank=True,
        help_text="Lista de días de la semana habilitados para delivery.",
    )
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "configuración de delivery"
        verbose_name_plural = "configuraciones de delivery"

    def __str__(self):
        return f"Delivery {'habilitado' if self.enabled else 'deshabilitado'}"


class DeliveryRequest(models.Model):
    """Solicitud de delivery asociada a un pedido."""

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="delivery_request",
        verbose_name="pedido",
    )
    piso = models.PositiveIntegerField("piso")
    aula = models.CharField("aula", max_length=20)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "solicitud de delivery"
        verbose_name_plural = "solicitudes de delivery"

    def __str__(self):
        return f"Delivery {self.order} → Piso {self.piso} Aula {self.aula}"
