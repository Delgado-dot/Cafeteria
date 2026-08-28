"""
Vistas de la aplicación de delivery.
"""

from rest_framework import generics, permissions

from apps.accounts.permissions import IsAdminBar

from .models import DeliveryConfig, DeliveryRequest
from .serializers import DeliveryConfigSerializer, DeliveryRequestSerializer


class DeliveryConfigRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Obtener y actualizar la configuración del delivery."""

    queryset = DeliveryConfig.objects.all()
    serializer_class = DeliveryConfigSerializer
    permission_classes = [IsAdminBar]

    def get_object(self):
        # Solo existe una configuración, se retorna la primera
        obj, _ = DeliveryConfig.objects.get_or_create(pk=1)
        return obj


class DeliveryRequestListView(generics.ListAPIView):
    """Listar solicitudes de delivery."""

    queryset = DeliveryRequest.objects.all()
    serializer_class = DeliveryRequestSerializer
    permission_classes = [IsAdminBar]
