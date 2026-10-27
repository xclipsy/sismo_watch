# ==============================================================================
# DAG: INGESTA CONTINUA DE USGS A CAPA BRONCE (CADA 5 MINUTOS)
# ==============================================================================

from datetime import datetime, timedelta
import logging
import os
import psycopg2
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

logger = logging.getLogger("airflow.task")

def failure_alert_callback(context):
    dag_id = context.get("task_instance").dag_id
    task_id = context.get("task_instance").task_id
    exec_date = context.get("execution_date")
    exception = str(context.get("exception", "Fallo desconocido en ejecucion"))

    log_entry = f"{datetime.utcnow().isoformat()} [ERROR] DAG: {dag_id} | TASK: {task_id} | EXEC: {exec_date} | ERROR: {exception}\n"

    # 1. Escritura en archivo local de logs
    log_dir = "/opt/airflow/logs"
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, "pipeline_errors.log"), "a", encoding="utf-8") as f:
        f.write(log_entry)

    # 2. Persistencia en base de datos para la interfaz
    try:
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            dbname=os.getenv("APP_DB", "sismowatch_db"),
            user=os.getenv("POSTGRES_USER", "sismo_admin"),
            password=os.getenv("POSTGRES_PASSWORD", "SismoSecretPassword2026_Secure")
        )
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO pipeline_alerts (dag_id, task_id, execution_date, error_message, severity)
                VALUES (%s, %s, %s, %s, 'ERROR');
            """, (dag_id, task_id, exec_date, exception[:500]))
            conn.commit()
        conn.close()
    except Exception as db_err:
        logger.error("No se pudo registrar alerta en BD: %s", db_err)

def run_bronze_ingestion():
    import sys
    sys.path.append("/opt/airflow/include/spark")
    from ingest_bronze import ingest_to_bronze
    ingest_to_bronze()

default_args = {
    "owner": "sismowatch_data_team",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(seconds=30),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=10),
    "on_failure_callback": failure_alert_callback
}

with DAG(
    dag_id="usgs_ingest_bronze",
    default_args=default_args,
    description="Ingesta continua del feed sismico de USGS hacia la capa Bronce en Parquet",
    schedule_interval="*/5 * * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "bronze", "ingestion"]
) as dag:

    ingest_task = PythonOperator(
        task_id="ingest_usgs_to_bronze",
        python_callable=run_bronze_ingestion
    )

    trigger_transform = TriggerDagRunOperator(
        task_id="trigger_bronze_to_silver_gold",
        trigger_dag_id="bronze_to_silver_gold",
        wait_for_completion=False
    )

    ingest_task >> trigger_transform
