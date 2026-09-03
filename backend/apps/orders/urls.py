"""
URLs de la aplicación de pedidos.
"""

from django.urls import path

from .views import (
    AllOrdersListView,
    MyOrdersListView,
    OrderCreateView,
    OrderDetailView,
)

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order-create"),
    path("mine/", MyOrdersListView.as_view(), name="my-orders"),
    path("all/", AllOrdersListView.as_view(), name="all-orders"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
]
