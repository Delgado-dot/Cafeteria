"""
URLs de la aplicación de pagos.
"""

from django.urls import path

from .views import (
    AllPaymentsListView,
    MyPaymentsListView,
    PaymentCreateView,
    PaymentMethodAdminListView,
    PaymentMethodDetailView,
    PaymentMethodListView,
    PaymentReviewView,
)

urlpatterns = [
    path("methods/", PaymentMethodListView.as_view(), name="payment-method-list"),
    path("methods/admin/", PaymentMethodAdminListView.as_view(), name="payment-method-admin-list"),
    path("methods/<int:pk>/", PaymentMethodDetailView.as_view(), name="payment-method-detail"),
    path("", PaymentCreateView.as_view(), name="payment-create"),
    path("mine/", MyPaymentsListView.as_view(), name="my-payments"),
    path("all/", AllPaymentsListView.as_view(), name="all-payments"),
    path("<int:pk>/review/", PaymentReviewView.as_view(), name="payment-review"),
]
