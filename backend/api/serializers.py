from rest_framework import serializers
from django.db import transaction
from .models import *

class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'

class ItemPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPedido
        fields = '__all__'
        read_only_fields = ('pedido',)

class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True)

    class Meta:
        model = Pedido
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        with transaction.atomic():
            pedido = Pedido.objects.create(**validated_data)
            ItemPedido.objects.bulk_create(
                [ItemPedido(pedido=pedido, **item_data) for item_data in items_data]
            )
        return pedido

class MovimientoStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoStock
        fields = '__all__'

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'

class ConfiguracionCafeteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionCafeteria
        fields = '__all__'

class PerfilAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilAdmin
        fields = '__all__'
