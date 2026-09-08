"""Administracion de proveedores."""

from django.contrib import admin

from .models import ProductSupplier, Supplier


class ProductSupplierInline(admin.TabularInline):
    model = ProductSupplier
    extra = 0


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_name", "phone", "email", "active")
    list_filter = ("active",)
    search_fields = ("name", "contact_name", "email", "tax_id")
    inlines = [ProductSupplierInline]


@admin.register(ProductSupplier)
class ProductSupplierAdmin(admin.ModelAdmin):
    list_display = ("product", "supplier", "cost_price", "is_primary", "active")
    list_filter = ("active", "is_primary", "supplier")
    search_fields = ("product__name", "supplier__name", "supplier_code")
