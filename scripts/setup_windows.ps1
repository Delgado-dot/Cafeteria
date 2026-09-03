# ============================================================
# Script de instalación del proyecto Cafetería INTESUD (Windows)
# ============================================================
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/setup_windows.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Path $PSScriptRoot -Parent
$backendDir = Join-Path $root "backend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Configuración de Cafetería INTESUD" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Python
Write-Host "[1/4] Verificando Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "    Python detectado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Error "Python no está instalado o no está en el PATH. Instálalo desde python.org"
    exit 1
}

# Crear entorno virtual
Write-Host "[2/4] Creando entorno virtual..." -ForegroundColor Yellow
Set-Location $backendDir
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "    Entorno virtual creado en backend/venv" -ForegroundColor Green
} else {
    Write-Host "    Entorno virtual ya existe" -ForegroundColor Green
}

# Activar entorno e instalar dependencias
Write-Host "[3/4] Instalando dependencias..." -ForegroundColor Yellow
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "No se pudo encontrar el Python del entorno virtual."
    exit 1
}

& $venvPython -m pip install --upgrade pip 2>&1 | Out-Null
& $venvPython -m pip install -r requirements.txt

# Configurar .env si no existe
Write-Host "[4/4] Configurando archivo .env..." -ForegroundColor Yellow
$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $backendDir ".env.example") $envFile
    Write-Host "    Archivo .env creado desde .env.example" -ForegroundColor Green
    Write-Host "    IMPORTANTE: Edita el archivo .env con tus credenciales" -ForegroundColor Cyan
} else {
    Write-Host "    Archivo .env ya existe" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Configuración completada!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguientes pasos:" -ForegroundColor Yellow
Write-Host "  1. Activa el entorno: cd backend; venv\Scripts\activate"
Write-Host "  2. Ejecuta migraciones: python manage.py migrate"
Write-Host "  3. Crea un superusuario: python manage.py createsuperuser"
Write-Host "  4. Inicia el servidor: python manage.py runserver"
Write-Host "  5. Abre el frontend: frontend\index.html"
Write-Host ""
