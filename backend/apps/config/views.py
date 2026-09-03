"""
Vistas de la aplicación de configuración.
"""

from rest_framework import generics, permissions

from apps.accounts.permissions import IsAdminBar

from .models import CafeConfig
from .serializers import CafeConfigSerializer


class CafeConfigRetrieveView(generics.RetrieveAPIView):
    """Obtener la configuración de la cafetería (público autenticado)."""

    serializer_class = CafeConfigSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return CafeConfig.get_solo()


class CafeConfigUpdateView(generics.UpdateAPIView):
    """Actualizar la configuración de la cafetería."""

    serializer_class = CafeConfigSerializer
    permission_classes = [IsAdminBar]

    def get_object(self):
        return CafeConfig.get_solo()
