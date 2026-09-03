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


class DeliveryRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRequest
        fields = ["id", "order", "piso", "aula", "created_at"]
        read_only_fields = ["id", "created_at"]
