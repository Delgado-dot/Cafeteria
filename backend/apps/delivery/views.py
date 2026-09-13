"""
Vistas de la aplicación de delivery.
"""

from rest_framework import generics, permissions

from apps.accounts.permissions import HasRolePermission
from apps.audit.services import record_audit

from .models import DeliveryConfig, DeliveryRequest
from .serializers import DeliveryConfigSerializer, DeliveryRequestSerializer


class DeliveryConfigRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Obtener y actualizar la configuración del delivery."""

    queryset = DeliveryConfig.objects.all()
    serializer_class = DeliveryConfigSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            self.required_permission = "delivery.view"
            return [permissions.IsAuthenticated(), HasRolePermission()]
        self.required_permission = "delivery.edit"
        return [permissions.IsAuthenticated(), HasRolePermission()]

    def get_object(self):
        # Solo existe una configuración, se retorna la primera
        return DeliveryConfig.get_solo()

    def perform_update(self, serializer):
        config = serializer.save()
        record_audit(
            request=self.request,
            action="delivery.update",
            target="delivery",
            details={
                key: (value.isoformat() if hasattr(value, "isoformat") else value)
                for key, value in serializer.validated_data.items()
            },
        )


class DeliveryRequestListView(generics.ListAPIView):
    """Listar solicitudes de delivery."""

    queryset = DeliveryRequest.objects.all()
    serializer_class = DeliveryRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = "delivery.view"
