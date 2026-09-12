"""Serializadores de la aplicación de proveedores."""

from rest_framework import serializers

from .models import ProductSupplier, Supplier


class ProductSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSupplier
        fields = [
            "id",
            "product",
            "supplier",
            "supplier_code",
            "cost_price",
            "is_primary",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SupplierSerializer(serializers.ModelSerializer):
    """Serializador de proveedores."""

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "contact_name",
            "phone",
            "email",
            "address",
            "tax_id",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]