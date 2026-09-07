"""
Comando profesional para crear/actualizar usuarios iniciales de Bar INTESUD.

Uso:
    python manage.py setup_users                # interactivo, pide contraseñas solo para usuarios nuevos o si --reset-passwords
    python manage.py setup_users --no-input     # no pide input, solo crea si faltan vars de entorno
    python manage.py setup_users --reset-passwords  # fuerza reseteo de contraseñas interactivamente
    ADMINBAR_PASSWORD=xxx ADMINDEV_PASSWORD=yyy USER_PASSWORD=zzz python manage.py setup_users --no-input

Características:
- Idempotente: puede ejecutarse N veces sin duplicar
- Usa set_password() / create_user() — nunca guarda texto plano
- No hardcodea contraseñas en el repo
- Actualiza role/email/is_active si ya existen
- No toca al superusuario 'admin' salvo que coincida con los tres roles definidos
- Separa is_superuser de role de negocio
"""
import getpass
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()

# Definición de usuarios de negocio — sin contraseñas
USERS_SPEC = [
    {
        "username": "user",
        "email": "user@intesud.edu.ec",
        "role": "user",
        "first_name": "Usuario",
        "last_name": "Institucional",
        "cargo": "Estudiante",
        "is_active": True,
        "env_password_var": "USER_PASSWORD",
    },
    {
        "username": "adminbar",
        "email": "adminbar@intesud.edu.ec",
        "role": "adminbar",
        "first_name": "Administradora",
        "last_name": "Bar",
        "cargo": "Administradora del bar",
        "is_active": True,
        "env_password_var": "ADMINBAR_PASSWORD",
    },
    {
        "username": "admindev",
        "email": "developer@intesud.edu.ec",
        "role": "admindev",
        "first_name": "Administrador",
        "last_name": "Desarrollador",
        "cargo": "Administrador técnico",
        "is_active": True,
        "env_password_var": "ADMINDEV_PASSWORD",
    },
]


class Command(BaseCommand):
    help = "Crea o actualiza usuarios iniciales (user, adminbar, admindev) de forma segura e idempotente."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="No pedir contraseñas interactivamente. Requiere vars de entorno para usuarios nuevos.",
        )
        parser.add_argument(
            "--reset-passwords",
            action="store_true",
            help="Fuerza reseteo de contraseñas incluso para usuarios existentes (pide interactivamente).",
        )
        parser.add_argument(
            "--username",
            type=str,
            help="Si se indica, solo procesa ese username (ej: --username admindev)",
        )

    def handle(self, *args, **options):
        no_input = options["no_input"]
        reset_passwords = options["reset_passwords"]
        filter_username = options["username"]

        specs = USERS_SPEC
        if filter_username:
            specs = [s for s in USERS_SPEC if s["username"] == filter_username]
            if not specs:
                raise CommandError(f"Username '{filter_username}' no está en la lista permitida: {[s['username'] for s in USERS_SPEC]}")

        created = []
        updated = []
        skipped = []
        errors = []

        for spec in specs:
            username = spec["username"]
            email = spec["email"]
            role = spec["role"]
            env_var = spec["env_password_var"]

            # Validar role contra choices reales
            valid_roles = [c[0] for c in User._meta.get_field("role").choices]
            if role not in valid_roles:
                errors.append(f"{username}: role '{role}' no válido. Válidos: {valid_roles}")
                continue

            user = User.objects.filter(username=username).first()
            # También buscar por email si username no existe pero email sí (evitar duplicado por email unique)
            if not user:
                user = User.objects.filter(email=email).first()
                if user and user.username != username:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Encontrado usuario con email {email} pero username '{user.username}' != '{username}'. Se actualizará username a '{username}'."
                        )
                    )

            is_new = user is None

            # Determinar contraseña
            password = None
            if is_new or reset_passwords:
                env_password = os.getenv(env_var)
                if env_password:
                    password = env_password
                elif no_input:
                    if is_new:
                        errors.append(
                            f"{username} ({email}) no existe y no se proveyó {env_var}. Use env var o ejecute sin --no-input."
                        )
                        continue
                    errors.append(
                        f"{username}: --reset-passwords requiere {env_var} con --no-input."
                    )
                    continue
                else:
                    # Pedir interactivamente
                    self.stdout.write(f"\nUsuario: {username} ({email}) role={role}")
                    if is_new:
                        self.stdout.write("  > Usuario nuevo, se requiere contrasena (min 8 caracteres).")
                    else:
                        self.stdout.write("  > Reset de contrasena solicitado.")
                    while True:
                        try:
                            pwd = getpass.getpass(f"  Contraseña para {username} (vacío para omitir): ")
                        except (KeyboardInterrupt, EOFError):
                            self.stdout.write("\nCancelado.")
                            pwd = ""
                        if not pwd:
                            if is_new:
                                self.stdout.write(self.style.WARNING("  Contraseña vacía no permitida para usuario nuevo. Intente de nuevo."))
                                continue
                            else:
                                password = None
                                break
                        if len(pwd) < 8:
                            self.stdout.write(self.style.ERROR("  Mínimo 8 caracteres."))
                            continue
                        pwd2 = getpass.getpass(f"  Confirmar contraseña para {username}: ")
                        if pwd != pwd2:
                            self.stdout.write(self.style.ERROR("  No coinciden. Intente de nuevo."))
                            continue
                        password = pwd
                        break

            try:
                if is_new:
                    # Crear con create_user para hashing correcto
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password or User.objects.make_random_password(),
                        first_name=spec.get("first_name", ""),
                        last_name=spec.get("last_name", ""),
                        role=role,
                        cargo=spec.get("cargo", ""),
                        aula=spec.get("aula", ""),
                        is_active=spec.get("is_active", True),
                    )
                    # Si se creó con random y luego tenemos password, setear
                    if password:
                        user.set_password(password)
                        user.save(update_fields=["password"])
                    # Asegurar que no es superusuario por accidente (separa negocio de is_superuser)
                    if user.is_superuser or user.is_staff:
                        # No forzar a False si ya era superuser admin, pero para estos 3 debe ser False
                        # Solo advertir
                        self.stdout.write(
                            self.style.WARNING(f"  Nota: {username} no debe ser superuser/is_staff para roles de negocio. is_superuser={user.is_superuser}")
                        )
                    created.append(f"{username} ({email}) role={role}")
                    self.stdout.write(self.style.SUCCESS(f"  Creado: {username} ({email}) role={role}"))
                else:
                    # Actualizar existente — idempotente
                    changed = []
                    if user.username != username:
                        user.username = username
                        changed.append("username")
                    if user.email != email:
                        user.email = email
                        changed.append("email")
                    if user.role != role:
                        old_role = user.role
                        user.role = role
                        changed.append(f"role {old_role} to {role}")
                    if user.first_name != spec.get("first_name", ""):
                        user.first_name = spec.get("first_name", "")
                        changed.append("first_name")
                    if user.last_name != spec.get("last_name", ""):
                        user.last_name = spec.get("last_name", "")
                        changed.append("last_name")
                    if user.cargo != spec.get("cargo", ""):
                        user.cargo = spec.get("cargo", "")
                        changed.append("cargo")
                    if user.is_active != spec.get("is_active", True):
                        user.is_active = spec.get("is_active", True)
                        changed.append("is_active")

                    # Separación is_superuser vs role — no tocar is_superuser automáticamente
                    # Solo informar si es superuser con role=user (caso admin)
                    if user.username == "admin" and user.is_superuser and user.role == "user":
                        self.stdout.write(
                            self.style.WARNING(
                                f"  Aviso: usuario 'admin' es superuser pero role=user. No se cambia automáticamente. "
                                f"is_superuser y role son conceptos separados."
                            )
                        )

                    if password:
                        user.set_password(password)
                        changed.append("password (hasheada)")

                    if changed:
                        user.save()
                        updated.append(f"{username} ({email}) cambios: {', '.join(changed)}")
                        self.stdout.write(self.style.SUCCESS(f"  Actualizado: {username} ({email}) con {', '.join(changed)}"))
                    else:
                        skipped.append(f"{username} ({email}) sin cambios")
                        self.stdout.write(f"  Sin cambios: {username} ({email})")
            except Exception as e:
                errors.append(f"{username}: {e}")
                self.stdout.write(self.style.ERROR(f"  Error con {username}: {e}"))

        # Resumen
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("Resumen setup_users:"))
        if created:
            self.stdout.write(self.style.SUCCESS(f"  Creados ({len(created)}):"))
            for c in created:
                self.stdout.write(f"    - {c}")
        if updated:
            self.stdout.write(self.style.SUCCESS(f"  Actualizados ({len(updated)}):"))
            for u in updated:
                self.stdout.write(f"    - {u}")
        if skipped:
            self.stdout.write(f"  Sin cambios ({len(skipped)}):")
            for s in skipped:
                self.stdout.write(f"    - {s}")
        if errors:
            self.stdout.write(self.style.ERROR(f"  Errores ({len(errors)}):"))
            for e in errors:
                self.stdout.write(self.style.ERROR(f"    - {e}"))
        self.stdout.write("=" * 60)
        self.stdout.write("Nota: contraseñas nunca se guardan en texto plano (uso de set_password/create_user con hash PBKDF2).")
        self.stdout.write("Para probar login: POST /api/auth/login/ {username, password} luego GET /api/auth/me/ verifica 'role'.")

        if errors and not created and not updated:
            raise CommandError("No se pudo completar setup_users con éxito.")
