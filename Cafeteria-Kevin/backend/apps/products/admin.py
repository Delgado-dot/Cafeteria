"""
Administración de la aplicación de productos.
"""

from django.contrib import admin
from django.db import transaction

from apps.suppliers.models import ProductSupplier
from apps.stock.models import StockMovementType

from .models import Addon, Category, Product


class AddonInline(admin.TabularInline):
    model = Addon
    extra = 0


class ProductSupplierInline(admin.TabularInline):
    model = ProductSupplier
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "order")
    list_editable = ("order",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "stock", "min_stock", "available")
    list_filter = ("category", "available")
    search_fields = ("name", "description")
    list_editable = ("price", "stock", "available")
    inlines = [AddonInline, ProductSupplierInline]

    @transaction.atomic
    def save_model(self, request, obj, form, change):
        desired_stock = obj.stock
        if change:
            persisted = Product.objects.select_for_update().get(pk=obj.pk)
            obj.stock = persisted.stock
            movement_type = StockMovementType.ADJUSTMENT
            reason = "Ajuste manual desde Django Admin"
        else:
            obj.stock = 0
            movement_type = StockMovementType.PURCHASE
            reason = "Stock inicial desde Django Admin"

        super().save_model(request, obj, form, change)
        if desired_stock != obj.stock:
            obj.adjust_stock(
                desired_stock,
                movement_type=movement_type,
                user=request.user,
                reason=reason,
            )


@admin.register(Addon)
class AddonAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "price", "available")
    list_filter = ("available", "product__category")
    search_fields = ("name", "product__name")
