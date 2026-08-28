"""
Serializadores de la aplicación de productos.
"""

from rest_framework import serializers

from .models import Addon, Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon", "order"]


class AddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Addon
        fields = ["id", "name", "price"]


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
