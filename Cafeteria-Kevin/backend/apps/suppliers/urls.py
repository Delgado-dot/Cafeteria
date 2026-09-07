"""
URLs de la aplicación de proveedores.
"""

from django.urls import path

from .views import SupplierDetailView, SupplierListView

urlpatterns = [
    path("", SupplierListView.as_view(), name="supplier-list"),
    path("<int:pk>/", SupplierDetailView.as_view(), name="supplier-detail"),
]