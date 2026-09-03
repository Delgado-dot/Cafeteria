# ============================================================
# Dockerfile del backend de Cafetería INTESUD
# ============================================================

FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=core.cafeteria.settings

WORKDIR /app

# Actualizar pip e instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev \
        build-essential \
    && pip install --upgrade pip \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY backend/ .

# Crear directorios necesarios
RUN mkdir -p /app/media /app/staticfiles

# Exponer el puerto
EXPOSE 8000

# Comando de inicio
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:8000 core.cafeteria.wsgi:application"]
