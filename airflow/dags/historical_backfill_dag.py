# ==============================================================================
# DAG: BACKFILL HISTORICO PARAMETRIZADO (HASTA 30 DIAS)
# ==============================================================================

import os
import sys
import logging
from datetime import datetime, timedelta, timezone
from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger("airflow.task")

def run_historical_backfill(**context):
    dag_run = context.get("dag_run")
    conf = dag_run.conf if dag_run and dag_run.conf else {}

    now = datetime.now(timezone.utc)
    default_start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    default_end = now.strftime("%Y-%m-%d")

    start_date = conf.get("start_date", default_start)
    end_date = conf.get("end_date", default_end)
    min_magnitude = conf.get("min_magnitude", 2.5)

    query_url = (
        f"https://earthquake.usgs.gov/fdsnws/event/1/query?"
        f"format=geojson&starttime={start_date}&endtime={end_date}&minmagnitude={min_magnitude}"
    )

    logger.info("Iniciando backfill historico desde %s hasta %s (URL: %s)", start_date, end_date, query_url)

    sys.path.append("/opt/airflow/include/spark")
    from ingest_bronze import ingest_to_bronze
    from transform_silver import process_bronze_to_silver
    from aggregate_gold import process_silver_to_gold

    # 1. Ingesta a Bronce
    ingest_to_bronze(feed_url=query_url)

    # 2. Transformacion idempotente a Silver
    process_bronze_to_silver()

    # 3. Agregacion y sincronizacion en Gold
    process_silver_to_gold()

    logger.info("Backfill historico completado exitosamente sin registros duplicados.")

default_args = {
    "owner": "sismowatch_data_team",
    "retries": 1,
    "execution_timeout": timedelta(minutes=30)
}

with DAG(
    dag_id="historical_backfill",
    default_args=default_args,
    description="Carga parametrizada de hasta 30 dias de eventos historicos con deduplicacion",
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sismowatch", "backfill", "admin"]
) as dag:

    backfill_task = PythonOperator(
        task_id="execute_historical_backfill",
        python_callable=run_historical_backfill,
        provide_context=True
    )
