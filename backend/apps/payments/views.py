"""Vistas de pagos."""

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from rest_framework import permissions as drf_permissions

from apps.accounts.permissions import HasRolePermission
from apps.audit.services import record_audit
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
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "payments.create"
    pagination_class = None


class PaymentMethodAdminListView(generics.ListAPIView):
    """GET /api/payments/methods/admin/ — todos los métodos, para ADMINBAR."""

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodAdminSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "payments.view_all"
    pagination_class = None


class PaymentMethodDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/payments/methods/<id>/ — configuración por ADMINBAR."""

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodAdminSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = {"GET": "payments.view_all", "PATCH": "payments.view_all", "PUT": "payments.view_all"}

    def perform_update(self, serializer):
        method = serializer.save()
        record_audit(
            request=self.request,
            action="payment_method.update",
            target=f"payment_method:{method.pk} ({method.name})",
            details={
                key: (value.isoformat() if hasattr(value, "isoformat") else value)
                for key, value in serializer.validated_data.items()
            },
        )


class PaymentCreateView(generics.CreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "payments.create"

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyPaymentsListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "payments.view_own"

    def get_queryset(self):
        return Payment.objects.select_related("order", "user", "payment_method").filter(
            user=self.request.user
        )


class AllPaymentsListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "payments.view_all"

    def get_queryset(self):
        return Payment.objects.select_related("order", "user", "payment_method")


class PaymentReviewView(generics.UpdateAPIView):
    queryset = Payment.objects.select_related("order", "user", "payment_method")
    serializer_class = PaymentReviewSerializer
    permission_classes = [drf_permissions.IsAuthenticated, HasRolePermission]
    required_permission = "payments.review"

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(pk=kwargs["pk"])
            previous_status = payment.status
            payment.status = serializer.validated_data["status"]
            payment.reviewed_by = request.user
            payment.reviewed_at = timezone.now()
            payment.save(
                update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"]
            )

        record_audit(
            request=request,
            action="payment.review",
            target=f"payment:{payment.pk} (order:{payment.order_id})",
            details={
                "from": previous_status,
                "to": payment.status,
                "order": payment.order_id,
            },
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)
