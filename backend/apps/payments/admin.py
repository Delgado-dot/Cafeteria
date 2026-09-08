"""Administracion de pagos."""

from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "user", "payment_method", "status", "amount", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("order__order_number", "user__email", "transaction_id")
    readonly_fields = ("created_at", "updated_at")
