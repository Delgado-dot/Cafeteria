"""
Permisos personalizados para la aplicación de cuentas.
"""

from django.core.cache import cache

from rest_framework import permissions

from .constants import PERMISSIONS_CATALOG, VALID_ROLES

# Cache key para evitar exists() por petición
_HAS_ANY_CACHE_KEY = "rolepermission_has_any"
_HAS_ANY_TTL = 30  # segundos


def _has_any_permissions():
    val = cache.get(_HAS_ANY_CACHE_KEY)
    if val is not None:
        return val
    from .models import RolePermission

    exists = RolePermission.objects.exists()
    cache.set(_HAS_ANY_CACHE_KEY, exists, _HAS_ANY_TTL)
    return exists


def _clear_permissions_cache():
    cache.delete(_HAS_ANY_CACHE_KEY)


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


class HasRolePermission(permissions.BasePermission):
    """
    Permiso granular que consulta RolePermission en BD.
    Uso: view.required_permission = "users.view" o dict por método/action
    Si no hay registro para el rol+código, deniega salvo emergencia admindev.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Soporta required_permission como str o dict {method: code}
        required = getattr(view, "required_permission", None)
        if required is None:
            return True
        if isinstance(required, dict):
            code = required.get(request.method) or required.get("default")
            if not code:
                return True
        else:
            code = required
        if code not in PERMISSIONS_CATALOG:
            # código no existente → denegar (protección)
            return False
        if request.user.role not in VALID_ROLES:
            return False
        from .models import RolePermission

        # Emergencia: si tabla vacía, solo admindev pasa (evita bloqueo inicial)
        if not _has_any_permissions():
            return request.user.role == "admindev"
        try:
            perm = RolePermission.objects.get(role=request.user.role, code=code)
            return perm.enabled
        except RolePermission.DoesNotExist:
            return False


def user_has_perm(user, code):
    """Helper para verificar permiso granular desde código Python (no solo DRF)."""
    if not user or not user.is_authenticated:
        return False
    if code not in PERMISSIONS_CATALOG:
        return False
    if user.role not in VALID_ROLES:
        return False
    from .models import RolePermission

    if not _has_any_permissions():
        # tabla vacía → solo admindev tiene acceso de emergencia
        return user.role == "admindev"
    try:
        return RolePermission.objects.get(role=user.role, code=code).enabled
    except RolePermission.DoesNotExist:
        return False

