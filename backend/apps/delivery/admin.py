"""Administracion de delivery."""

from django.contrib import admin

from .models import DeliveryConfig, DeliveryRequest


@admin.register(DeliveryConfig)
class DeliveryConfigAdmin(admin.ModelAdmin):
    list_display = (
        "enabled",
        "start_time",
        "end_time",
        "current_capacity",
        "max_capacity",
    )

    def has_add_permission(self, request):
        return not DeliveryConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DeliveryRequest)
class DeliveryRequestAdmin(admin.ModelAdmin):
    list_display = ("order", "piso", "aula", "created_at")
    search_fields = ("order__order_number", "aula")
    readonly_fields = ("created_at",)
