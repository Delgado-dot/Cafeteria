"""
Vistas de la aplicación de pagos.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminBar

from .models import Payment
from .serializers import PaymentReviewSerializer, PaymentSerializer


class PaymentCreateView(generics.CreateAPIView):
    """Crear un pago para un pedido."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyPaymentsListView(generics.ListAPIView):
    """Listar los pagos del usuario autenticado."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by("-created_at")


class AllPaymentsListView(generics.ListAPIView):
    """Listar todos los pagos (solo administradores)."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAdminBar]

    def get_queryset(self):
        return Payment.objects.select_related("order", "user").order_by("-created_at")


class PaymentReviewView(generics.UpdateAPIView):
    """Revisar y aprobar/rechazar un pago."""

    queryset = Payment.objects.all()
    serializer_class = PaymentReviewSerializer
    permission_classes = [IsAdminBar]

    def update(self, request, *args, **kwargs):
        payment = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment.status = serializer.validated_data["status"]
        payment.reviewed_by = request.user
        from django.utils import timezone
        payment.reviewed_at = timezone.now()
        payment.save()

        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)
