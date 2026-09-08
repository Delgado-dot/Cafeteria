"""Serializadores de pagos normalizados."""

from rest_framework import serializers

from apps.config.models import PaymentMethod
from apps.config.serializers import PaymentMethodSerializer

from .models import Payment, PaymentStatus


class PaymentSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(
        source="payment_method.name", read_only=True
    )
    payment_method_code = serializers.CharField(
        source="payment_method.code", read_only=True
    )
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
            "payment_method",
            "payment_method_code",
            "payment_method_name",
            "status",
            "status_label",
            "amount",
            "voucher",
            "transaction_id",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "amount",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        order = attrs.get("order")
        payment_method = attrs.get("payment_method")
        voucher = attrs.get("voucher")

        if request and order and order.user_id != request.user.id:
            raise serializers.ValidationError(
                {"order": "No puede registrar el pago de un pedido ajeno."}
            )
        if payment_method and not payment_method.active:
            raise serializers.ValidationError(
                {"payment_method": "El metodo de pago esta deshabilitado."}
            )
        if payment_method and payment_method.requires_voucher and not voucher:
            raise serializers.ValidationError(
                {"voucher": "Este metodo de pago requiere comprobante."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["amount"] = validated_data["order"].total
        return super().create(validated_data)


class PaymentReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[PaymentStatus.APPROVED, PaymentStatus.REJECTED, PaymentStatus.REFUNDED]
    )


class ActivePaymentMethodSerializer(PaymentMethodSerializer):
    class Meta(PaymentMethodSerializer.Meta):
        model = PaymentMethod
