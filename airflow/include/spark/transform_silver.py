# ==============================================================================
# SISMOWATCH - CAPA SILVER (NORMALIZACION, TIPADO Y ACID SIN CUARENTENA)
# MOTOR LIGERO OPTIMIZADO (PANDAS + PYARROW + POSTGRESQL)
# ==============================================================================

import os
import sys
import json
import glob
import logging
import shutil
from datetime import datetime, timezone
import pandas as pd
import boto3
from botocore.client import Config
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sismowatch.silver")

def get_boto3_client():
    minio_endpoint = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")
    minio_access_key = os.getenv("AWS_ACCESS_KEY_ID", "minio_sismo_master")
    minio_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "MinioSecurePassword2026!")

    return boto3.client(
        "s3",
        endpoint_url=minio_endpoint,
        aws_access_key_id=minio_access_key,
        aws_secret_access_key=minio_secret_key,
        config=Config(signature_version="s3v4")
    )

def process_bronze_to_silver(input_bronze_path: str = None, output_silver_path: str = None):
    logger.info("Iniciando transformacion Bronze -> Silver...")

    base_dir = os.getenv("LAKEHOUSE_BASE_DIR", "/opt/airflow/data/lakehouse")
    bronze_dir = input_bronze_path or os.path.join(base_dir, "bronze", "events")
    silver_dir = output_silver_path or os.path.join(base_dir, "silver", "events")

    # 1. Cargar datos crudos desde Parquet local o PostgreSQL bronze_raw_events
    raw_payloads = []

    parquet_files = glob.glob(os.path.join(bronze_dir, "**", "*.parquet"), recursive=True)
    if parquet_files:
        logger.info("Leyendo %d archivos Parquet de capa Bronze...", len(parquet_files))
        for pfile in parquet_files:
            try:
                bdf = pd.read_parquet(pfile)
                if "raw_payload" in bdf.columns:
                    raw_payloads.extend(bdf["raw_payload"].tolist())
            except Exception as e:
                logger.warning("No se pudo leer archivo Parquet %s: %s", pfile, e)

    # Si no habia archivos Parquet o se quiere complementar, leer desde PostgreSQL
    if not raw_payloads:
        logger.info("Buscando eventos en PostgreSQL bronze_raw_events...")
        try:
            conn = psycopg2.connect(
                host=os.getenv("POSTGRES_HOST", "postgres"),
                port=os.getenv("POSTGRES_PORT", "5432"),
                dbname=os.getenv("APP_DB", "sismowatch_db"),
                user=os.getenv("POSTGRES_USER", "sismo_admin"),
                password=os.getenv("POSTGRES_PASSWORD", "SismoSecretPassword2026_Secure")
            )
            with conn.cursor() as cur:
                cur.execute("SELECT payload FROM bronze_raw_events ORDER BY ingestion_timestamp DESC LIMIT 5000;")
                rows = cur.fetchall()
                raw_payloads = [r[0] if isinstance(r[0], str) else json.dumps(r[0]) for r in rows]
            conn.close()
        except Exception as db_err:
            logger.error("Error al consultar PostgreSQL bronze_raw_events: %s", db_err)

    if not raw_payloads:
        logger.warning("No se encontraron eventos crudos para transformar.")
        return

    logger.info("Total de payloads crudos a procesar: %d", len(raw_payloads))

    # 2. Desanidado y tipado estricto en memoria
    cleaned_rows = []
    for raw in raw_payloads:
        try:
            feat = json.loads(raw) if isinstance(raw, str) else raw
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates", [0.0, 0.0, 0.0])

            event_id = feat.get("id")
            if not event_id:
                continue

            mag = float(props.get("mag") or 0.0)
            place = str(props.get("place") or "Ubicacion no especificada").strip()
            time_ms = props.get("time")
            updated_ms = props.get("updated")

            if time_ms is None or updated_ms is None:
                continue

            time_utc = datetime.fromtimestamp(time_ms / 1000.0, tz=timezone.utc)
            updated_utc = datetime.fromtimestamp(updated_ms / 1000.0, tz=timezone.utc)

            lon = float(coords[0])
            lat = float(coords[1])
            depth = float(coords[2]) if len(coords) > 2 else 0.0

            # 3. FILTRADO LIMPIO EN MEMORIA (OMISION TOTAL DE CUARENTENA)
            if not (-90.0 <= lat <= 90.0):
                continue
            if not (-180.0 <= lon <= 180.0):
                continue
            if not (-2.0 <= mag <= 10.0):
                continue

            tsunami = bool(props.get("tsunami") == 1)
            sig = int(props.get("sig") or 0)
            status = str(props.get("status") or "automatic")
            mag_type = str(props.get("magType") or "unknown")
            url = str(props.get("url") or "")

            cleaned_rows.append({
                "id": event_id,
                "mag": round(mag, 2),
                "place": place,
                "time": time_utc,
                "updated": updated_utc,
                "longitude": round(lon, 4),
                "latitude": round(lat, 4),
                "depth_km": round(depth, 2),
                "tsunami": tsunami,
                "sig": sig,
                "status": status,
                "mag_type": mag_type,
                "url": url,
                "processed_at": datetime.now(timezone.utc)
            })
        except Exception as parse_err:
            # En caso de formato corrupto se descarta limpiamente sin cuarentena
            continue

    if not cleaned_rows:
        logger.warning("Ningun registro supero los criterios de limpieza.")
        return

    df_clean = pd.DataFrame(cleaned_rows)

    # 4. DEDUPLICACION ANALITICA (Garantia de Idempotencia)
    # Mantener unicamente el registro con fecha updated mas reciente por id
    df_dedup = df_clean.sort_values(by="updated", ascending=False).drop_duplicates(subset=["id"], keep="first")
    logger.info("Registros limpios deduplicados en Silver: %d (de %d originales)", len(df_dedup), len(cleaned_rows))

    # 5. ATOMICIDAD (A) MEDIANTE ESCRITURA EN STAGING Y REEMPLAZO ATOMICO
    staging_dir = os.path.join(base_dir, "silver", "_staging")
    os.makedirs(staging_dir, exist_ok=True)
    os.makedirs(silver_dir, exist_ok=True)

    staging_file = os.path.join(staging_dir, "events_staging.parquet")
    final_file = os.path.join(silver_dir, "events.parquet")

    df_dedup.to_parquet(staging_file, engine="pyarrow", index=False)
    shutil.move(staging_file, final_file)
    logger.info("Persistido atómicamente en Parquet Silver: %s", final_file)

    # 6. Replicar en MinIO sismowatch-silver (si esta disponible)
    try:
        s3 = get_boto3_client()
        s3.upload_file(final_file, "sismowatch-silver", "events/events.parquet")
        logger.info("Replicado en MinIO S3 sismowatch-silver/events/events.parquet")
    except Exception as s3_err:
        logger.warning("Aviso MinIO Silver: %s", s3_err)

    # 7. Sincronizar en PostgreSQL silver_clean_events
    try:
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            dbname=os.getenv("APP_DB", "sismowatch_db"),
            user=os.getenv("POSTGRES_USER", "sismo_admin"),
            password=os.getenv("POSTGRES_PASSWORD", "SismoSecretPassword2026_Secure")
        )
        db_tuples = [
            (
                r["id"], r["mag"], r["place"], r["time"], r["updated"],
                r["longitude"], r["latitude"], r["depth_km"], r["tsunami"],
                r["sig"], r["status"], r["mag_type"], r["url"], r["processed_at"]
            )
            for _, r in df_dedup.iterrows()
        ]
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO silver_clean_events (
                    id, mag, place, time, updated, longitude, latitude, depth_km,
                    tsunami, sig, status, mag_type, url, processed_at
                ) VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    mag = EXCLUDED.mag,
                    place = EXCLUDED.place,
                    time = EXCLUDED.time,
                    updated = EXCLUDED.updated,
                    longitude = EXCLUDED.longitude,
                    latitude = EXCLUDED.latitude,
                    depth_km = EXCLUDED.depth_km,
                    tsunami = EXCLUDED.tsunami,
                    sig = EXCLUDED.sig,
                    status = EXCLUDED.status,
                    mag_type = EXCLUDED.mag_type,
                    url = EXCLUDED.url,
                    processed_at = EXCLUDED.processed_at;
                """,
                db_tuples
            )
            conn.commit()
        conn.close()
        logger.info("Sincronizados %d registros en tabla silver_clean_events", len(db_tuples))
    except Exception as db_err:
        logger.error("Error al sincronizar silver_clean_events en PostgreSQL: %s", db_err)

if __name__ == "__main__":
    process_bronze_to_silver()
