from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from django.contrib.auth import get_user_model
from .models import *

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = getattr(user, 'role', 'user')
        token['name'] = getattr(user, 'name', user.get_full_name() or user.username)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'name': getattr(self.user, 'name', self.user.get_full_name() or self.user.username),
            'role': getattr(self.user, 'role', 'user'),
        }
        return data

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    pass

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'password_confirm', 'name', 'role')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'role', 'cargo', 'aula', 'active', 'avatar', 'avatar_url', 'last_login', 'date_joined')
        read_only_fields = ('id', 'last_login', 'date_joined', 'avatar_url')
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Las contraseñas no coinciden.'})
        return attrs

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
    foto_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PerfilAdmin
        fields = '__all__'
        read_only_fields = ('foto_url',)
    
    def get_foto_url(self, obj):
        if obj.foto:
            return obj.foto.url
        return None


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
    folder = serializers.CharField(required=False, default='uploads')
