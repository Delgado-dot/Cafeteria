"""Modelos de delivery interno."""

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class DeliveryConfig(models.Model):
    """Configuracion singleton del servicio de delivery."""

    enabled = models.BooleanField("habilitado", default=True)
    start_time = models.TimeField("hora de inicio", default="09:00")
    end_time = models.TimeField("hora de fin", default="09:45")
    max_capacity = models.PositiveIntegerField(
        "capacidad maxima", default=4, validators=[MinValueValidator(1)]
    )
    current_capacity = models.PositiveIntegerField("capacidad actual", default=0)
    delivery_days = models.JSONField(
        "dias de entrega",
        default=list,
        blank=True,
        help_text="Lista de dias de la semana habilitados para delivery.",
    )
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "configuracion_delivery"
        verbose_name = "configuracion de delivery"
        verbose_name_plural = "configuraciones de delivery"
        constraints = [
            models.CheckConstraint(check=models.Q(pk=1), name="delivery_config_singleton_pk"),
            models.CheckConstraint(
                check=models.Q(max_capacity__gt=0), name="delivery_max_capacity_gt_0"
            ),
            models.CheckConstraint(
                check=models.Q(current_capacity__lte=models.F("max_capacity")),
                name="delivery_capacity_lte_max",
            ),
        ]

    def __str__(self):
        return f"Delivery {'habilitado' if self.enabled else 'deshabilitado'}"

    def clean(self):
        super().clean()
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({"end_time": "Debe ser posterior a la hora de inicio."})

    def save(self, *args, **kwargs):
        if self.pk not in (None, 1):
            raise ValidationError("La configuracion de delivery debe usar el ID 1.")
        if self._state.adding and type(self).objects.filter(pk=1).exists():
            raise ValidationError("Ya existe la configuracion principal de delivery.")
        self.pk = 1
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("La configuracion principal de delivery no se puede eliminar.")

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class DeliveryRequest(models.Model):
    """Datos de ubicacion asociados uno a uno con un pedido."""

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
        db_table = "solicitudes_delivery"
        verbose_name = "solicitud de delivery"
        verbose_name_plural = "solicitudes de delivery"
        indexes = [models.Index(fields=["-created_at"], name="delivery_request_created_idx")]

    def __str__(self):
        return f"Delivery {self.order} - Piso {self.piso} Aula {self.aula}"
