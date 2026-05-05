#!/usr/bin/env bash
# Crea y usa un entorno virtual para el backend (mantiene el SO a salvo de dependencias).
# Uso: desde backend/ ejecutar: ./scripts/ensure_venv.sh
set -e
cd "$(dirname "$0")/.."
VENV_DIR="${VENV_DIR:-.venv}"
if [ ! -d "$VENV_DIR" ]; then
  echo "Creando entorno virtual en $VENV_DIR..."
  python3 -m venv "$VENV_DIR"
fi
echo "Activando $VENV_DIR..."
# shellcheck source=/dev/null
. "./$VENV_DIR/bin/activate"
echo "Instalando dependencias con pip..."
pip install -r requirements.txt
echo "Listo. Para activar manualmente: source $VENV_DIR/bin/activate"
