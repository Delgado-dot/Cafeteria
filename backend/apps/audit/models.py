"""
Modelos de la aplicación de auditoría.
"""

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Registro de acciones realizadas en el sistema."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
        verbose_name="usuario",
    )
    user_name = models.CharField("nombre del usuario", max_length=200, blank=True)
    action = models.CharField("acción", max_length=200)
    target = models.CharField("objetivo", max_length=200, blank=True)
    details = models.JSONField("detalles", default=dict, blank=True)
    ip_address = models.GenericIPAddressField("dirección IP", null=True, blank=True)
    created_at = models.DateTimeField("fecha", auto_now_add=True)

    class Meta:
        verbose_name = "registro de auditoría"
        verbose_name_plural = "registros de auditoría"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.user_name} - {self.action}"


class AuditLogProxy(AuditLog):
    """Proxy del modelo para filtrar en el admin sin duplicar la tabla."""

    class Meta:
        proxy = True
        verbose_name = "auditoría"
        verbose_name_plural = "auditoría"
