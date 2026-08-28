"""
Vistas de la aplicación de cuentas.
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import UserCreateSerializer, UserSerializer, UserUpdateSerializer
from .permissions import IsAdminDeveloper

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
