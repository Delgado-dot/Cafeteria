"""
Vistas de la aplicación de productos.
"""

from django.db.models.deletion import ProtectedError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import HasRolePermission
from apps.audit.services import record_audit

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductCreateUpdateSerializer,
    ProductSerializer,
)


class CategoryListView(generics.ListCreateAPIView):
    """Listar y crear categorías. GET público, POST requiere products.create."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), HasRolePermission()]
        return [permissions.AllowAny()]

    required_permission = "products.create"


class ProductListView(generics.ListCreateAPIView):
    """Listar y crear productos."""

    queryset = Product.objects.select_related("category").prefetch_related("addons")
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
            return [permissions.IsAuthenticated(), HasRolePermission()]
        return [permissions.AllowAny()]

    required_permission = "products.create"

    def perform_create(self, serializer):
        product = serializer.save()
        record_audit(
            request=self.request,
            action="product.create",
            target=f"product:{product.pk} ({product.name})",
            details={
                "name": product.name,
                "price": str(product.price),
                "stock": product.stock,
                "category": product.category_id,
            },
        )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, actualizar o eliminar un producto."""

    queryset = Product.objects.select_related("category").prefetch_related("addons")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            self.required_permission = "products.edit"
            return [permissions.IsAuthenticated(), HasRolePermission()]
        if self.request.method == "DELETE":
            self.required_permission = "products.delete"
            return [permissions.IsAuthenticated(), HasRolePermission()]
        return [permissions.AllowAny()]

    def perform_update(self, serializer):
        instance = serializer.instance
        previous_stock = instance.stock
        previous_available = instance.available
        product = serializer.save()
        details = {k: v for k, v in serializer.validated_data.items()}
        details["stock"] = {"from": previous_stock, "to": product.stock}
        details["available"] = {"from": previous_available, "to": product.available}
        record_audit(
            request=self.request,
            action="product.update",
            target=f"product:{product.pk} ({product.name})",
            details=details,
        )

    def destroy(self, request, *args, **kwargs):
        """Elimina un producto respetando la integridad referencial (PROTECT)."""
        instance = self.get_object()
        target = f"product:{instance.pk} ({instance.name})"
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            record_audit(
                request=request,
                action="product.delete_failed",
                target=target,
                details={"reason": "registros relacionados protegidos"},
            )
            return Response(
                {
                    "detail": "No se puede eliminar el producto porque tiene registros relacionados de stock, pedidos u otros movimientos."
                },
                status=status.HTTP_409_CONFLICT,
            )
        record_audit(
            request=request,
            action="product.delete",
            target=target,
            details={"deleted": True},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
