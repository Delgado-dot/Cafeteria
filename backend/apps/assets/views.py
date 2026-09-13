"""Vista pública de activos visuales almacenados en PostgreSQL."""

from django.http import HttpResponse, HttpResponseNotModified
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import VisualAsset

PUBLIC_CACHE = "public, max-age=2592000, immutable"
PRIVATE_CACHE = "private, max-age=300"


class VisualAssetView(APIView):
    """GET /api/assets/<key>/ — entrega los bytes almacenados.

    Los recursos generales del inventario son públicos. Los futuros avatares y
    comprobantes privados usarán endpoints y permisos específicos.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "assets"

    def get(self, request, key):
        asset = VisualAsset.objects.filter(key=key, active=True, is_public=True).first()
        if asset is None:
            return HttpResponse("Not Found", status=404)

        payload = bytes(asset.data)
        etag = f'"{asset.sha256}"'
        if_none_match = request.headers.get("If-None-Match")
        if if_none_match:
            candidates = [tag.strip() for tag in if_none_match.split(",")]
            if etag in candidates or "*" in candidates:
                response = HttpResponseNotModified()
                response["ETag"] = etag
                response["Cache-Control"] = PUBLIC_CACHE
                return response

        response = HttpResponse(payload, content_type=asset.mime_type)
        response["Content-Length"] = str(len(payload))
        response["ETag"] = etag
        response["Cache-Control"] = PUBLIC_CACHE
        response["X-Content-Type-Options"] = "nosniff"
        return response