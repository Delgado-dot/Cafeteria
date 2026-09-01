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


class HasRolePermission(permissions.BasePermission):
    """
    Permiso granular que consulta RolePermission en BD.
    Uso: view.required_permission = "users.view"
    Si no hay registro para el rol+código, fallback al comportamiento por rol legacy
    para no romper instalaciones sin datos migrados.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # admindev siempre pasa si no hay config granular aún
        code = getattr(view, "required_permission", None)
        if not code:
            return True
        # fallback: si no hay permisos granulares en BD, usar lógica por rol
        from .models import RolePermission

        if not RolePermission.objects.exists():
            return True
        try:
            perm = RolePermission.objects.get(role=request.user.role, code=code)
            return perm.enabled
        except RolePermission.DoesNotExist:
            # por defecto denegar para roles no configurados, permitir a admindev
            return request.user.role == "admindev"


def user_has_perm(user, code):
    """Helper para verificar permiso granular desde código Python (no solo DRF)."""
    if not user or not user.is_authenticated:
        return False
    from .models import RolePermission

    # si no hay tabla poblada, fallback legacy por rol (no romper)
    if not RolePermission.objects.exists():
        legacy = {
            "users.view": ["admindev"],
            "users.create": ["admindev"],
            "users.edit": ["admindev"],
            "users.delete": ["admindev"],
            "roles.view": ["admindev"],
            "roles.edit": ["admindev"],
            "audit.view": ["admindev"],
            "config.view": ["admindev", "adminbar"],
            "config.edit": ["admindev"],
        }
        return user.role in legacy.get(code, ["admindev", "adminbar", "user"])
    try:
        return RolePermission.objects.get(role=user.role, code=code).enabled
    except RolePermission.DoesNotExist:
        return False
