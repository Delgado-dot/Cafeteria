"""
Modelos de la aplicación de configuración.
"""

from django.db import models


class CafeConfig(models.Model):
    """Configuración global de la cafetería."""

    cafe_name = models.CharField("nombre", max_length=200, default="Cafetería INTESUD")
    cafe_description = models.TextField("descripción", blank=True)
    order_open_time = models.TimeField("apertura de pedidos", default="09:00")
    order_close_time = models.TimeField("cierre de pedidos", default="09:45")
    break_start = models.TimeField("inicio de receso", default="10:00")
    break_end = models.TimeField("fin de receso", default="10:15")
    total_capacity = models.PositiveIntegerField("capacidad de preparación", default=10)
    current_capacity = models.PositiveIntegerField("capacidad en uso", default=0)
    is_open = models.BooleanField("cafetería abierta", default=True)
    delivery_enabled = models.BooleanField("delivery habilitado", default=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "configuración de cafetería"
        verbose_name_plural = "configuraciones de cafetería"

    def __str__(self):
        return self.cafe_name

    @classmethod
    def get_solo(cls):
        """Retorna la única instancia de configuración."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
