# Backend POS (FastAPI)

## Entorno virtual (recomendado)

Para mantener las dependencias aisladas del sistema operativo, use siempre un **entorno virtual** antes de instalar con pip:

```bash
# Desde la carpeta backend/
python3 -m venv .venv
source .venv/bin/activate   # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

O use el script incluido (crea el venv si no existe e instala dependencias):

```bash
./scripts/ensure_venv.sh
```

Para ejecutar el servidor (con el venv activado):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Alternativamente puede usar **Poetry** (`poetry install`), que ya gestiona su propio entorno virtual.
