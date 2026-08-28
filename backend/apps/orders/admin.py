"""
Administración de la aplicación de pedidos.
"""

from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "user", "status", "total", "created_at")
    list_filter = ("status", "priority", "delivery_method", "created_at")
    search_fields = ("order_number", "user__username", "user__email")
    inlines = [OrderItemInline]
    readonly_fields = ("order_number", "created_at", "updated_at")


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("order", "status", "changed_by", "changed_at")
    list_filter = ("status", "changed_at")
