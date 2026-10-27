# ==============================================================================
# DAG: TRANSFORMACION REACTIVA DE BRONCE A SILVER Y GOLD (ACID PARQUET)
# ==============================================================================

from datetime import datetime, timedelta
import logging
from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger("airflow.task")

def run_silver_transformation():
    import sys
    sys.path.append("/opt/airflow/include/spark")
    from transform_silver import process_bronze_to_silver
    process_bronze_to_silver()

def run_gold_aggregation():
    import sys
    sys.path.append("/opt/airflow/include/spark")
    from aggregate_gold import process_silver_to_gold
    process_silver_to_gold()

default_args = {
    "owner": "sismowatch_data_team",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=20),
    "execution_timeout": timedelta(minutes=15)
}

with DAG(
    dag_id="bronze_to_silver_gold",
    default_args=default_args,
    description="Transformacion normalizada a Silver y calculo de agregaciones Gold con consistencia ACID",
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "silver", "gold", "spark"]
) as dag:

    transform_silver_task = PythonOperator(
        task_id="transform_bronze_to_silver",
        python_callable=run_silver_transformation
    )

    aggregate_gold_task = PythonOperator(
        task_id="aggregate_silver_to_gold",
        python_callable=run_gold_aggregation
    )

    transform_silver_task >> aggregate_gold_task
