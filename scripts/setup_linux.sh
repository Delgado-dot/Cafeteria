#!/bin/bash
# ============================================================
# Script de instalación del proyecto Cafetería INTESUD (Linux/MacOS)
# ============================================================
# Uso:
#   chmod +x scripts/setup_linux.sh
#   ./scripts/setup_linux.sh
# ============================================================

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"

echo "=========================================="
echo "  Configuración de Cafetería INTESUD"
echo "=========================================="
echo ""

# Verificar Python
echo "[1/4] Verificando Python..."
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "ERROR: Python no está instalado."
    exit 1
fi
echo "    Python detectado: $($PYTHON --version)"

# Crear entorno virtual
echo "[2/4] Creando entorno virtual..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    $PYTHON -m venv venv
    echo "    Entorno virtual creado en backend/venv"
else
    echo "    Entorno virtual ya existe"
fi

# Activar e instalar dependencias
echo "[3/4] Instalando dependencias..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# Configurar .env
echo "[4/4] Configurando archivo .env..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "    Archivo .env creado desde .env.example"
    echo "    IMPORTANTE: Edita el archivo .env con tus credenciales"
else
    echo "    Archivo .env ya existe"
fi

echo ""
echo "=========================================="
echo "  Configuración completada!"
echo "=========================================="
echo ""
echo "Siguientes pasos:"
echo "  1. Activa el entorno: cd backend && source venv/bin/activate"
echo "  2. Ejecuta migraciones: python manage.py migrate"
echo "  3. Crea un superusuario: python manage.py createsuperuser"
echo "  4. Inicia el servidor: python manage.py runserver"
echo "  5. Abre el frontend: frontend/index.html"
echo ""
