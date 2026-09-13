from django.urls import path

from .views import VisualAssetView

urlpatterns = [
    path("assets/<path:key>/", VisualAssetView.as_view(), name="visual-asset"),
    path("assets/<path:key>", VisualAssetView.as_view(), name="visual-asset-alt"),
]