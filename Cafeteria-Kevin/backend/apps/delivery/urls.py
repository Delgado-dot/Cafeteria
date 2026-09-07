"""
URLs de la aplicación de delivery.
"""

from django.urls import path

from .views import DeliveryConfigRetrieveUpdateView, DeliveryRequestListView

urlpatterns = [
    path("config/", DeliveryConfigRetrieveUpdateView.as_view(), name="delivery-config"),
    path("requests/", DeliveryRequestListView.as_view(), name="delivery-requests"),
]
