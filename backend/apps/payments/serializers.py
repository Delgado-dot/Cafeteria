"""
Serializadores de la aplicación de pagos.
"""

from rest_framework import serializers

from .models import Payment, PaymentStatus


class PaymentSerializer(serializers.ModelSerializer):
    """Serializador de pagos."""

    method_label = serializers.CharField(source="get_method_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "order_number",
            "user_name",
            "method",
            "method_label",
            "status",
            "status_label",
            "amount",
            "voucher",
            "transaction_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PaymentReviewSerializer(serializers.Serializer):
    """Serializador para revisar/aprobar/rechazar un pago."""

    status = serializers.ChoiceField(
        choices=[PaymentStatus.APPROVED, PaymentStatus.REJECTED, PaymentStatus.REFUNDED]
    )
