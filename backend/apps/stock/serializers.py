"""Serializadores de la aplicación de stock."""

from rest_framework import serializers

from .models import StockMovement


class StockMovementSerializer(serializers.ModelSerializer):
    """Serializador de movimientos de inventario."""

    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "product_name",
            "movement_type",
            "quantity",
            "previous_stock",
            "new_stock",
            "reason",
            "reference",
            "user",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]