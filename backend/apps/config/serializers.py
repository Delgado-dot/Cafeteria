"""Serializadores de configuracion."""

from rest_framework import serializers

from .models import CafeConfig, PaymentMethod


class CafeConfigSerializer(serializers.ModelSerializer):
    hero_background_url = serializers.SerializerMethodField(read_only=True)

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
            "hero_background",
            "hero_background_url",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at", "hero_background_url"]

    def get_hero_background_url(self, obj):
        if not obj.hero_background:
            return None
        url = obj.hero_background.url
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url

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
