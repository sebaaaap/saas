#!/usr/bin/env bash
# =============================================================================
# run_tests.sh — Suite de Pruebas Automatizadas POS Automotriz
# =============================================================================
# USO:
#   cd backend/
#   chmod +x run_tests.sh
#   ./run_tests.sh
#
# FLAGS OPCIONALES:
#   ./run_tests.sh --fast          → Solo tests rápidos (sin coverage)
#   ./run_tests.sh --modulo pos    → Solo un módulo (pos, inventario, compras, etc.)
# =============================================================================

set -e  # Detener en el primer error de bash (no de pytest)

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║      🔧 POS AUTOMOTRIZ — SUITE DE PRUEBAS AUTOMATIZADAS  ║${NC}"
echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Activar entorno virtual ──────────────────────────────────────────────────
if [ -d ".venv" ]; then
    echo -e "${YELLOW}→ Activando entorno virtual (.venv)...${NC}"
    source .venv/bin/activate
else
    echo -e "${RED}⚠ No se encontró .venv. Asegúrate de crear el entorno virtual primero:${NC}"
    echo -e "  python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# ─── Verificar dependencias de test ───────────────────────────────────────────
echo -e "${YELLOW}→ Verificando dependencias de pytest...${NC}"
pip install pytest pytest-cov pytest-html httpx --quiet

# ─── Variables de Entorno para Test ───────────────────────────────────────────
export TESTING=1
export DATABASE_URL="sqlite:///:memory:"  # BDD en memoria, NUNCA la de producción
export SECRET_KEY="test-secret-key-for-pytest-only-do-not-use-in-prod"
export ACCESS_TOKEN_EXPIRE_MINUTES=30

# ─── Parseo de argumentos ─────────────────────────────────────────────────────
FAST_MODE=false
MODULO=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --fast) FAST_MODE=true ;;
        --modulo) MODULO="$2"; shift ;;
        *) echo -e "${RED}Argumento desconocido: $1${NC}"; exit 1 ;;
    esac
    shift
done

# ─── Directorio de reportes ───────────────────────────────────────────────────
REPORT_DIR="tests/reports"
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ─── Selección de módulos ─────────────────────────────────────────────────────
if [ -n "$MODULO" ]; then
    TEST_PATH="tests/test_${MODULO}.py"
    echo -e "${YELLOW}→ Corriendo solo módulo: ${BOLD}${MODULO}${NC}"
else
    TEST_PATH="tests/"
    echo -e "${YELLOW}→ Corriendo TODOS los módulos...${NC}"
fi

echo ""
echo -e "${BOLD}Fecha: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}Módulos: ${TEST_PATH}${NC}"
echo "──────────────────────────────────────────────────────────"
echo ""

# ─── Ejecución Principal ──────────────────────────────────────────────────────
if [ "$FAST_MODE" = true ]; then
    echo -e "${YELLOW}⚡ Modo Rápido (sin coverage)${NC}"
    python -m pytest "$TEST_PATH" \
        -v \
        --tb=short \
        --no-header \
        -rN \
        2>&1 | tee "${REPORT_DIR}/run_${TIMESTAMP}.txt"
else
    echo -e "${YELLOW}📊 Modo Completo (con coverage HTML + reporte)${NC}"
    python -m pytest "$TEST_PATH" \
        -v \
        --tb=long \
        --no-header \
        --cov=app \
        --cov-report=term-missing \
        --cov-report="html:${REPORT_DIR}/coverage_${TIMESTAMP}" \
        --html="${REPORT_DIR}/report_${TIMESTAMP}.html" \
        --self-contained-html \
        -rA \
        2>&1 | tee "${REPORT_DIR}/run_${TIMESTAMP}.txt"
fi

# ─── Resultado Final ──────────────────────────────────────────────────────────
EXIT_CODE=${PIPESTATUS[0]}
echo ""
echo "══════════════════════════════════════════════════════════"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ TODOS LOS TESTS PASARON — Sistema estable para deploy${NC}"
else
    echo -e "${RED}${BOLD}❌ ALGUNOS TESTS FALLARON — NO desplegar hasta corregir${NC}"
    echo ""
    echo -e "${YELLOW}Revisa el reporte en: ${REPORT_DIR}/run_${TIMESTAMP}.txt${NC}"
fi

if [ "$FAST_MODE" = false ] && [ -d "${REPORT_DIR}/coverage_${TIMESTAMP}" ]; then
    echo -e "${BLUE}📋 Reporte HTML de cobertura: ${REPORT_DIR}/coverage_${TIMESTAMP}/index.html${NC}"
fi

echo "══════════════════════════════════════════════════════════"
echo ""

exit $EXIT_CODE
