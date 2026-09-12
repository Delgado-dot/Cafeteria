"""
Tests de la configuracion de cafeteria y el fondo de portada (hero_background).
"""

import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from apps.config.models import CafeConfig


class CafeConfigHeroBackgroundTests(TestCase):
    """El fondo de portada se guarda como referencia (ImageField) y se sirve por la API."""

    def setUp(self):
        self.media_root = tempfile.mkdtemp(prefix="cafeteria-test-config-media-")
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)

    def png_upload(self, size=(640, 480), color=(64, 128, 126)):
        buf = io.BytesIO()
        Image.new("RGB", size, color).save(buf, format="PNG")
        return SimpleUploadedFile(
            "hero_test.png", buf.getvalue(), content_type="image/png"
        )

    def test_singleton_config_accepts_hero_background(self):
        cfg = CafeConfig.get_solo()
        cfg.hero_background = self.png_upload()
        cfg.save()
        cfg.refresh_from_db()

        self.assertIsNotNone(cfg.hero_background)
        self.assertTrue(cfg.hero_background.name.startswith("home/"))
        self.assertTrue(cfg.hero_background.storage.exists(cfg.hero_background.name))

        # En la base de datos solo se guarda la referencia (ruta), no los bytes.
        stored = CafeConfig.objects.values_list("hero_background", flat=True).get(pk=1)
        self.assertEqual(stored, cfg.hero_background.name)

    def test_config_endpoint_exposes_hero_background_url(self):
        cfg = CafeConfig.get_solo()
        cfg.hero_background = self.png_upload()
        cfg.save()

        response = self.client.get("/api/config/current/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("hero_background", response.data)
        self.assertIn("hero_background_url", response.data)

        for key in ("hero_background", "hero_background_url"):
            url = response.data[key]
            self.assertTrue(url.startswith("http://testserver/media/"), key)
            self.assertTrue(url.endswith("/hero_test.png"), key)

    def test_empty_hero_background_returns_null_url(self):
        response = self.client.get("/api/config/current/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["hero_background_url"])