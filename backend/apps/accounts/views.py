"""
Vistas de la aplicación de cuentas.
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .constants import PERMISSIONS_CATALOG, VALID_ROLES
from .models import RolePermission
from .permissions import HasRolePermission, IsAdminDeveloper, _clear_permissions_cache
from apps.audit.services import record_audit
from .serializers import (
    RolePermissionSerializer,
    SelfUserUpdateSerializer,
    UsernameOrEmailTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    """Registro de un nuevo usuario (acceso público)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # role es read_only en serializer, frontend no puede elevar privilegios
        user = serializer.save()
        record_audit(
            request=request,
            user=user,
            action="user.registered",
            target=f"user:{user.pk} ({user.username})",
            details={"role": user.role, "email": user.email},
        )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Login con JWT mediante nombre de usuario o correo."""

    serializer_class = UsernameOrEmailTokenObtainPairSerializer


class UserListView(generics.ListAPIView):
    """Listar todos los usuarios (requiere users.view)."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = "users.view"
    search_fields = ["username", "email", "first_name", "last_name"]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, actualizar o eliminar un usuario."""

    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    # Permiso por método
    required_permission = {
        "GET": "users.view",
        "PUT": "users.edit",
        "PATCH": "users.edit",
        "DELETE": "users.disable",
    }

    def get_serializer_class(self):
        if self.request.method == "GET":
            return UserSerializer
        return UserUpdateSerializer

    def _check_role_protections(self, target, data):
        request_user = self.request.user
        # No permitir que usuario cambie su propio rol
        if str(target.id) == str(request_user.id) and "role" in data:
            new_role = data.get("role")
            if new_role and new_role != target.role:
                raise PermissionDenied("No puedes cambiar tu propio rol.")
        # adminbar no puede gestionar usuarios admindev
        if request_user.role == "adminbar" and target.role == "admindev":
            raise PermissionDenied("No tienes permiso para gestionar usuarios desarrolladores.")
        if "role" in data and data.get("role") == "admindev" and request_user.role != "admindev":
            raise PermissionDenied("Solo desarrollador puede asignar rol admindev.")
        # Validar rol permitido
        if "role" in data and data["role"] not in VALID_ROLES:
            raise ValidationError({"role": "Rol no válido."})

    def _check_last_admindev(self, target, new_is_active=None, will_delete=False):
        # Evitar dejar sin admindev activo
        if target.role != "admindev":
            return
        if will_delete or new_is_active is False:
            active_count = User.objects.filter(role="admindev", is_active=True).count()
            # si el target está activo y es el último, bloquear
            if target.is_active and active_count <= 1:
                raise PermissionDenied("No puedes desactivar/eliminar al último administrador desarrollador activo.")
            # evitar auto-desactivación del solicitante si es el mismo y es último
            if str(target.id) == str(self.request.user.id) and new_is_active is False:
                # ya cubierto arriba, pero mensaje específico
                if active_count <= 1:
                    raise PermissionDenied("No puedes desactivarte si eres el último admindev activo.")

    def patch(self, request, *args, **kwargs):
        target = self.get_object()
        previous_role = target.role
        previous_active = target.is_active
        self._check_role_protections(target, request.data)
        if "is_active" in request.data:
            new_active = request.data.get("is_active")
            # normalizar bool
            if isinstance(new_active, str):
                new_active = new_active.lower() in ("true", "1", "yes")
            self._check_last_admindev(target, new_is_active=bool(new_active))
            # users.disable permiso ya verificado por HasRolePermission (PATCH -> users.edit), pero desactivar requiere users.disable
            # Verificar explícitamente si cambia is_active
            if not HasRolePermission().has_permission(request, type("obj", (), {"required_permission": "users.disable"})()):
                # fallback check manual usando HasRolePermission logic
                from .permissions import user_has_perm

                if not user_has_perm(request.user, "users.disable"):
                    raise PermissionDenied("Requiere permiso users.disable")
        response = super().patch(request, *args, **kwargs)
        if response.status_code == 200:
            details = {
                field: request.data[field]
                for field in ("first_name", "last_name", "email", "role", "cargo", "aula", "avatar")
                if field in request.data
            }
            if "is_active" in request.data:
                new_active = request.data.get("is_active")
                if isinstance(new_active, str):
                    new_active = new_active.lower() in ("true", "1", "yes")
                details["is_active"] = bool(new_active)
            new_role = details.get("role", previous_role)
            new_active_state = details.get("is_active", previous_active)
            if new_role != previous_role:
                action = "user.role_change"
            elif new_active_state is True and not previous_active:
                action = "user.activate"
            elif new_active_state is False and previous_active:
                action = "user.deactivate"
            else:
                action = "user.update"
            record_audit(
                request=request,
                action=action,
                target=f"user:{target.pk} ({target.username})",
                details=details,
            )
        return response

    def delete(self, request, *args, **kwargs):
        target = self.get_object()
        if request.user.role == "adminbar":
            raise PermissionDenied("No tienes permiso para eliminar usuarios.")
        self._check_last_admindev(target, will_delete=True)
        target_info = f"user:{target.pk} ({target.username})"
        response = super().delete(request, *args, **kwargs)
        if response.status_code == 204:
            record_audit(
                request=request,
                action="user.delete",
                target=target_info,
                details={"deleted": True},
            )
        return response


class MeView(APIView):
    """Vista del usuario autenticado."""

    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = {"GET": "profile.view", "PATCH": "profile.edit"}

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # No permitir que patch intente cambiar role/is_active
        if "role" in request.data or "is_active" in request.data:
            raise PermissionDenied("No puedes modificar tu rol o estado.")
        serializer = SelfUserUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit(
            request=request,
            action="profile.update",
            target=f"user:{request.user.pk} ({request.user.username})",
            details={
                field: request.data[field]
                for field in SelfUserUpdateSerializer.Meta.fields
                if field in request.data
            },
        )
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(APIView):
    """Change the authenticated user's password after verifying the current one."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Contraseña actualizada correctamente."})


class RolePermissionListView(APIView):
    """Listar / actualizar permisos por rol."""

    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = {"GET": "roles.view", "POST": "roles.edit", "PUT": "roles.edit"}

    def get(self, request):
        role = request.query_params.get("role")
        if role and role not in VALID_ROLES:
            return Response({"detail": "Rol no válido."}, status=status.HTTP_400_BAD_REQUEST)
        qs = RolePermission.objects.all()
        if role:
            qs = qs.filter(role=role)
        return Response(RolePermissionSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        updated = []
        # validar rol
        role = data.get("role")
        if role and role not in VALID_ROLES:
            return Response({"detail": "Rol no válido."}, status=status.HTTP_400_BAD_REQUEST)
        if "permissions" in data and "role" in data:
            perms = data["permissions"]
            if not isinstance(perms, dict):
                return Response({"detail": "permissions debe ser objeto {code:bool}"}, status=status.HTTP_400_BAD_REQUEST)
            for code, enabled in perms.items():
                if code not in PERMISSIONS_CATALOG:
                    return Response({"detail": f"Código no existe: {code}"}, status=status.HTTP_400_BAD_REQUEST)
                obj, _ = RolePermission.objects.update_or_create(
                    role=role, code=code, defaults={"enabled": bool(enabled), "updated_by": request.user}
                )
                updated.append(obj)
            record_audit(
                request=request,
                action="role_permissions.update",
                target=f"role:{role}",
                details={"permissions": {code: bool(enabled) for code, enabled in perms.items()}},
            )
        elif "role" in data and "code" in data:
            code = data["code"]
            if code not in PERMISSIONS_CATALOG:
                return Response({"detail": f"Código no existe: {code}"}, status=status.HTTP_400_BAD_REQUEST)
            obj, _ = RolePermission.objects.update_or_create(
                role=data["role"], code=code, defaults={"enabled": bool(data.get("enabled", False)), "updated_by": request.user}
            )
            updated.append(obj)
            record_audit(
                request=request,
                action="role_permissions.update",
                target=f"role:{data['role']}",
                details={"permissions": {code: bool(data.get("enabled", False))}},
            )
        else:
            return Response({"detail": "Formato inválido. Use {role, code, enabled} o {role, permissions:{code:bool}}"}, status=status.HTTP_400_BAD_REQUEST)
        _clear_permissions_cache()
        return Response(RolePermissionSerializer(updated, many=True).data, status=status.HTTP_200_OK)


class RolePermissionBulkView(APIView):
    """Compatibilidad: PUT masivo."""

    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = "roles.edit"

    def put(self, request):
        return RolePermissionListView().post(request)
