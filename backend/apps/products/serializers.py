"""
Serializadores de la aplicación de productos.
"""

from django.db import transaction
from pathlib import Path
from rest_framework import serializers

from .models import Addon, Category, Product

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".avif",
}
MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2 MB


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon", "order"]


class AddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Addon
        fields = ["id", "name", "price", "available"]


class ProductSerializer(serializers.ModelSerializer):
    """Serializador de productos."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    addons = AddonSerializer(many=True, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "stock",
            "min_stock",
            "prep_time",
            "available",
            "image",
            "emoji",
            "category",
            "category_name",
            "addons",
            "is_low_stock",
            "is_out_of_stock",
            "added_at",
            "updated_at",
        ]
        read_only_fields = ["id", "added_at", "updated_at"]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializador para creación/actualización de productos."""

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "stock",
            "min_stock",
            "prep_time",
            "available",
            "image",
            "emoji",
            "category",
        ]
        read_only_fields = ["id"]

    def validate_image(self, value):
        if value is None:
            return value
        extension = Path(value.name).suffix.lower() if value.name else ""
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise serializers.ValidationError(
                "La imagen debe ser JPG, JPEG, PNG, WEBP o AVIF."
            )
        if value.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError(
                "La imagen no puede superar los 2 MB."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        desired_stock = validated_data.pop("stock", 0)
        product = Product.objects.create(stock=0, **validated_data)
        if desired_stock:
            from apps.stock.models import StockMovementType

            request = self.context.get("request")
            product.adjust_stock(
                desired_stock,
                movement_type=StockMovementType.PURCHASE,
                user=getattr(request, "user", None),
                reason="Stock inicial del producto",
            )
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        desired_stock = validated_data.pop("stock", None)
        product = super().update(instance, validated_data)
        if desired_stock is not None and desired_stock != product.stock:
            from apps.stock.models import StockMovementType

            request = self.context.get("request")
            product.adjust_stock(
                desired_stock,
                movement_type=StockMovementType.ADJUSTMENT,
                user=getattr(request, "user", None),
                reason="Ajuste manual desde la API de productos",
            )
        return product
