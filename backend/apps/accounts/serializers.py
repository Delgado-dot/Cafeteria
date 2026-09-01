"""
Serializadores de la aplicación de cuentas.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializador del usuario."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "cargo",
            "aula",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializador para la creación de un usuario."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
            "cargo",
            "aula",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializador para actualización de un usuario."""

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "role",
            "cargo",
            "aula",
            "is_active",
        ]


class RolePermissionSerializer(serializers.ModelSerializer):
    """Serializador de permisos por rol."""

    class Meta:
        from .models import RolePermission

        model = RolePermission
        fields = ["id", "role", "code", "enabled", "updated_at"]
        read_only_fields = ["id", "updated_at"]
