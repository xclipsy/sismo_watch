import os
import glob
import pytest
from airflow.models import DagBag

def test_dag_bag_import_errors():
    dag_folder = os.environ.get("AIRFLOW__CORE__DAGS_FOLDER")
    if not dag_folder or not os.path.exists(dag_folder):
        dag_folder = os.path.join(os.path.dirname(__file__), "../airflow/dags")
    if not os.path.exists(dag_folder):
        dag_folder = os.path.join(os.path.dirname(__file__), "../dags")
    if not os.path.exists(dag_folder):
        dag_folder = "/opt/airflow/dags"

    dag_files = glob.glob(os.path.join(dag_folder, "*.py"))
    assert len(dag_files) >= 4, f"Se esperaban al menos 4 DAGs en {dag_folder}, encontrados: {len(dag_files)}"

    dagbag = DagBag(dag_folder=dag_folder, include_examples=False)

    # Verificar que no existan errores de importacion ni ciclos
    assert len(dagbag.import_errors) == 0, f"Errores en importacion de DAGs: {dagbag.import_errors}"

    expected_dags = [
        "usgs_ingest_bronze",
        "bronze_to_silver_gold",
        "daily_ai_reporting",
        "historical_backfill"
    ]

    for expected_id in expected_dags:
        assert expected_id in dagbag.dags, f"DAG {expected_id} no fue cargado en el DagBag"
        dag = dagbag.dags[expected_id]
        assert len(dag.tasks) > 0, f"El DAG {expected_id} no contiene tareas"
