"""
Administración de la aplicación de cuentas.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from .models import RolePermission, UserProfile

User = get_user_model()


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Administración de usuarios personalizada."""

    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    fieldsets = UserAdmin.fieldsets + (
        ("Información de cafetería", {"fields": ("role", "cargo", "aula", "avatar")}),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Administración de perfiles."""

    list_display = ("user", "registered_at", "last_access")
    search_fields = ("user__username", "user__email")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "code", "enabled", "updated_by", "updated_at")
    list_filter = ("role", "enabled")
    search_fields = ("role", "code")
