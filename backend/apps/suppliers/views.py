"""Vistas de la aplicación de proveedores."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions

from apps.accounts.permissions import IsAdminBar

from .models import Supplier
from .serializers import SupplierSerializer


class SupplierListView(generics.ListCreateAPIView):
    """Listar y crear proveedores. Solo adminbar (admindev puede supervisar)."""

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminBar]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["active"]
    search_fields = ["name", "contact_name", "email", "tax_id"]
    ordering_fields = ["name", "created_at"]


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, actualizar o eliminar un proveedor."""

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminBar]