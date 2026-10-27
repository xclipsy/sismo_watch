-- ==============================================================================
-- INICIALIZACION DE ESQUEMAS, ROLES Y TABLAS PARA SISMOWATCH
-- Base de datos: sismowatch_db
-- ==============================================================================

\connect sismowatch_db;

-- 1. CREACION DE ROLES DE MINIMO PRIVILEGIO
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'role_ingest') THEN
        CREATE ROLE role_ingest;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'role_transform') THEN
        CREATE ROLE role_transform;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'role_curated_reader') THEN
        CREATE ROLE role_curated_reader;
    END IF;
END
$$;

-- 2. TABLA DE USUARIOS Y ROLES (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'viewer',
    full_name VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE KPIS DIARIOS (CAPA GOLD)
CREATE TABLE IF NOT EXISTS gold_daily_kpis (
    date DATE PRIMARY KEY,
    total_events_24h INT NOT NULL DEFAULT 0,
    max_magnitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    avg_magnitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tsunami_alerts_count INT NOT NULL DEFAULT 0,
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    last_update_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE ANOMALIAS SISMICAS (ANALITICA / ML)
CREATE TABLE IF NOT EXISTS gold_seismic_anomalies (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    detection_method VARCHAR(64) NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE REPORTES EJECUTIVOS (IA GENERATIVA LOCAL)
CREATE TABLE IF NOT EXISTS gold_ai_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    summary_text TEXT NOT NULL,
    validated_kpis JSONB NOT NULL,
    model_name VARCHAR(64) NOT NULL,
    inference_latency_ms INT NOT NULL DEFAULT 0,
    token_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA DE ALERTAS Y TELEMETRIA DEL PIPELINE (CENTRO DE NOTIFICACIONES)
CREATE TABLE IF NOT EXISTS pipeline_alerts (
    id SERIAL PRIMARY KEY,
    dag_id VARCHAR(128) NOT NULL,
    task_id VARCHAR(128) NOT NULL,
    execution_date TIMESTAMP WITH TIME ZONE NOT NULL,
    error_message TEXT NOT NULL,
    severity VARCHAR(32) DEFAULT 'ERROR',
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLA DE ULTIMOS EVENTOS SISMICOS EN TIEMPO REAL (SYNC DESDE SILVER/GOLD)
CREATE TABLE IF NOT EXISTS gold_recent_events (
    id VARCHAR(64) PRIMARY KEY,
    mag DOUBLE PRECISION NOT NULL,
    place VARCHAR(255) NOT NULL,
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    updated TIMESTAMP WITH TIME ZONE NOT NULL,
    tz INT,
    url VARCHAR(512),
    tsunami BOOLEAN DEFAULT FALSE,
    sig INT DEFAULT 0,
    status VARCHAR(32),
    mag_type VARCHAR(16),
    event_type VARCHAR(32),
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    depth_km DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ASIGNACION DE PERMISOS POR ROL
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO role_transform;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO role_curated_reader;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO role_transform;

-- 9. SEMBRADO DE USUARIOS INICIALES (ADMIN Y VIEWER)
INSERT INTO users (email, hashed_password, role, full_name)
VALUES 
    ('admin@sismowatch.internal', '$2b$12$mzdQEp4uexdYVdkJuG579.RHlAjBGUvDXOenv5IO/th1C3FV1Q..u', 'admin', 'Administrador SismoWatch'),
    ('viewer@sismowatch.internal', '$2b$12$RjNhaLwUs1QDeW3gejhSO.ldIz197PinoJR7BxMpssVylOUM0JsRm', 'viewer', 'Operador Visualizador')
ON CONFLICT (email) DO NOTHING;

-- 10. SEMBRADO DE REGISTRO INICIAL DE KPIS PARA ESTADO SALUDABLE
INSERT INTO gold_daily_kpis (date, total_events_24h, max_magnitude, avg_magnitude, tsunami_alerts_count, quality_score)
VALUES (CURRENT_DATE, 0, 0.0, 0.0, 0, 100.0)
ON CONFLICT (date) DO NOTHING;
