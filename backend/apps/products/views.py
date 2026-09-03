"""
Vistas de la aplicación de productos.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions

from apps.accounts.permissions import IsAdminBar

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductCreateUpdateSerializer,
    ProductSerializer,
)


class CategoryListView(generics.ListCreateAPIView):
    """Listar y crear categorías."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name"]


class ProductListView(generics.ListCreateAPIView):
    """Listar y crear productos."""

    queryset = Product.objects.select_related("category").prefetch_related("addons")
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "available"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "stock", "added_at"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminBar()]
        return [permissions.IsAuthenticated()]


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, actualizar o eliminar un producto."""

    queryset = Product.objects.select_related("category").prefetch_related("addons")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAdminBar()]
        return [permissions.IsAuthenticated()]
