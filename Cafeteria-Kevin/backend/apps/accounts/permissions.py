"""
Permisos personalizados para la aplicación de cuentas.
"""

from rest_framework import permissions


class IsAdminDeveloper(permissions.BasePermission):
    """Permiso para administradores desarrolladores solamente."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admindev"
        )


class IsAdminBar(permissions.BasePermission):
    """Permiso para administradoras de bar."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("adminbar", "admindev")
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permiso para el propietario del recurso o un administrador."""

    def has_object_permission(self, request, view, obj):
        if request.user.role in ("adminbar", "admindev"):
            return True
        return obj.user == request.user


class IsAdminDeveloperOrReadOnly(permissions.BasePermission):
    """Permite lectura a todos los autenticados, escritura solo a admin dev."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admindev"
        )
