"""
Tests de la aplicación de cuenta.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.models import Role

User = get_user_model()


class UserModelTests(TestCase):
    """Pruebas del modelo de usuario."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@intesud.edu.ec",
            password="testpass123",
            role=Role.USER,
            cargo="Estudiante",
            aula="2B",
        )

    def test_user_creation(self):
        """Prueba de creación exitosa de un usuario."""
        self.assertEqual(self.user.username, "testuser")
        self.assertEqual(self.user.email, "test@intesud.edu.ec")
        self.assertEqual(self.user.role, Role.USER)
        self.assertTrue(self.user.is_active)

    def test_user_str(self):
        """Prueba de representación en string del usuario."""
        self.assertEqual(
            str(self.user),
            f"{self.user.get_full_name()} ({self.user.email})",
        )

    def test_user_password(self):
        """Prueba de que la contraseña está correctamente encriptada."""
        self.assertTrue(self.user.check_password("testpass123"))
        self.assertFalse(self.user.check_password("incorrecta"))
