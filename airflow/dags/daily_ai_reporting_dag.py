# ==============================================================================
# DAG: REPORTE DIARIO CON IA (OLLAMA + FALLBACK DETERMINISTA)
# ==============================================================================

import os
import time
import json
import logging
from datetime import datetime, timezone
import requests
import psycopg2
from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger("airflow.task")

def run_daily_ai_report():
    # 1. Obtener conexion a PostgreSQL
    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "postgres"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        dbname=os.getenv("APP_DB", "sismowatch_db"),
        user=os.getenv("POSTGRES_USER", "sismo_admin"),
        password=os.getenv("POSTGRES_PASSWORD", "SismoSecretPassword2026_Secure")
    )

    today = datetime.now(timezone.utc).date()
    kpis = {"total_events": 0, "max_mag": 0.0, "avg_mag": 0.0, "tsunamis": 0}

    with conn.cursor() as cur:
        cur.execute("""
            SELECT total_events_24h, max_magnitude, avg_magnitude, tsunami_alerts_count
            FROM gold_daily_kpis
            WHERE date = %s;
        """, (today,))
        row = cur.fetchone()
        if row:
            kpis = {
                "total_events": row[0],
                "max_mag": float(row[1]),
                "avg_mag": float(row[2]),
                "tsunamis": int(row[3])
            }

    # 2. Inferencia con Ollama con bloque try-except defensivo
    ollama_url = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11435")
    model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    prompt = (
        f"Eres el analista sismologico de SismoWatch. Redacta un informe ejecutivo conciso sobre la actividad de hoy ({today}). "
        f"Cifras calculadas oficialmente: Total de sismos = {kpis['total_events']}, Magnitud maxima = {kpis['max_mag']}, "
        f"Magnitud promedio = {kpis['avg_mag']}, Eventos con alerta de tsunami = {kpis['tsunamis']}. "
        f"No inventes datos adicionales. Entrega una evaluacion tecnica clara en espanol."
    )

    report_text = ""
    latency_ms = 0
    start_time = time.time()

    try:
        logger.info("Solicitando informe a Ollama en %s con modelo %s...", ollama_url, model_name)
        res = requests.post(
            f"{ollama_url}/api/generate",
            json={"model": model_name, "prompt": prompt, "stream": False},
            timeout=45
        )
        res.raise_for_status()
        report_text = res.json().get("response", "").strip()
        latency_ms = int((time.time() - start_time) * 1000)
        logger.info("Informe generado por Ollama en %d ms.", latency_ms)
    except Exception as err:
        logger.warning("Fallo en inferencia Ollama o servicio apagado (%s). Conmutando a plantilla determinista.", err)
        report_text = (
            f"Informe Ejecutivo SismoWatch ({today}) - Generacion de Contingencia:\n"
            f"Durante las ultimas 24 horas se registraron {kpis['total_events']} eventos sismicos a nivel global. "
            f"La magnitud maxima observada fue de {kpis['max_mag']} con un promedio aritmetico de {kpis['avg_mag']}. "
            f"Se identificaron {kpis['tsunamis']} eventos con alerta de tsunami activada. "
            f"Los sistemas de monitoreo y calidad reportan estabilidad en el flujo de datos."
        )
        latency_ms = int((time.time() - start_time) * 1000)

    # 3. Persistencia en la tabla gold_ai_reports
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO gold_ai_reports (report_date, summary_text, validated_kpis, model_name, inference_latency_ms, token_count)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (report_date) DO UPDATE SET
                    summary_text = EXCLUDED.summary_text,
                    validated_kpis = EXCLUDED.validated_kpis,
                    model_name = EXCLUDED.model_name,
                    inference_latency_ms = EXCLUDED.inference_latency_ms;
            """, (today, report_text, json.dumps(kpis), model_name, latency_ms, len(report_text.split())))
            conn.commit()
            logger.info("Reporte diario persistido exitosamente en la capa Gold.")
    finally:
        conn.close()

with DAG(
    dag_id="daily_ai_reporting",
    default_args={"owner": "sismowatch_data_team", "retries": 1},
    description="Generacion diaria de reporte sismico con Ollama y fallback determinista",
    schedule_interval="0 0 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sismowatch", "ai", "reporting"]
) as dag:

    report_task = PythonOperator(
        task_id="generate_and_persist_daily_report",
        python_callable=run_daily_ai_report
    )
