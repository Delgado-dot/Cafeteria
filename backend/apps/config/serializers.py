"""Serializadores de configuracion."""

from rest_framework import serializers

from .models import CafeConfig, PaymentMethod

QR_IMAGE_EXTENSIONS = ("png", "jpg", "jpeg", "webp")
QR_IMAGE_MAX_BYTES = 2 * 1024 * 1024

SITE_IMAGE_EXTENSIONS = ("png", "jpg", "jpeg", "webp")
SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024


def _validate_site_image(value):
    """Política única para imágenes de la apariencia del sistema (<=5MB, PNG/JPG/WEBP)."""
    if value is None:
        return value
    ext = (value.name.rsplit(".", 1)[-1] or "").lower()
    if ext not in SITE_IMAGE_EXTENSIONS:
        raise serializers.ValidationError(
            "Solo se aceptan imágenes PNG, JPG, JPEG o WEBP."
        )
    if value.size > SITE_IMAGE_MAX_BYTES:
        raise serializers.ValidationError(
            "La imagen no puede superar los 5 MB."
        )
    return value


def _qr_image_url(obj, request):
    if not obj.qr_image:
        return None
    url = obj.qr_image.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class CafeConfigSerializer(serializers.ModelSerializer):
    hero_background_url = serializers.SerializerMethodField(read_only=True)
    barra_atencion_image_url = serializers.SerializerMethodField(read_only=True)
    espacio_disfrutar_image_url = serializers.SerializerMethodField(read_only=True)
    cafe_snacks_image_url = serializers.SerializerMethodField(read_only=True)
    login_background_url = serializers.SerializerMethodField(read_only=True)
    login_mascot_url = serializers.SerializerMethodField(read_only=True)
    system_logo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CafeConfig
        fields = [
            "id",
            "name",
            "description",
            "order_open_time",
            "order_close_time",
            "break_start",
            "break_end",
            "total_capacity",
            "current_capacity",
            "is_open",
            "hero_background",
            "hero_background_url",
            "barra_atencion_image",
            "barra_atencion_image_url",
            "espacio_disfrutar_image",
            "espacio_disfrutar_image_url",
            "cafe_snacks_image",
            "cafe_snacks_image_url",
            "login_background",
            "login_background_url",
            "login_mascot",
            "login_mascot_url",
            "system_logo",
            "system_logo_url",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "updated_at",
            "hero_background_url",
            "barra_atencion_image_url",
            "espacio_disfrutar_image_url",
            "cafe_snacks_image_url",
            "login_background_url",
            "login_mascot_url",
            "system_logo_url",
        ]

    def _absolute_image_url(self, image):
        if not image:
            return None
        url = image.url
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_hero_background_url(self, obj):
        return self._absolute_image_url(obj.hero_background)

    def get_barra_atencion_image_url(self, obj):
        return self._absolute_image_url(obj.barra_atencion_image)

    def get_espacio_disfrutar_image_url(self, obj):
        return self._absolute_image_url(obj.espacio_disfrutar_image)

    def get_cafe_snacks_image_url(self, obj):
        return self._absolute_image_url(obj.cafe_snacks_image)

    def get_login_background_url(self, obj):
        return self._absolute_image_url(obj.login_background)

    def get_login_mascot_url(self, obj):
        return self._absolute_image_url(obj.login_mascot)

    def get_system_logo_url(self, obj):
        return self._absolute_image_url(obj.system_logo)

    def validate_hero_background(self, value):
        return _validate_site_image(value)

    def validate_login_background(self, value):
        return _validate_site_image(value)

    def validate_login_mascot(self, value):
        return _validate_site_image(value)

    def validate_system_logo(self, value):
        return _validate_site_image(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        total = attrs.get("total_capacity", getattr(self.instance, "total_capacity", 0))
        current = attrs.get(
            "current_capacity", getattr(self.instance, "current_capacity", 0)
        )
        if current > total:
            raise serializers.ValidationError(
                {"current_capacity": "No puede superar la capacidad total."}
            )
        return attrs


class PaymentMethodSerializer(serializers.ModelSerializer):
    qr_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "code",
            "name",
            "description",
            "active",
            "requires_voucher",
            "instructions",
            "order",
            "bank_name",
            "account_holder",
            "account_type",
            "account_number",
            "holder_id",
            "phone",
            "qr_info",
            "qr_image",
            "qr_image_url",
        ]
        read_only_fields = fields

    def get_qr_image_url(self, obj):
        return _qr_image_url(obj, self.context.get("request"))


class PaymentMethodAdminSerializer(serializers.ModelSerializer):
    qr_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "code",
            "name",
            "description",
            "active",
            "requires_voucher",
            "instructions",
            "order",
            "bank_name",
            "account_holder",
            "account_type",
            "account_number",
            "holder_id",
            "phone",
            "qr_info",
            "qr_image",
            "qr_image_url",
        ]
        read_only_fields = ["id", "code", "created_at", "updated_at"]

    def get_qr_image_url(self, obj):
        return _qr_image_url(obj, self.context.get("request"))

    def validate_qr_image(self, value):
        if value is None:
            return value
        ext = (value.name.rsplit(".", 1)[-1] or "").lower()
        if ext not in QR_IMAGE_EXTENSIONS:
            raise serializers.ValidationError(
                "Solo se aceptan imágenes PNG, JPG, JPEG o WEBP."
            )
        if value.size > QR_IMAGE_MAX_BYTES:
            raise serializers.ValidationError(
                "La imagen no puede superar los 2 MB."
            )
        return value
