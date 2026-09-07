"""Vistas de pagos."""

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminBar
from apps.config.models import PaymentMethod
from apps.config.serializers import PaymentMethodAdminSerializer

from .models import Payment
from .serializers import (
    ActivePaymentMethodSerializer,
    PaymentReviewSerializer,
    PaymentSerializer,
)


class PaymentMethodListView(generics.ListAPIView):
    """GET /api/payments/methods/ — solo métodos activos, para USER checkout."""

    queryset = PaymentMethod.objects.filter(active=True)
    serializer_class = ActivePaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


class PaymentMethodAdminListView(generics.ListAPIView):
    """GET /api/payments/methods/admin/ — todos los métodos, para ADMINBAR."""

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodAdminSerializer
    permission_classes = [IsAdminBar]
    pagination_class = None


class PaymentMethodDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/payments/methods/<id>/ — configuración por ADMINBAR."""

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodAdminSerializer
    permission_classes = [IsAdminBar]


class PaymentCreateView(generics.CreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyPaymentsListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.select_related("order", "user", "payment_method").filter(
            user=self.request.user
        )


class AllPaymentsListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminBar]

    def get_queryset(self):
        return Payment.objects.select_related("order", "user", "payment_method")


class PaymentReviewView(generics.UpdateAPIView):
    queryset = Payment.objects.select_related("order", "user", "payment_method")
    serializer_class = PaymentReviewSerializer
    permission_classes = [IsAdminBar]

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(pk=kwargs["pk"])
            payment.status = serializer.validated_data["status"]
            payment.reviewed_by = request.user
            payment.reviewed_at = timezone.now()
            payment.save(
                update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"]
            )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)
