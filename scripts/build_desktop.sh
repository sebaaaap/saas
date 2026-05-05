#!/bin/bash
# Script para construir el ejecutable Desktop (Tauri + Python Sidecar)

# 1. Configuración
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
TAURI_DIR="src-tauri"
DIST_DIR="$BACKEND_DIR/dist"
BIN_NAME="pos_backend" 

# Detectar OS para extensión del binario
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    EXT=".exe"
    TARGET_TRIPLE="x86_64-pc-windows-msvc" # Ajustar según instalación Rust
else
    EXT=""
    # En Mac puede ser aarch64-apple-darwin o x86_64-apple-darwin
    TARGET_TRIPLE="universal-apple-darwin" 
fi

echo ">>> Iniciando Build Desktop..."

# 2. Construir Binario Python (Sidecar)
echo ">>> Empaquetando Backend Python con PyInstaller..."
cd $BACKEND_DIR
source .venv/bin/activate
# Instalamos pyinstaller si no está
pip install pyinstaller

# Creamos el ejecutable "onefile"
# --name: nombre del binario
# --windowed: no mostrar consola (en Mac/Win)
# --add-data: incluir .db template si fuera necesario
pyinstaller --clean --noconfirm --name $BIN_NAME --onefile app/main.py

# Volver a raíz
cd ..

# 3. Mover binario a donde Tauri lo espera
# Tauri espera los sidecars en src-tauri/binaries/
# El nombre debe incluir el target triple: name-target-triple(.exe)
mkdir -p $TAURI_DIR/binaries

# Nota: Para desarrollo rápido, usaremos un nombre genérico, 
# pero Tauri exige formato específico en tauri.conf.json.
# Aquí simplemente copiamos lo generado.
cp "$DIST_DIR/$BIN_NAME$EXT" "$TAURI_DIR/binaries/$BIN_NAME-$TARGET_TRIPLE$EXT"

echo ">>> Binario Python copiado a $TAURI_DIR/binaries/"

# 4. Build Frontend (Static Export)
echo ">>> Construyendo Frontend (Static Export)..."
cd $FRONTEND_DIR
# Cambiamos temporalmente next.config.js o usamos variable de entorno si configuramos
# Para este ejemplo asumimos que package.json tiene un script "build:desktop" -> "next build && next export"
# Ojo: Next 13+ usa "output: export" en config.
export NEXT_PUBLIC_MODE="DESKTOP"
npm run build 
cd ..

# 5. Build Tauri
echo ">>> Empaquetando con Tauri..."
# Requiere rust instalado
npm install -D @tauri-apps/cli
# npm run tauri build
echo "Listo para ejecutar 'npm run tauri build' (cuando Tauri esté configurado)"
