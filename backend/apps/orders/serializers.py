"""Serializadores y flujo transaccional de creacion de pedidos."""

import json
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.config.models import PaymentMethod
from apps.delivery.models import DeliveryConfig, DeliveryRequest
from apps.payments.models import Payment
from apps.products.models import Addon, Product

from .models import DeliveryMethod, Order, OrderItem, OrderItemAddon, OrderStatus


class OrderItemAddonSerializer(serializers.ModelSerializer):
    addon_id = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItemAddon
        fields = ["id", "addon_id", "addon_name", "unit_price", "quantity", "subtotal"]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(read_only=True)
    addons = OrderItemAddonSerializer(source="item_addons", many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
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
            "subtotal",
            "line_total",
        ]
        read_only_fields = fields


class AddonSelectionSerializer(serializers.Serializer):
    addon_id = serializers.PrimaryKeyRelatedField(
        queryset=Addon.objects.all(), source="addon"
    )
    quantity = serializers.IntegerField(min_value=1, required=False)


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product"
    )
    quantity = serializers.IntegerField(min_value=1)
    addons = AddonSelectionSerializer(many=True, required=False, default=list)
    note = serializers.CharField(
        max_length=300, required=False, allow_blank=True, default=""
    )


class DeliveryInfoSerializer(serializers.Serializer):
    piso = serializers.IntegerField(min_value=0)
    aula = serializers.CharField(max_length=20, allow_blank=False)


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)
    delivery_info = DeliveryInfoSerializer(required=False, write_only=True)
    payment_method = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.filter(active=True),
        required=False,
        write_only=True,
    )
    voucher = serializers.FileField(required=False, allow_null=True, write_only=True)
    transaction_id = serializers.CharField(
        max_length=100, required=False, allow_blank=True, write_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "priority",
            "delivery_method",
            "note",
            "items",
            "delivery_info",
            "payment_method",
            "voucher",
            "transaction_id",
            "created_at",
        ]
        read_only_fields = ["id", "order_number", "created_at"]

    def to_internal_value(self, data):
        """Decode nested fields sent as JSON alongside a multipart voucher."""
        if hasattr(data, "dict"):
            data = data.dict()
        elif hasattr(data, "copy"):
            data = data.copy()
        for field in ("items", "delivery_info"):
            value = data.get(field)
            if isinstance(value, str):
                try:
                    data[field] = json.loads(value)
                except json.JSONDecodeError:
                    raise serializers.ValidationError({field: "Debe contener JSON valido."})
        return super().to_internal_value(data)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "El pedido debe incluir al menos un producto."
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        delivery_method = attrs.get("delivery_method", DeliveryMethod.PICKUP)
        delivery_info = attrs.get("delivery_info")
        payment_method = attrs.get("payment_method")
        voucher = attrs.get("voucher")

        if delivery_method == DeliveryMethod.DELIVERY:
            if not delivery_info:
                raise serializers.ValidationError(
                    {"delivery_info": "Piso y aula son obligatorios para delivery."}
                )
            config = DeliveryConfig.get_solo()
            if not config.enabled:
                raise serializers.ValidationError(
                    {"delivery_method": "El servicio de delivery esta deshabilitado."}
                )
        elif delivery_info:
            raise serializers.ValidationError(
                {"delivery_info": "No envie ubicacion para pedidos de retiro."}
            )

        if payment_method and payment_method.requires_voucher and not voucher:
            raise serializers.ValidationError(
                {"voucher": "Este metodo de pago requiere comprobante."}
            )
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        delivery_info = validated_data.pop("delivery_info", None)
        payment_method = validated_data.pop("payment_method", None)
        voucher = validated_data.pop("voucher", None)
        transaction_id = validated_data.pop("transaction_id", "")
        user = validated_data.pop("user", self.context["request"].user)

        with transaction.atomic():
            order = Order(user=user, **validated_data)
            order.save(changed_by=user)
            total = Decimal("0.00")
            estimated_time = 0

            for item_data in items_data:
                requested_product = item_data["product"]
                product = Product.objects.select_for_update().get(
                    pk=requested_product.pk
                )
                if not product.available:
                    raise serializers.ValidationError(
                        {"items": f"El producto {product.name} no esta disponible."}
                    )

                quantity = item_data["quantity"]
                if product.stock < quantity:
                    raise serializers.ValidationError(
                        {
                            "items": (
                                f"Stock insuficiente para {product.name}. "
                                f"Disponible: {product.stock}"
                            )
                        }
                    )
                selections = item_data.get("addons", [])
                selected_ids = [selection["addon"].pk for selection in selections]
                if len(selected_ids) != len(set(selected_ids)):
                    raise serializers.ValidationError(
                        {"items": f"Hay adicionales duplicados para {product.name}."}
                    )

                locked_addons = {
                    addon.pk: addon
                    for addon in Addon.objects.select_for_update().filter(
                        pk__in=selected_ids
                    )
                }
                order_item = OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    quantity=quantity,
                    unit_price=product.price,
                    note=item_data.get("note", ""),
                )
                item_total = product.price * quantity

                for selection in selections:
                    addon = locked_addons.get(selection["addon"].pk)
                    if (
                        not addon
                        or addon.product_id != product.pk
                        or not addon.available
                    ):
                        raise serializers.ValidationError(
                            {
                                "items": f"Adicional invalido o no disponible para {product.name}."
                            }
                        )
                    addon_quantity = selection.get("quantity", quantity)
                    OrderItemAddon.objects.create(
                        order_item=order_item,
                        addon=addon,
                        addon_name=addon.name,
                        unit_price=addon.price,
                        quantity=addon_quantity,
                    )
                    item_total += addon.price * addon_quantity

                product.decrease_stock(
                    quantity,
                    user=user,
                    reason=f"Venta del pedido {order.order_number}",
                    reference=order.order_number,
                )
                total += item_total
                estimated_time += product.prep_time * quantity

            order.total = total
            order.estimated_time = max(5, estimated_time)
            order.save(update_fields=["total", "estimated_time", "updated_at"])

            if delivery_info:
                DeliveryRequest.objects.create(order=order, **delivery_info)

            if payment_method:
                Payment.objects.create(
                    order=order,
                    user=user,
                    payment_method=payment_method,
                    amount=total,
                    voucher=voucher,
                    transaction_id=transaction_id,
                )

        return order


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source="order_items", many=True, read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    delivery_info = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

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
            "payment_status",
            "total",
            "estimated_time",
            "note",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_delivery_info(self, obj):
        delivery = getattr(obj, "delivery_request", None)
        if not delivery:
            return None
        return {"piso": delivery.piso, "aula": delivery.aula}

    def get_payment_status(self, obj):
        payment = getattr(obj, "payment", None)
        return payment.status if payment else None


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=200)
