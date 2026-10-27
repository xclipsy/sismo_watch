# ==============================================================================
# SISMOWATCH - CAPA BRONCE (INGESTA INMUTABLE RAW EN PARQUET Y JSONB)
# MOTOR LIGERO OPTIMIZADO (PANDAS + PYARROW + BOTO3 + POSTGRESQL)
# ==============================================================================

import sys
import os
import json
import logging
from datetime import datetime, timezone
import requests
import pandas as pd
import boto3
from botocore.client import Config
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sismowatch.bronze")

def get_boto3_client():
    minio_endpoint = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")
    minio_access_key = os.getenv("AWS_ACCESS_KEY_ID", "minio_sismo_master")
    minio_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "MinioSecurePassword2026!")

    s3 = boto3.client(
        "s3",
        endpoint_url=minio_endpoint,
        aws_access_key_id=minio_access_key,
        aws_secret_access_key=minio_secret_key,
        config=Config(signature_version="s3v4")
    )
    return s3

def fetch_usgs_data(url: str, timeout: int = 30) -> dict:
    try:
        logger.info("Iniciando peticion a la API de USGS: %s", url)
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        logger.info("Respuesta de USGS recibida exitosamente. Eventos: %d", len(data.get("features", [])))
        return data
    except requests.exceptions.Timeout as err:
        logger.error("Timeout de conexion agotado con USGS: %s", err)
        raise
    except requests.exceptions.RequestException as err:
        logger.error("Fallo critico de comunicacion con USGS: %s", err)
        raise

def ingest_to_bronze(feed_url: str = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"):
    data = fetch_usgs_data(feed_url)
    features = data.get("features", [])
    if not features:
        logger.warning("No se recibieron sismos en la ventana temporal actual.")
        return

    now_utc = datetime.now(timezone.utc)
    bronze_records = []
    db_records = []

    for feat in features:
        event_id = feat.get("id")
        if not event_id:
            continue
        raw_json_str = json.dumps(feat)
        bronze_records.append({
            "id": event_id,
            "raw_payload": raw_json_str,
            "ingestion_timestamp": now_utc,
            "year": now_utc.year,
            "month": now_utc.month,
            "day": now_utc.day
        })
        db_records.append((event_id, now_utc, raw_json_str))

    if not bronze_records:
        logger.warning("No se encontraron registros validos para persistir.")
        return

    df = pd.DataFrame(bronze_records)

    # 1. Guardar en Parquet local (Lakehouse filesystem)
    base_dir = os.getenv("LAKEHOUSE_BASE_DIR", "/opt/airflow/data/lakehouse")
    partition_dir = os.path.join(base_dir, "bronze", "events", f"year={now_utc.year}", f"month={now_utc.month:02d}", f"day={now_utc.day:02d}")
    os.makedirs(partition_dir, exist_ok=True)

    filename = f"events_{now_utc.strftime('%Y%m%d_%H%M%S')}.parquet"
    local_parquet_path = os.path.join(partition_dir, filename)
    df.to_parquet(local_parquet_path, engine="pyarrow", index=False)
    logger.info("Guardados %d registros en Lakehouse local Parquet: %s", len(df), local_parquet_path)

    # 2. Replicar a MinIO S3 Lakehouse (si esta disponible)
    try:
        s3 = get_boto3_client()
        s3_key = f"events/year={now_utc.year}/month={now_utc.month:02d}/day={now_utc.day:02d}/{filename}"
        s3.upload_file(local_parquet_path, "sismowatch-bronze", s3_key)
        logger.info("Replicado en MinIO S3 sismowatch-bronze/%s", s3_key)
    except Exception as s3_err:
        logger.warning("Aviso MinIO: No se pudo subir a S3 (%s), persistencia local asegurada.", s3_err)

    # 3. Guardar en PostgreSQL Document Store (bronze_raw_events JSONB)
    try:
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            dbname=os.getenv("APP_DB", "sismowatch_db"),
            user=os.getenv("POSTGRES_USER", "sismo_admin"),
            password=os.getenv("POSTGRES_PASSWORD", "SismoSecretPassword2026_Secure")
        )
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO bronze_raw_events (id, ingestion_timestamp, payload)
                VALUES %s
                ON CONFLICT (id) DO UPDATE 
                SET ingestion_timestamp = EXCLUDED.ingestion_timestamp,
                    payload = EXCLUDED.payload;
                """,
                db_records
            )
            conn.commit()
        conn.close()
        logger.info("Persistidos %d documentos JSONB en PostgreSQL bronze_raw_events", len(db_records))
    except Exception as db_err:
        logger.error("Error al persistir en bronze_raw_events: %s", db_err)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    ingest_to_bronze(url)
