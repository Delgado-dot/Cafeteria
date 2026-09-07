from rest_framework import serializers
from .models import *

class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'

class ItemPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPedido
        fields = '__all__'

class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True, read_only=True)
    class Meta:
        model = Pedido
        fields = '__all__'

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
