#!/usr/bin/env python3
import os
import time
import logging
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, EndpointConnectionError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sismowatch.minio_init")

def create_sismowatch_buckets():
    endpoint = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")
    access_key = os.getenv("MINIO_ROOT_USER", "minio_sismo_master")
    secret_key = os.getenv("MINIO_ROOT_PASSWORD", "MinioSecurePassword2026!")

    logger.info("Conectando con MinIO en %s...", endpoint)

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1"
    )

    # Esperar a que MinIO responda
    max_retries = 15
    for attempt in range(max_retries):
        try:
            s3_client.list_buckets()
            logger.info("Conexion exitosa con MinIO.")
            break
        except (EndpointConnectionError, ClientError) as err:
            logger.warning("MinIO no listo aun (intento %d/%d): %s. Reintentando...", attempt + 1, max_retries, err)
            time.sleep(2)
    else:
        logger.error("No se pudo conectar a MinIO tras %d intentos.", max_retries)
        exit(1)

    buckets = ["sismowatch-bronze", "sismowatch-silver", "sismowatch-gold"]
    for bucket in buckets:
        try:
            s3_client.create_bucket(Bucket=bucket)
            logger.info("Bucket creado exitosamente: %s", bucket)
        except ClientError as err:
            error_code = err.response.get("Error", {}).get("Code")
            if error_code in ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"]:
                logger.info("Bucket ya existe: %s", bucket)
            else:
                logger.error("Error al crear bucket %s: %s", bucket, err)

if __name__ == "__main__":
    create_sismowatch_buckets()
