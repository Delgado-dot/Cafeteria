"""
URLs de la aplicación de configuración.
"""

from django.urls import path

from .views import CafeConfigRetrieveView, CafeConfigUpdateView

urlpatterns = [
    path("", CafeConfigUpdateView.as_view(), name="cafe-config-update"),
    path("current/", CafeConfigRetrieveView.as_view(), name="cafe-config"),
]
