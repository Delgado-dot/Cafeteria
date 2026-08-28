"""
Administración de la aplicación de productos.
"""

from django.contrib import admin

from .models import Addon, Category, Product


class AddonInline(admin.TabularInline):
    model = Addon
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
    inlines = [AddonInline]
