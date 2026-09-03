"""
Administración de la aplicación de configuración.
"""

from django.contrib import admin

from .models import CafeConfig


@admin.register(CafeConfig)
class CafeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "cafe_name",
        "is_open",
        "delivery_enabled",
        "order_open_time",
        "order_close_time",
        "break_start",
        "break_end",
        "total_capacity",
        "current_capacity",
    )
