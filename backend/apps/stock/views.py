"""Vistas de la aplicación de stock."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions

from rest_framework import permissions as drf_permissions

from apps.accounts.permissions import HasRolePermission

from .models import StockMovement
from .serializers import StockMovementSerializer


class StockMovementListView(generics.ListAPIView):
    """Listar movimientos de inventario."""

    queryset = StockMovement.objects.select_related("product", "user")
    serializer_class = StockMovementSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "stock.view"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["product", "movement_type"]
    search_fields = ["product__name", "reason", "reference"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]