"""
Vistas de la aplicación de pedidos.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminBar, IsOwnerOrAdmin

from .models import Order, OrderStatus
from .serializers import OrderCreateSerializer, OrderSerializer, OrderStatusUpdateSerializer


class OrderCreateView(generics.CreateAPIView):
    """Crear un nuevo pedido."""

    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyOrdersListView(generics.ListAPIView):
    """Listar los pedidos del usuario autenticado."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("order_items")
            .order_by("-created_at")
        )


class AllOrdersListView(generics.ListAPIView):
    """Listar todos los pedidos (solo administradores)."""

    serializer_class = OrderSerializer
    permission_classes = [IsAdminBar]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "priority", "delivery_method"]

    def get_queryset(self):
        return Order.objects.prefetch_related("order_items").order_by("-created_at")


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """Ver o actualizar un pedido específico."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.prefetch_related("order_items")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return OrderStatusUpdateSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAdminBar()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        obj = super().get_object()
        # Solo el propietario o admin pueden ver el pedido
        if not (
            self.request.user == obj.user
            or self.request.user.role in ("adminbar", "admindev")
        ):
            self.permission_denied(self.request)
        return obj

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        obj.status = serializer.validated_data["status"]
        if obj.status == OrderStatus.DELIVERED and obj.payment_status == "pending":
            from apps.payments.models import PaymentStatus
            obj.payment_status = PaymentStatus.PAID
        obj.save()

        return Response(OrderSerializer(obj).data, status=status.HTTP_200_OK)
