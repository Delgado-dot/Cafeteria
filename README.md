# Cafetería INTESUD — Sistema de Pedidos en Línea

Sistema completo de pedidos en línea para la cafetería del **Instituto Tecnológico Superior Sudamericano (INTESUD)**, con frontend profesional, backend Django, delivery interno, gestión de stock y roles de usuario.

---

## 📚 Tabla de Contenidos

- [Descripción](#-descripción)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos previos](#-requisitos-previos)
- [Instalación](#-instalación)
  - [Backend (Django)](#backend-django)
  - [Frontend](#frontend)
- [Credenciales de demostración](#-credenciales-de-demostración)
- [Características](#-características)
- [Testing](#-testing)
- [Documentación de la API](#-documentación-de-la-api)
- [Despliegue](#-despliegue)
- [Equipo de desarrollo](#-equipo-de-desarrollo)

---

## 🚀 Descripción

El sistema permite a los estudiantes de INTESUD realizar pedidos en línea durante el receso, con:
- **Retiro en cafetería** o **delivery interno** dentro del edificio.
- Múltiples métodos de pago (DEUNA, transferencia, efectivo).
- Gestión completa de productos, stock, pedidos y pagos.
- Tres roles con interfaces y permisos diferenciados.

---

## 🛠 Tecnologías

| Frontend | Backend | DevOps |
|----------|---------|--------|
| HTML5 | Django 5.0 | Docker |
| CSS3 | Django REST Framework | GitHub Actions |
| JavaScript (Vanilla) | PostgreSQL (producción) | Nginx |
| | JWT (SimpleJWT) | Gunicorn |
| | Swagger / OpenAPI | |

---

## 📁 Estructura del Proyecto

```
Cafeteria/
├── frontend/                    # Frontend (HTML/CSS/JS)
│   ├── index.html               # Página principal
│   ├── css/                     # Hojas de estilo
│   │   ├── main.css             # Sistema de diseño (tokens, base)
│   │   ├── components.css       # Componentes reutilizables
│   │   └── responsive.css       # Adaptación móvil/tablet/desktop
│   ├── js/                      # Lógica del frontend
│   │   ├── app.js               # Enrutador y página de usuario
│   │   ├── ui.js                # Helpers de UI (modal, drawer, toast)
│   │   ├── data.js              # Datos simulados y persistencia
│   │   ├── auth.js              # Login y recuperación de contraseña
│   │   ├── cart.js              # Carrito y checkout
│   │   ├── orders.js            # Pedidos del usuario
│   │   ├── admin.js             # Panel de la administradora
│   │   └── devadmin.js          # Panel del admin desarrollador
│   ├── assets/                  # Recursos estáticos
│   │   ├── images/              # Imágenes (procesadas)
│   │   └── icons/               # Iconos
│   └── pages/                   # Páginas individuales (si se requieren)

├── backend/                     # Backend Django
│   ├── manage.py                # Comandos de Django
│   ├── requirements.txt         # Dependencias de Python
│   ├── .env.example             # Variables de entorno de ejemplo
│   ├── core/                    # Núcleo del proyecto Django
│   │   ├── cafeteria/           # Configuración principal
│   │   │   ├── settings.py      # Configuración
│   │   │   ├── settings_test.py # Configuración de testing
│   │   │   ├── urls.py          # URLs principales
│   │   │   ├── api.py           # Router de la API
│   │   │   ├── wsgi.py          # Punto de entrada WSGI
│   │   │   ├── asgi.py          # Punto de entrada ASGI
│   │   │   ├── templates/       # Plantillas HTML del backend
│   │   │   └── static/          # Estáticos del backend
│   │   └── ...
│   ├── apps/                    # Aplicaciones del sistema
│   │   ├── accounts/            # Usuarios, roles y JWT
│   │   ├── products/            # Productos y categorías
│   │   ├── orders/              # Pedidos y su ciclo de vida
│   │   ├── delivery/            # Configuración de delivery
│   │   ├── payments/            # Métodos de pago
│   │   ├── audit/               # Registro de auditoría
│   │   └── config/              # Configuración global
│   ├── media/                   # Archivos subidos (uploads)
│   │   ├── uploads/             # Subidas generales
│   │   ├── vouchers/            # Comprobantes de pago
│   │   └── product_images/      # Imágenes de productos
│   ├── templates/               # Plantillas globales
│   ├── locale/                  # Traducciones es/es
│   └── staticfiles/             # Estáticos colectados (producción)

├── tests/                       # Tests automatizados
│   ├── backend/                 # Pruebas de Django (pytest)
│   └── frontend/                # Documentación de casos de prueba

├── docs/                        # Documentación del proyecto
├── scripts/                     # Scripts de utilidad
├── docker/                      # Dockerfiles y docker-compose
├── .github/                     # GitHub Actions workflows
├── .gitignore                   # Archivos ignorados por git
└── README.md                    # Este archivo
```

---

## 📋 Requisitos previos

- **Python** 3.10 o superior
- **Node.js** (opcional, solo para pruebas)
- **Git**
- **Docker** (opcional, para despliegue)

---

## 🔧 Instalación

### Backend Django

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/Cafeteria.git
cd Cafeteria

# 2. Crear y activar entorno virtual
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/MacOS:
# source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 5. Ejecutar migraciones
python manage.py makemigrations
python manage.py migrate

# 6. Crear el superusuario (admin)
python manage.py createsuperuser

# 7. Iniciar el servidor de desarrollo
python manage.py runserver
```

### Frontend

El frontend es estático (HTML/CSS/JS puro). Simplemente abre `frontend/index.html` en tu navegador o sírvelo con cualquier servidor estático:

```bash
# Opción 1: Abrir directamente
# Abre frontend/index.html en tu navegador

# Opción 2: Servidor estático simple
cd frontend
python -m http.server 8080
# Luego ve a http://localhost:8080
```

---

## 🔑 Credenciales de demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Usuario institucional** | `usuario@intesud.edu.ec` | `estudiante123` |
| **Administradora bar** | `adminbar@intesud.edu.ec` | `adminbar123` |
| **Admin desarrollador** | `developer@system.local` | `developer123` |

---

## ✨ Características

### Usuario institucional
- 🏠 Inicio con estado de la cafetería y productos destacados
- 🍔 Menú con búsqueda y filtro por categorías
- 🛒 Carrito de compras con adicionales y notas
- 💳 Checkout con métodos de pago (DEUNA, transferencia, efectivo)
- 🛵 Delivery interno con selección de piso y aula
- 🧾 Seguimiento de pedidos con timeline de estados
- 👤 Perfil y cambio de contraseña

### Administradora de bar
- 📊 Dashboard con métricas en tiempo real
- 🧾 Gestión de pedidos (confirmar, preparar, entregar)
- 🍔 CRUD de productos
- 📦 Control de stock e historial de cambios
- 📈 Reporte de ventas (día, semana)
- 💳 Revisión y aprobación de pagos
- 🛵 Configuración del delivery
- ⚙️ Configuración de horarios y capacidad

### Administrador desarrollador
- 👥 Gestión completa de usuarios
- 🔐 Roles y matriz de permisos
- 📜 Registro de auditoría
- ⚙️ Configuración general del sistema

---

## 🧪 Testing

### Backend

```bash
cd backend
pytest
```

### Frontend

Los casos de prueba del frontend están documentados en `tests/frontend/test-cases.md`. Pueden ejecutarse manualmente o con herramientas de automatización (Playwright, Cypress).

---

## 📖 Documentación de la API

Una vez que el backend esté corriendo:

- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **Esquema JSON**: `http://localhost:8000/api/schema/`

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Registrar usuario |
| POST | `/api/auth/login/` | Iniciar sesión (JWT) |
| POST | `/api/auth/refresh/` | Refrescar token |
| GET | `/api/auth/me/` | Perfil del usuario actual |
| GET/POST | `/api/products/` | Listar/crear productos |
| GET/POST | `/api/orders/` | Crear pedido |
| GET | `/api/orders/mine/` | Mis pedidos |
| GET | `/api/orders/all/` | Todos los pedidos (admin) |
| GET/PATCH | `/api/config/current/` | Configuración de la cafetería |
| GET | `/api/audit/` | Registros de auditoría (admin dev) |

---

## 🐳 Despliegue

### Docker Compose (producción)

```bash
# Construir y levantar todos los servicios
docker-compose -f docker/docker-compose.yml up -d

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f

# Detener
docker-compose -f docker/docker-compose.yml down
```

### GitHub Actions

El repositorio incluye un workflow de CI/CD en `.github/workflows/` que ejecuta:
1. Lint y type-check del código
2. Tests automatizados del backend
3. Build de la imagen Docker
4. Deploy automático (configurable)

---

## 👥 Equipo de desarrollo

Para trabajar en equipo, cada desarrollador debe:

1. **Crear una rama** para su tarea: `git checkout -b feature/nombre-feature`
2. **Hacer commits** claros y descriptivos en español
3. **Crear pull requests** para revisión de código
4. **Nunca** subir `.env` ni credenciales al repositorio
5. Mantener las carpetas y estructura del proyecto

### Flujo de Git

```bash
# Crear una rama para un feature
git checkout -b feature/login

# Después de los cambios
git add .
git commit -m "feat: agregar formulario de login"

# Subir la rama
git push origin feature/login

# Crear un PR hacia main desde GitHub
```

---

## 📄 Licencia

Este es un proyecto educativo del **Instituto Tecnológico Superior Sudamericano (INTESUD)**.

---

*Proyecto desarrollado para el sistema de pedidos en línea de la cafetería INTESUD.* ☕
