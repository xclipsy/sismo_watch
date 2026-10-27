#!/bin/bash
set -e

# Crear bases de datos si no existen
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE airflow_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'airflow_db')\gexec
    SELECT 'CREATE DATABASE sismowatch_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sismowatch_db')\gexec
EOSQL
