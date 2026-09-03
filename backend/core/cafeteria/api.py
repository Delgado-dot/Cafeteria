"""
Enrutador principal de la API REST.
"""

from django.urls import include, path

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("products/", include("apps.products.urls")),
    path("orders/", include("apps.orders.urls")),
    path("delivery/", include("apps.delivery.urls")),
    path("payments/", include("apps.payments.urls")),
    path("audit/", include("apps.audit.urls")),
    path("config/", include("apps.config.urls")),
]
