"""Serializadores de configuracion."""

from rest_framework import serializers

from .models import CafeConfig, PaymentMethod


class CafeConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CafeConfig
        fields = [
            "id",
            "name",
            "description",
            "order_open_time",
            "order_close_time",
            "break_start",
            "break_end",
            "total_capacity",
            "current_capacity",
            "is_open",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        total = attrs.get("total_capacity", getattr(self.instance, "total_capacity", 0))
        current = attrs.get(
            "current_capacity", getattr(self.instance, "current_capacity", 0)
        )
        if current > total:
            raise serializers.ValidationError(
                {"current_capacity": "No puede superar la capacidad total."}
            )
        return attrs


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "code",
            "name",
            "description",
            "active",
            "requires_voucher",
            "instructions",
            "order",
            "bank_name",
            "account_holder",
            "account_type",
            "account_number",
            "holder_id",
            "phone",
            "qr_info",
        ]
        read_only_fields = fields


class PaymentMethodAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "code",
            "name",
            "description",
            "active",
            "requires_voucher",
            "instructions",
            "order",
            "bank_name",
            "account_holder",
            "account_type",
            "account_number",
            "holder_id",
            "phone",
            "qr_info",
        ]
        read_only_fields = ["id", "code", "created_at", "updated_at"]
