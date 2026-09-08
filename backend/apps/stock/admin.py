"""Administracion de movimientos de inventario."""

from django.contrib import admin

from .models import StockMovement


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "movement_type",
        "quantity",
        "previous_stock",
        "new_stock",
        "user",
        "created_at",
    )
    list_filter = ("movement_type", "created_at")
    search_fields = ("product__name", "reason", "reference", "user__email")
    readonly_fields = (
        "product",
        "movement_type",
        "quantity",
        "previous_stock",
        "new_stock",
        "reason",
        "reference",
        "user",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
