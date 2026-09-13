"""Administracion de la configuracion."""

from django.contrib import admin

from .models import CafeConfig, PaymentMethod


@admin.register(CafeConfig)
class CafeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "is_open",
        "order_open_time",
        "order_close_time",
        "break_start",
        "break_end",
        "total_capacity",
        "current_capacity",
        "hero_background",
    )
    fields = (
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
        "updated_at",
    )
    readonly_fields = ("updated_at",)

    def has_add_permission(self, request):
        return not CafeConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "active", "requires_voucher", "order")
    list_filter = ("active", "requires_voucher")
    search_fields = ("name", "code", "description")
    list_editable = ("active", "order")
    fields = (
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
    )
