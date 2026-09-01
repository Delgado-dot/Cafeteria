"""
Modelos de la aplicación de cuentas de usuario.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    """Roles del sistema de la cafetería."""

    USER = "user", "Usuario institucional"
    ADMIN_BAR = "adminbar", "Administradora de bar"
    ADMIN_DEV = "admindev", "Administrador desarrollador"


class User(AbstractUser):
    """Modelo de usuario personalizado para la cafetería INTESUD."""

    email = models.EmailField("correo electrónico", unique=True)
    role = models.CharField(
        "rol",
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
    )
    cargo = models.CharField("cargo", max_length=100, blank=True)
    aula = models.CharField("aula / ubicación", max_length=50, blank=True)
    avatar = models.ImageField(
        "avatar",
        upload_to="avatars/",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField("activo", default=True)

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"


class UserProfile(models.Model):
    """Perfil adicional del usuario."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    registered_at = models.DateTimeField("registrado", auto_now_add=True)
    last_access = models.DateTimeField("último acceso", null=True, blank=True)

    class Meta:
        verbose_name = "perfil de usuario"
        verbose_name_plural = "perfiles de usuario"

    def __str__(self):
        return f"Perfil de {self.user}"


# --- Permisos granulares por rol (para que "Roles y permisos" no esté en blanco) ---
# Catálogo centralizado: ver PERMISSIONS_CATALOG en frontend/js/data.js
# Se persiste en BD para que los cambios desde el panel admin realmente controlen acceso.
class RolePermission(models.Model):
    """Permiso granular por rol. Permite activar/desactivar cada permiso por rol."""

    role = models.CharField("rol", max_length=50, db_index=True)
    code = models.CharField("código de permiso", max_length=80, db_index=True)
    enabled = models.BooleanField("habilitado", default=False)
    updated_at = models.DateTimeField("actualizado", auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="role_permission_updates",
        verbose_name="actualizado por",
    )

    class Meta:
        verbose_name = "permiso por rol"
        verbose_name_plural = "permisos por rol"
        unique_together = [("role", "code")]
        ordering = ["role", "code"]
        indexes = [
            models.Index(fields=["role", "code"]),
        ]

    def __str__(self):
        return f"{self.role}:{self.code}={'✓' if self.enabled else '✗'}"
