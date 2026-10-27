#!/bin/bash
# ==============================================================================
# SISMOWATCH - SCRIPT UNIFICADO DE PUESTA EN MARCHA
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "Iniciando Plataforma SismoWatch (Arquitectura Medallon)"
echo "=========================================================="

# 1. Asegurar directorios locales del Lakehouse y permisos
mkdir -p data/lakehouse/bronze data/lakehouse/silver data/lakehouse/gold logs
chmod -R 777 data/ logs/ 2>/dev/null || true

# 2. Verificar puente de red Ollama (puerto 11435 -> 11434)
if ! pgrep -f "scripts/ollama_bridge.py" > /dev/null 2>&1; then
    echo "Iniciando puente de red Ollama en background (0.0.0.0:11435)..."
    nohup python3 scripts/ollama_bridge.py > /dev/null 2>&1 &
    sleep 1
else
    echo "Puente Ollama ya esta activo en el puerto 11435."
fi

# 3. Iniciar contenedores Docker
echo "Levantando servicios Docker Compose..."
docker compose up -d

# 4. Resumen de accesos
echo ""
echo "=========================================================="
echo "SismoWatch esta operativo en los siguientes endpoints:"
echo "=========================================================="
echo "  * Frontend Web:       http://localhost:3000"
echo "  * Backend API:        http://localhost:8000 (Docs: /docs)"
echo "  * Apache Airflow:     http://localhost:8080"
echo "  * MinIO Console:      http://localhost:9001"
echo "  * PostgreSQL:         localhost:5434"
echo ""
echo "Credenciales disponibles:"
echo "  - Usuario Viewer:  viewer@sismowatch.internal / Viewer2026!Secure"
echo "  - Usuario Admin:   admin@sismowatch.internal / Admin2026!Secure"
echo "  - Airflow Admin:   airflow_admin / AirflowAdminPassword2026!"
echo "=========================================================="
