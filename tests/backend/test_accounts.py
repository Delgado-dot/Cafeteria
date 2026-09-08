"""
Tests de la aplicación de cuenta.
"""

import io
import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

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


class LoginApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.passwords = {}
        for username, role in (
            ("user", "user"),
            ("adminbar", "adminbar"),
            ("admindev", "admindev"),
        ):
            password = f"test-{username}-password"
            self.passwords[username] = password
            User.objects.create_user(
                username=username,
                email=f"{username}@intesud.edu.ec",
                password=password,
                role=role,
            )

    def test_all_roles_login_and_me(self):
        for username, expected_role in (
            ("user", "user"),
            ("adminbar", "adminbar"),
            ("admindev", "admindev"),
        ):
            with self.subTest(username=username):
                login = self.client.post(
                    "/api/auth/login/",
                    {"username": username, "password": self.passwords[username]},
                    format="json",
                )
                self.assertEqual(login.status_code, 200, login.data)
                self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
                me = self.client.get("/api/auth/me/")
                self.assertEqual(me.status_code, 200, me.data)
                self.assertEqual(me.data["role"], expected_role)
                self.client.credentials()

    def test_login_accepts_email_without_changing_the_password(self):
        login = self.client.post(
            "/api/auth/login/",
            {
                "username": "ADMINBAR@INTESUD.EDU.EC",
                "password": self.passwords["adminbar"],
            },
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)

    def test_setup_users_does_not_reset_existing_password_from_environment(self):
        user = User.objects.get(username="user")
        password_hash = user.password
        with patch.dict(os.environ, {"USER_PASSWORD": "unexpected-new-password"}):
            call_command(
                "setup_users", "--no-input", "--username", "user", stdout=io.StringIO()
            )
        user.refresh_from_db()
        self.assertEqual(user.password, password_hash)
        self.assertTrue(user.check_password(self.passwords["user"]))
