"""
Vistas de la aplicación de configuración.
"""

from rest_framework import generics, permissions

from apps.accounts.permissions import HasRolePermission
from apps.audit.services import record_audit

from .models import CafeConfig
from .serializers import CafeConfigSerializer


class CafeConfigRetrieveView(generics.RetrieveAPIView):
    """Obtener la configuración de la cafetería (público para landing)."""

    serializer_class = CafeConfigSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return CafeConfig.get_solo()


class CafeConfigUpdateView(generics.UpdateAPIView):
    """Actualizar la configuración de la cafetería."""

    serializer_class = CafeConfigSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = "config.edit"

    def get_object(self):
        return CafeConfig.get_solo()

    def perform_update(self, serializer):
        config = serializer.save()
        record_audit(
            request=self.request,
            action="config.update",
            target="cafeteria",
            details={
                key: (value.isoformat() if hasattr(value, "isoformat") else value)
                for key, value in serializer.validated_data.items()
            },
        )
