"""
Serializadores de la aplicación de pedidos.
"""

from rest_framework import serializers

from apps.products.models import Product

from .models import Order, OrderItem, OrderStatus


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializador de items de pedido."""

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        write_only=True,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "product_name",
            "quantity",
            "unit_price",
            "addons",
            "note",
            "line_total",
        ]
        read_only_fields = ["id", "line_total"]


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializador para crear un pedido."""

    items = OrderItemSerializer(many=True, write_only=True)
    delivery_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "priority",
            "delivery_method",
            "delivery_piso",
            "delivery_aula",
            "total",
            "estimated_time",
            "note",
            "items",
            "delivery_info",
            "created_at",
        ]
        read_only_fields = ["id", "order_number", "status", "total", "created_at"]

    def get_delivery_info(self, obj):
        if obj.delivery_method == "delivery":
            return {"piso": obj.delivery_piso, "aula": obj.delivery_aula}
        return None

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        user = validated_data.pop("user", self.context["request"].user)
        order = Order.objects.create(user=user, **validated_data)

        for item_data in items_data:
            product = item_data.pop("product")
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                **item_data,
            )
            # Reducir stock
            product.decrease_stock(item_data.get("quantity", 1))

        order.calculate_total()
        return order


class OrderSerializer(serializers.ModelSerializer):
    """Serializador de lectura de pedidos."""

    items = OrderItemSerializer(source="order_items", many=True, read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    delivery_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "user_name",
            "user_email",
            "status",
            "status_label",
            "priority",
            "delivery_method",
            "delivery_info",
            "total",
            "estimated_time",
            "note",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_delivery_info(self, obj):
        if obj.delivery_method == "delivery":
            return {"piso": obj.delivery_piso, "aula": obj.delivery_aula}
        return None


class OrderStatusUpdateSerializer(serializers.Serializer):
    """Serializador para actualizar el estado de un pedido."""

    status = serializers.ChoiceField(choices=OrderStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True)
