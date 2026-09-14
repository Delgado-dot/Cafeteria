"""
Tests del módulo de Apariencia del sistema:
- admindev puede ver configuración (GET /api/config/current/ público) y ver la URL de cada imagen.
- admindev puede subir login_background, login_mascot, system_logo (PATCH multipart, 200).
- usuario normal recibe 403.
- extensión no permitida → 400 (PNG/JPG/WEBP únicamente).
- archivo > 5 MB → 400.
- archivo con extensión .png pero contenido no-imagen → 400.
- restaurar predeterminada (PATCH null) limpia el campo.
- el cambio queda auditado con la ruta de la imagen.
"""

import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from apps.accounts.constants import DEFAULT_ROLE_PERMISSIONS
from apps.accounts.models import RolePermission
from apps.accounts.permissions import _clear_permissions_cache
from apps.audit.models import AuditLog
from apps.config.models import CafeConfig

from django.core.cache import cache

from rest_framework.test import APIClient

User = get_user_model()


def seed_permissions():
    for role, codes in DEFAULT_ROLE_PERMISSIONS.items():
        for code in codes:
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )
    _clear_permissions_cache()
    cache.delete("rolepermission_has_any")


class AppearanceImageTests(TestCase):
    """Subida y validación de las imágenes del sistema (Landing/Login/Logo)."""

    def setUp(self):
        seed_permissions()
        self.admindev = User.objects.create_user(
            username="dev_appearance",
            email="dev_appearance@intesud.edu.ec",
            password="pass12345",
            role="admindev",
        )
        self.normal = User.objects.create_user(
            username="normal_appearance",
            email="normal_appearance@intesud.edu.ec",
            password="pass12345",
            role="user",
        )
        self.client_admindev = APIClient()
        self.client_admindev.force_authenticate(user=self.admindev)
        self.client_normal = APIClient()
        self.client_normal.force_authenticate(user=self.normal)

        self.media_root = tempfile.mkdtemp(prefix="cafeteria-test-appearance-media-")
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)

    def png_upload(self, size=(640, 480), color=(64, 128, 126)):
        buf = io.BytesIO()
        Image.new("RGB", size, color).save(buf, format="PNG")
        return SimpleUploadedFile("image.png", buf.getvalue(), content_type="image/png")

    def test_admindev_ve_urls_de_apariencia_en_config_actual(self):
        cfg = CafeConfig.get_solo()
        cfg.login_background = self.png_upload()
        cfg.login_mascot = self.png_upload(size=(300, 300))
        cfg.system_logo = self.png_upload(size=(400, 200))
        cfg.save()

        res = self.client_admindev.get("/api/config/current/")
        self.assertEqual(res.status_code, 200)
        for key in (
            "hero_background_url",
            "login_background_url",
            "login_mascot_url",
            "system_logo_url",
        ):
            self.assertIn(key, res.data)

        self.assertTrue(res.data["login_background"].endswith("/image.png"))
        self.assertTrue(res.data["login_background_url"].startswith("http://testserver/media/"))
        self.assertTrue(res.data["login_background_url"].endswith("/image.png"))

    def test_admindev_subir_imagenes_de_apariencia_200(self):
        res = self.client_admindev.patch(
            "/api/config/",
            {
                "login_background": self.png_upload(),
                "login_mascot": self.png_upload(size=(300, 300)),
                "system_logo": self.png_upload(size=(400, 200)),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)

        cfg = CafeConfig.get_solo()
        self.assertIsNotNone(cfg.login_background)
        self.assertTrue(cfg.login_background.name.startswith("site/login/"))
        self.assertTrue(cfg.login_mascot.name.startswith("site/login/"))
        self.assertTrue(cfg.system_logo.name.startswith("site/logo/"))

        for field in ("login_background", "login_mascot", "system_logo"):
            image = getattr(cfg, field)
            self.assertTrue(image.storage.exists(image.name), field)

        # La referencia en base de datos es la ruta del media.
        stored = CafeConfig.objects.values_list(
            "login_background", "login_mascot", "system_logo"
        ).get(pk=1)
        self.assertEqual(stored, (cfg.login_background.name, cfg.login_mascot.name, cfg.system_logo.name))

    def test_reutiliza_hero_background_para_fondo_del_landing(self):
        res = self.client_admindev.patch(
            "/api/config/", {"hero_background": self.png_upload()}, format="multipart"
        )
        self.assertEqual(res.status_code, 200, res.data)
        cfg = CafeConfig.get_solo()
        self.assertIsNotNone(cfg.hero_background)
        self.assertTrue(cfg.hero_background.name.startswith("home/"))
        self.assertTrue(cfg.hero_background.storage.exists(cfg.hero_background.name))

    def test_usuario_normal_no_puede_subir_imagenes_403(self):
        res = self.client_normal.patch(
            "/api/config/", {"login_background": self.png_upload()}, format="multipart"
        )
        self.assertEqual(res.status_code, 403)

    def test_extension_no_permitida_400(self):
        bad = SimpleUploadedFile(
            "noticia.txt", b"no soy una imagen", content_type="text/plain"
        )
        res = self.client_admindev.patch(
            "/api/config/", {"login_background": bad}, format="multipart"
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(CafeConfig.get_solo().login_background)

    def test_imagen_mayor_a_5mb_400(self):
        big = SimpleUploadedFile(
            "grande.png", b"x" * (5 * 1024 * 1024 + 1), content_type="image/png"
        )
        res = self.client_admindev.patch(
            "/api/config/", {"login_background": big}, format="multipart"
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(CafeConfig.get_solo().login_background)

    def test_contenido_no_imagen_con_extension_png_400(self):
        fake = SimpleUploadedFile(
            "falso.png", b"no soy una imagen real", content_type="image/png"
        )
        res = self.client_admindev.patch(
            "/api/config/", {"login_background": fake}, format="multipart"
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(CafeConfig.get_solo().login_background)

    def test_restaurar_predeterminada_limpia_campo(self):
        cfg = CafeConfig.get_solo()
        cfg.login_background = self.png_upload()
        cfg.system_logo = self.png_upload(size=(400, 200))
        cfg.save()

        res = self.client_admindev.patch(
            "/api/config/",
            {"login_background": None, "system_logo": None},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)

        cfg.refresh_from_db()
        self.assertFalse(cfg.login_background)
        self.assertFalse(cfg.system_logo)

    def test_cambio_de_imagen_queda_auditado(self):
        image_name = "auditada.png"
        buf = io.BytesIO()
        Image.new("RGB", (50, 50), (10, 20, 30)).save(buf, format="PNG")
        upload = SimpleUploadedFile(image_name, buf.getvalue(), content_type="image/png")

        self.client_admindev.patch(
            "/api/config/", {"system_logo": upload}, format="multipart"
        )

        audit = AuditLog.objects.filter(action="config.update").order_by("-id").first()
        self.assertIsNotNone(audit)
        self.assertIn("system_logo", audit.details)
        self.assertTrue(str(audit.details["system_logo"]).endswith(image_name))