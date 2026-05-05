# Dockerfile para Backend (FastAPI)
# Usamos una imagen base limpia de Python
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema que necesita psycopg2 y otras libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python desde requirements.txt
# (Esto se hace ANTES de copiar el código, así Docker lo cachea y no reinstala en cada update)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY ./app ./app
COPY ./alembic ./alembic
COPY ./alembic.ini .
COPY ./seed_admin.py .

# Variables de entorno por defecto (serán sobrescritas por docker-compose)
ENV DEPLOYMENT_MODE="SERVER"
ENV DATABASE_URL="postgresql://admin:password123@db:5432/pos_db"

# Exponer puerto
EXPOSE 8000

# Comando de inicio: Migraciones automáticas + Servidor
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
