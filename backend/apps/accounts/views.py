"""
Vistas de la aplicación de cuentas.
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RolePermissionSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .permissions import HasRolePermission, IsAdminDeveloper

User = get_user_model()


class RegisterView(APIView):
    """Registro de un nuevo usuario (acceso público)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
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
    """Login con JWT."""

    pass


class UserListView(generics.ListAPIView):
    """Listar todos los usuarios (solo admin dev)."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminDeveloper]
    search_fields = ["username", "email", "first_name", "last_name"]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, actualizar o eliminar un usuario."""

    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAdminDeveloper]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return UserSerializer
        return UserUpdateSerializer


class MeView(APIView):
    """Vista del usuario autenticado."""

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


# --- Roles y permisos (funcional, no en blanco) ---
from .models import RolePermission  # noqa: E402


class RolePermissionListView(APIView):
    """Listar / actualizar permisos por rol. Solo admindev."""

    permission_classes = [IsAdminDeveloper]

    def get(self, request):
        role = request.query_params.get("role")
        qs = RolePermission.objects.all()
        if role:
            qs = qs.filter(role=role)
        return Response(RolePermissionSerializer(qs, many=True).data)

    def post(self, request):
        # bulk upsert: { role, permissions: {code: bool} } o { role, code, enabled }
        data = request.data
        updated = []
        if "permissions" in data and "role" in data:
            role = data["role"]
            perms = data["permissions"]
            for code, enabled in perms.items():
                obj, _ = RolePermission.objects.update_or_create(
                    role=role, code=code, defaults={"enabled": bool(enabled), "updated_by": request.user}
                )
                updated.append(obj)
        elif "role" in data and "code" in data:
            obj, _ = RolePermission.objects.update_or_create(
                role=data["role"], code=data["code"], defaults={"enabled": bool(data.get("enabled", False)), "updated_by": request.user}
            )
            updated.append(obj)
        else:
            return Response({"detail": "Formato inválido. Use {role, code, enabled} o {role, permissions:{code:bool}}"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(RolePermissionSerializer(updated, many=True).data, status=status.HTTP_200_OK)


class RolePermissionBulkView(APIView):
    """Compatibilidad: PUT masivo."""

    permission_classes = [IsAdminDeveloper]

    def put(self, request):
        return RolePermissionListView().post(request)
