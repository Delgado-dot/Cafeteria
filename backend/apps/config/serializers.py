"""
Serializadores de la aplicación de configuración.
"""

from rest_framework import serializers

from .models import CafeConfig


class CafeConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CafeConfig
        fields = [
            "id",
            "cafe_name",
            "cafe_description",
            "order_open_time",
            "order_close_time",
            "break_start",
            "break_end",
            "total_capacity",
            "current_capacity",
            "is_open",
            "delivery_enabled",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
