"""
Vistas de la aplicación de delivery.
"""

from rest_framework import generics

from apps.accounts.permissions import IsAdminBar

from .models import DeliveryConfig, DeliveryRequest
from .serializers import DeliveryConfigSerializer, DeliveryRequestSerializer


class DeliveryConfigRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Obtener y actualizar la configuración del delivery. GET para todos autenticados, PATCH solo adminbar."""

    queryset = DeliveryConfig.objects.all()
    serializer_class = DeliveryConfigSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            from rest_framework import permissions

            return [permissions.IsAuthenticated()]
        return [IsAdminBar()]

    def get_object(self):
        # Solo existe una configuración, se retorna la primera
        return DeliveryConfig.get_solo()


class DeliveryRequestListView(generics.ListAPIView):
    """Listar solicitudes de delivery."""

    queryset = DeliveryRequest.objects.all()
    serializer_class = DeliveryRequestSerializer
    permission_classes = [IsAdminBar]
