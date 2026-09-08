"""Modelos de configuracion global del negocio."""

from django.core.exceptions import ValidationError
from django.db import models


class CafeConfig(models.Model):
    """Configuracion singleton de la cafeteria."""

    name = models.CharField("nombre", max_length=200, default="Cafeteria INTESUD")
    description = models.TextField("descripcion", blank=True)
    order_open_time = models.TimeField("apertura de pedidos", default="09:00")
    order_close_time = models.TimeField("cierre de pedidos", default="09:45")
    break_start = models.TimeField("inicio de receso", default="10:00")
    break_end = models.TimeField("fin de receso", default="10:15")
    total_capacity = models.PositiveIntegerField("capacidad de preparacion", default=10)
    current_capacity = models.PositiveIntegerField("capacidad en uso", default=0)
    is_open = models.BooleanField("cafeteria abierta", default=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "configuracion_cafeteria"
        verbose_name = "configuracion de cafeteria"
        verbose_name_plural = "configuraciones de cafeteria"
        constraints = [
            models.CheckConstraint(check=models.Q(pk=1), name="cafe_config_singleton_pk"),
            models.CheckConstraint(
                check=models.Q(current_capacity__lte=models.F("total_capacity")),
                name="cafe_capacity_lte_total",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.pk not in (None, 1):
            raise ValidationError("La configuracion principal debe usar el ID 1.")
        if self._state.adding and type(self).objects.filter(pk=1).exists():
            raise ValidationError("Ya existe la configuracion principal.")
        self.pk = 1
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("La configuracion principal no se puede eliminar.")

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class PaymentMethod(models.Model):
    """Metodo de pago administrable, sin valores codificados en la aplicacion."""

    code = models.SlugField("codigo", max_length=50, unique=True)
    name = models.CharField("nombre", max_length=100)
    description = models.TextField("descripcion", blank=True)
    active = models.BooleanField("activo", default=True)
    requires_voucher = models.BooleanField("requiere comprobante", default=False)
    instructions = models.TextField("instrucciones", blank=True)
    order = models.PositiveIntegerField("orden", default=0)
    # Campos configurables por adminbar (opcionales, blank/null)
    bank_name = models.CharField("banco", max_length=100, blank=True)
    account_holder = models.CharField("titular", max_length=100, blank=True)
    account_type = models.CharField("tipo de cuenta", max_length=50, blank=True)
    account_number = models.CharField("numero de cuenta", max_length=30, blank=True)
    holder_id = models.CharField("identificacion", max_length=30, blank=True)
    phone = models.CharField("telefono/celular", max_length=25, blank=True)
    qr_info = models.TextField("info QR/codigo", blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "metodos_pago"
        verbose_name = "metodo de pago"
        verbose_name_plural = "metodos de pago"
        ordering = ["order", "name"]
        indexes = [models.Index(fields=["active", "order"], name="paymethod_active_order_idx")]

    def __str__(self):
        return self.name
