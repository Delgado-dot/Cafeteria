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
