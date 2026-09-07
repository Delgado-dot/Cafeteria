"""
Administración de la aplicación de pedidos.
"""

from django.contrib import admin

from .models import Order, OrderItem, OrderItemAddon, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "quantity", "unit_price", "note")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "user", "status", "total", "created_at")
    list_filter = ("status", "priority", "delivery_method", "created_at")
    search_fields = ("order_number", "user__username", "user__email")
    inlines = [OrderItemInline]
    readonly_fields = ("order_number", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        obj.save(changed_by=request.user)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("order", "status", "changed_by", "changed_at")
    list_filter = ("status", "changed_at")
    readonly_fields = ("order", "status", "changed_by", "changed_at", "note")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OrderItemAddon)
class OrderItemAddonAdmin(admin.ModelAdmin):
    list_display = ("order_item", "addon_name", "unit_price", "quantity", "subtotal")
    search_fields = ("order_item__order__order_number", "addon_name")
    readonly_fields = ("order_item", "addon", "addon_name", "unit_price", "quantity")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
