"""
Tests de la aplicación de activos visuales: validación, modelo y vista pública.
"""

from django.test import TestCase

from apps.assets.models import VisualAsset
from apps.assets.validation import (
    MAX_ASSET_BYTES,
    detect_mime,
    is_safe_svg,
    sha256,
    validate_bytes,
)

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + b"\x00" * 16
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 16
SAFE_SVG = b'<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>'


class ValidateBytesTests(TestCase):
    """Pruebas de la capa de validación de bytes."""

    def test_empty_data_rejected(self):
        with self.assertRaisesMessage(ValueError, "vacío"):
            validate_bytes(b"", "logo.png")

    def test_oversize_rejected(self):
        data = PNG_BYTES + b"\x00" * (MAX_ASSET_BYTES + 1)
        with self.assertRaisesMessage(ValueError, "límite"):
            validate_bytes(data, "logo.png")

    def test_png_extension_match_accepted(self):
        mime = validate_bytes(PNG_BYTES, "logo.png")
        self.assertEqual(mime, "image/png")

    def test_jpeg_extension_match_accepted(self):
        mime = validate_bytes(JPEG_BYTES, "foto.jpg")
        self.assertEqual(mime, "image/jpeg")

    def test_safe_svg_accepted(self):
        mime = validate_bytes(SAFE_SVG, "logo.svg")
        self.assertEqual(mime, "image/svg+xml")

    def test_svg_utf16_with_bom_detected(self):
        utf16 = SAFE_SVG.decode("utf-8").encode("utf-16")
        self.assertEqual(detect_mime(utf16), "image/svg+xml")
        self.assertTrue(is_safe_svg(utf16))

    def test_unknown_signature_rejected(self):
        with self.assertRaisesMessage(ValueError, "no permitido"):
            validate_bytes(b"#!/bin/sh\necho hi\n", "script")

    def test_extension_mismatch_rejected(self):
        with self.assertRaisesMessage(ValueError, "no coincide"):
            validate_bytes(PNG_BYTES, "logo.svg")

    def test_missing_extension_not_critical(self):
        mime = validate_bytes(PNG_BYTES, "logo")
        self.assertEqual(mime, "image/png")


class SvgSafetyTests(TestCase):
    """Pruebas del bloqueo de SVG peligrosos."""

    def assert_unsafe(self, svg_text):
        self.assertFalse(is_safe_svg(svg_text.encode("utf-8")))

    def test_script_tag_rejected(self):
        self.assert_unsafe('<svg><script>alert(1)</script></svg>')

    def test_event_handler_rejected(self):
        self.assert_unsafe('<svg onload="alert(1)"/>')

    def test_javascript_uri_rejected(self):
        self.assert_unsafe('<svg><a href="javascript:alert(1)">x</a></svg>')

    def test_foreign_object_rejected(self):
        self.assert_unsafe('<svg><foreignObject><iframe src="https://evil.example"/></foreignObject></svg>')

    def test_external_href_rejected(self):
        self.assert_unsafe('<svg><image href="https://evil.example/x.png"/></svg>')

    def test_empty_or_undecodable_rejected(self):
        self.assertFalse(is_safe_svg(b""))
        self.assertFalse(is_safe_svg(b"\xff\xfe\x00\xd8"))

    def test_clean_svg_accepted(self):
        self.assertTrue(is_safe_svg(SAFE_SVG))


class VisualAssetModelTests(TestCase):
    """Pruebas del registro de activos en el modelo."""

    def setUp(self):
        self.key = "test-logo.png"
        self.registered = VisualAsset.register(
            key=self.key,
            file_name="logo.png",
            category="general",
            data=PNG_BYTES,
        )

    def test_register_creates_asset(self):
        asset, created = self.registered
        self.assertTrue(created)
        self.assertEqual(asset.key, "test-logo.png")
        self.assertEqual(asset.mime_type, "image/png")
        self.assertEqual(asset.size, len(PNG_BYTES))
        self.assertEqual(asset.sha256, sha256(PNG_BYTES))
        self.assertTrue(asset.is_public)
        self.assertTrue(asset.active)

    def test_register_rejects_duplicate_key(self):
        asset, created = VisualAsset.register(
            key=self.key,
            file_name="otro.png",
            category="general",
            data=PNG_BYTES,
        )
        self.assertIsNone(asset)
        self.assertFalse(created)
        self.assertEqual(VisualAsset.objects.filter(key=self.key).count(), 1)

    def test_register_rejects_duplicate_sha256(self):
        asset, created = VisualAsset.register(
            key="copia.png",
            file_name="logo.png",
            category="general",
            data=PNG_BYTES,
        )
        self.assertIsNone(asset)
        self.assertFalse(created)

    def test_register_rejects_invalid_bytes(self):
        with self.assertRaises(ValueError):
            VisualAsset.register(
                key="malo.png",
                file_name="malo.txt",
                category="general",
                data=b"no soy una imagen",
            )


class VisualAssetViewTests(TestCase):
    """Pruebas del endpoint público GET /api/assets/<key>/."""

    @classmethod
    def setUpTestData(cls):
        asset, _ = VisualAsset.register(
            key="vista-logo.png",
            file_name="logo.png",
            category="general",
            data=PNG_BYTES,
        )
        cls.asset = asset

    def setUp(self):
        for key in ("inactivo", "privado"):
            VisualAsset.register(
                key=f"vista-{key}.png",
                file_name="logo.png",
                category="general",
                data=PNG_BYTES + key.encode("ascii"),
            )

    def get_url(self, key):
        return f"/api/assets/{key}/"

    def test_get_returns_bytes_with_headers(self):
        response = self.client.get(self.get_url("vista-logo.png"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(response["Content-Length"], str(len(PNG_BYTES)))
        self.assertEqual(response["ETag"], f'"{self.asset.sha256}"')
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertIn("immutable", response["Cache-Control"])
        self.assertEqual(response.content, PNG_BYTES)

    def test_get_unknown_key_returns_404(self):
        response = self.client.get(self.get_url("no-existe.png"))
        self.assertEqual(response.status_code, 404)

    def test_get_inactive_asset_returns_404(self):
        image = VisualAsset.objects.get(key="vista-inactivo.png")
        image.active = False
        image.save()
        response = self.client.get(self.get_url("vista-inactivo.png"))
        self.assertEqual(response.status_code, 404)

    def test_get_private_asset_returns_404(self):
        image = VisualAsset.objects.get(key="vista-privado.png")
        image.is_public = False
        image.save()
        response = self.client.get(self.get_url("vista-privado.png"))
        self.assertEqual(response.status_code, 404)

    def test_conditional_get_matching_etag_returns_304(self):
        etag = f'"{self.asset.sha256}"'
        response = self.client.get(self.get_url("vista-logo.png"), HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(response.status_code, 304)
        self.assertEqual(response.get("ETag"), etag)
        self.assertEqual(response.content, b"")

    def test_conditional_get_star_returns_304(self):
        response = self.client.get(self.get_url("vista-logo.png"), HTTP_IF_NONE_MATCH="*")
        self.assertEqual(response.status_code, 304)

    def test_conditional_get_non_matching_etag_returns_200(self):
        response = self.client.get(
            self.get_url("vista-logo.png"), HTTP_IF_NONE_MATCH='"otro-etag"'
        )
        self.assertEqual(response.status_code, 200)