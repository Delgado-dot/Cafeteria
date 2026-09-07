"""
Serializadores de la aplicación de delivery.
"""

from rest_framework import serializers

from .models import DeliveryConfig, DeliveryRequest


class DeliveryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryConfig
        fields = [
            "id",
            "enabled",
            "start_time",
            "end_time",
            "max_capacity",
            "current_capacity",
            "delivery_days",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate_delivery_days(self, value):
        if not isinstance(value, list) or any(
            not isinstance(day, int) for day in value
        ):
            raise serializers.ValidationError(
                "Debe ser una lista de dias numericos (0 a 6)."
            )
        if len(value) != len(set(value)) or any(day < 0 or day > 6 for day in value):
            raise serializers.ValidationError(
                "Los dias deben ser unicos y estar entre 0 y 6."
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        maximum = attrs.get("max_capacity", getattr(self.instance, "max_capacity", 0))
        current = attrs.get(
            "current_capacity", getattr(self.instance, "current_capacity", 0)
        )
        errors = {}
        if start and end and start >= end:
            errors["end_time"] = "Debe ser posterior a la hora de inicio."
        if current > maximum:
            errors["current_capacity"] = "No puede superar la capacidad maxima."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class DeliveryRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRequest
        fields = ["id", "order", "piso", "aula", "created_at"]
        read_only_fields = ["id", "created_at"]
