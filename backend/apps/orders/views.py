"""Vistas de pedidos."""

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminBar
from apps.payments.models import Payment, PaymentStatus

from .models import Order, OrderStatus
from .serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
)


def order_queryset():
    return Order.objects.select_related(
        "user", "delivery_request", "payment", "payment__payment_method"
    ).prefetch_related("order_items", "order_items__item_addons")


class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output = OrderSerializer(
            serializer.instance, context=self.get_serializer_context()
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class MyOrdersListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return order_queryset().filter(user=self.request.user)


class AllOrdersListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminBar]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "priority", "delivery_method"]

    def get_queryset(self):
        return order_queryset()


class OrderDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return order_queryset()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return OrderStatusUpdateSerializer
        return OrderSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_object(self):
        obj = super().get_object()
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
        new_status = serializer.validated_data["status"]

        if request.user.role == "user":
            if new_status != OrderStatus.CANCELLED:
                self.permission_denied(request)
            if obj.status not in (OrderStatus.QUEUE, OrderStatus.CONFIRMED):
                raise ValidationError(
                    {"status": "Solo puede cancelar pedidos en cola o confirmados."}
                )

        with transaction.atomic():
            transitioned = obj.transition_to(
                new_status,
                changed_by=request.user,
                note=serializer.validated_data.get("note", ""),
            )
            if transitioned and new_status == OrderStatus.CANCELLED:
                from apps.products.models import Product
                from apps.stock.models import StockMovementType

                for item in obj.order_items.all():
                    if item.product_id:
                        product = Product.objects.select_for_update().get(pk=item.product_id)
                        product.adjust_stock(
                            product.stock + item.quantity,
                            movement_type=StockMovementType.RETURN,
                            user=request.user,
                            reason=f"Cancelacion del pedido {obj.order_number}",
                            reference=obj.order_number,
                        )
            if new_status == OrderStatus.DELIVERED:
                payment = Payment.objects.select_for_update().filter(order=obj).first()
                if payment and payment.status in (
                    PaymentStatus.PENDING,
                    PaymentStatus.APPROVED,
                ):
                    payment.status = PaymentStatus.PAID
                    payment.reviewed_by = request.user
                    from django.utils import timezone

                    payment.reviewed_at = timezone.now()
                    payment.save(
                        update_fields=[
                            "status",
                            "reviewed_by",
                            "reviewed_at",
                            "updated_at",
                        ]
                    )

        obj = order_queryset().get(pk=obj.pk)
        return Response(OrderSerializer(obj).data, status=status.HTTP_200_OK)
