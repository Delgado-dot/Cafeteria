"""
URLs de la aplicación de stock.
"""

from django.urls import path

from .views import StockMovementListView

urlpatterns = [
    path("movements/", StockMovementListView.as_view(), name="stock-movements"),
]