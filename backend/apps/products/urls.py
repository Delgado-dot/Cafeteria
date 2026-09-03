"""
URLs de la aplicación de productos.
"""

from django.urls import path

from .views import CategoryListView, ProductDetailView, ProductListView

urlpatterns = [
    path("", ProductListView.as_view(), name="product-list"),
    path("<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
]
