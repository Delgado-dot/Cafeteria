"""
Serializadores de la aplicación de cuentas.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile

User = get_user_model()


class UsernameOrEmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Issue JWT tokens using either the username or the unique email address."""

    def validate(self, attrs):
        login = attrs.get(self.username_field)
        if login:
            user = User.objects.filter(email__iexact=login).only("username").first()
            if user:
                attrs[self.username_field] = user.get_username()

        data = super().validate(attrs)
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.last_access = timezone.now()
        profile.save(update_fields=["last_access"])
        return data


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
            "avatar",
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
        read_only_fields = ["id", "role"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


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
            "avatar",
            "is_active",
        ]


class SelfUserUpdateSerializer(serializers.ModelSerializer):
    """Campos que un usuario puede modificar sin elevar sus privilegios."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "cargo", "aula", "avatar"]


class PasswordChangeSerializer(serializers.Serializer):
    """Validate the current password before storing a new hashed password."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("La contraseña actual no es correcta.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class RolePermissionSerializer(serializers.ModelSerializer):
    """Serializador de permisos por rol."""

    class Meta:
        from .models import RolePermission

        model = RolePermission
        fields = ["id", "role", "code", "enabled", "updated_at"]
        read_only_fields = ["id", "updated_at"]

    def validate_role(self, value):
        from .constants import VALID_ROLES

        if value not in VALID_ROLES:
            raise serializers.ValidationError(f"Rol no válido. Permitidos: {', '.join(sorted(VALID_ROLES))}")
        return value

    def validate_code(self, value):
        from .constants import PERMISSIONS_CATALOG

        if value not in PERMISSIONS_CATALOG:
            raise serializers.ValidationError(f"Código de permiso no existe: {value}")
        return value

