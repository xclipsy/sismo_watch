# PLAN MAESTRO DE CONSTRUCCION POR FASES: PROYECTO SISMOWATCH

## INFORMACION GENERAL DEL PROYECTO
* Proyecto: Plataforma SismoWatch - Arquitectura Medallon (Bronce, Silver, Gold).
* Modalidad: Ecosistema contenerizado 100% en Docker (`docker compose up -d`).
* Restricciones Criticas de Negocio:
  - Sin tablas ni capas de cuarentena (omision total de cuarentena).
  - Manejo de consistencia transaccional ACID mediante Apache Spark con Parquet nativo y PostgreSQL.
  - Orquestacion completa mediante Apache Airflow.
  - Gobernanza, catalogo y linaje automatizado en OpenMetadata.
  - Chatbot IA local con Ollama (`qwen2.5:7b`) totalmente desacoplado del flujo critico.
  - Frontend con diseno Fintech BigPay, micro-animaciones Jitter y 5 vistas especializadas.
  - Sin inclusion de emojis en documentacion ni codigo fuente.

---

## REGISTRO CRONOLOGICO DE FASES DE IMPLEMENTACION

```
[FASE 1] Infraestructura Base, Secretos y Manifiesto Docker Compose
    |
    v
[FASE 2] Esquemas Relacionales, Roles de Base de Datos y MinIO Lakehouse
    |
    v
[FASE 3] Logica de Procesamiento Spark (Parquet Nativo, ACID e Idempotencia)
    |
    v
[FASE 4] Orquestacion con Apache Airflow, DAGs, Reintentos y Logs
    |
    v
[FASE 5] Gobernanza y Trazabilidad con OpenMetadata
    |
    v
[FASE 6] Backend API con FastAPI, Streaming SSE y Chatbot Desacoplado
    |
    v
[FASE 7] Frontend Web (Vite + React + TS + Tailwind + Jitter Animations)
    |
    v
[FASE 8] Suite de Pruebas Automatizadas (Pytest) y Escaneo de Seguridad
    |
    v
[FASE 9] Verificacion Integral End-to-End, Auditoria y Empaquetado Final
```

---

## DETALLE OPERATIVO DE CADA FASE

### FASE 1: INFRAESTRUCTURA BASE, SECRETOS Y MANIFIESTO DOCKER COMPOSE
* Objetivo: Configurar el andamiaje del repositorio y la orquestacion de contenedores para garantizar que el sistema levante con un unico comando.
* Tareas de la Fase:
  1. Crear la jerarquia de directorios del proyecto:
     - `airflow/dags/`
     - `airflow/include/`
     - `airflow/tests/`
     - `api/app/`
     - `web/src/`
     - `db/init/`
     - `logs/`
     - `docs/`
  2. Generar el archivo `.env.example` y el `.env` local con claves criptograficas (Fernet key de Airflow y JWT secret).
  3. Crear el archivo `docker-compose.yml` consolidando los 10 servicios:
     - `postgres` (metastore Airflow y BD relacional sismowatch).
     - `minio` (servidor S3 Data Lakehouse).
     - `minio-init` (creacion automatica de buckets).
     - `spark-master` y `spark-worker` (cluster Apache Spark 3.5.1).
     - `airflow-init`, `airflow-webserver` y `airflow-scheduler`.
     - `openmetadata-server` (puerto 8585).
     - `api` (FastAPI).
     - `web` (React Vite).
  4. Configurar la directiva `extra_hosts: ["host.docker.internal:host-gateway"]` para permitir la conexion con el servicio local Ollama en el puerto 11434.
* Entregables de la Fase:
  - `docker-compose.yml`
  - `.env.example`
  - Estructura de carpetas verificada.
* Criterio de Exito:
  - `docker compose config` valida la sintaxis sin advertencias ni errores.

---

### FASE 2: ESQUEMAS RELACIONALES, ROLES DE BD Y MINIO LAKEHOUSE
* Objetivo: Establecer el almacenamiento físico, los permisos de minimo privilegio y los buckets del Lakehouse.
* Tareas de la Fase:
  1. Crear el script de inicializacion SQL `db/init/01_init_schemas.sql`:
     - Creacion de roles: `role_ingest`, `role_transform`, `role_curated_reader`.
     - Asignacion estricta de permisos (la API publica solo recibe acceso SELECT sobre la capa Gold).
     - Creacion de tablas Gold relacionales: `gold_daily_kpis`, `gold_seismic_anomalies`, `gold_ai_reports`, `pipeline_alerts` y `users`.
     - Sembrado de usuarios iniciales con contrasenas hasheadas con bcrypt:
       * `admin@sismowatch.internal` (Rol: admin).
       * `viewer@sismowatch.internal` (Rol: viewer).
  2. Implementar el script de inicializacion `db/init/02_minio_buckets.sh` en `minio-init`:
     - Creacion de los 3 buckets unicos: `sismowatch-bronze`, `sismowatch-silver` y `sismowatch-gold`.
* Entregables de la Fase:
  - `db/init/01_init_schemas.sql`
  - `db/init/02_minio_buckets.sh`
* Criterio de Exito:
  - Al iniciar Postgres y MinIO, las tablas, roles y buckets quedan disponibles de forma automatica.

---

### FASE 3: PROCESAMIENTO SPARK (PARQUET NATIVO, ACID E IDEMPOTENCIA)
* Objetivo: Construir la logica distribuida de transformacion entre capas sin usar Delta Lake ni tablas de cuarentena.
* Tareas de la Fase:
  1. Modulo de Ingesta a Bronce (`airflow/include/spark/ingest_bronze.py`):
     - Recepcion del GeoJSON de USGS y persistencia inmutable en formato Parquet en `s3a://sismowatch-bronze/events/year=YYYY/month=MM/day=DD/`.
  2. Modulo de Transformacion a Silver (`airflow/include/spark/transform_silver.py`):
     - Desanidado de campos GeoJSON y casteo estricto a tipos de datos numericos y temporales.
     - Filtrado limpio en memoria: exclusion de registros con coordenadas imposibles o magnitudes fuera de rango fisico [-2.0, 10.0] sin detener el pipeline ni generar tablas de cuarentena.
     - Garantia de Atomicidad (A): Escritura en prefijo temporal `_staging/` y promocion dinamica con `partitionOverwriteMode = dynamic`.
     - Garantia de Idempotencia: Deduplicacion analitica mediante funciones de ventana `Window.partitionBy("id").orderBy(col("updated").desc())` para actualizar revisiones sin duplicados.
  3. Modulo de Agregaciones a Gold (`airflow/include/spark/aggregate_gold.py`):
     - Calculo de KPIs sismicos de 24 horas y series temporales horarias.
     - Deteccion analitica de anomalias sismicas mediante Z-Score en magnitudes y agrupacion geoespacial.
     - Sincronizacion transaccional ACID en PostgreSQL.
* Entregables de la Fase:
  - Scripts PySpark probados y optimizados para lectura y escritura S3A.
* Criterio de Exito:
  - Procesamiento de un lote con datos sucios sin caida del trabajo y sin duplicacion de registros en re-ejecucion.

---

### FASE 4: ORQUESTACION CON APACHE AIRFLOW, DAGS Y MANEJO DE ERRORES
* Objetivo: Automatizar el flujo continuo, backfills y mecanismos de contingencia.
* Tareas de la Fase:
  1. Desarrollar DAG `usgs_ingest_bronze_dag`:
     - Programacion cada 5 minutos (`*/5 * * * *`).
     - Tarea de peticion HTTP a la API de USGS con timeout de 30s.
     - Reintentos con espera creciente exponencial (`retries=3, retry_delay=30s`).
     - Alerta ante fallos con `on_failure_callback`.
  2. Desarrollar DAG `bronze_to_silver_gold_dag`:
     - Disparador reactivo tras la ingesta de Bronce.
     - Ejecucion del trabajo de Spark mediante `SparkSubmitOperator` o Python TaskFlow.
  3. Desarrollar DAG `daily_ai_reporting_dag`:
     - Programacion diaria a medianoche (`0 0 * * *`).
     - Calculo determinista de metricas en SQL.
     - Llamada a Ollama con bloque `try-except`. Si Ollama no responde o esta apagado, conmuta al generador de plantillas deterministas de Python (fallback sin rotura).
  4. Desarrollar DAG `historical_backfill_dag`:
     - DAG parametrizado con `start_date` y `end_date` (hasta 30 dias de historial).
  5. Configurar el gestor de incidentes:
     - El `on_failure_callback` escribe los incidentes en `/logs/pipeline_errors.log` y registra la alerta en la base de datos para la UI.
* Entregables de la Fase:
  - Archivos DAG en `airflow/dags/`.
  - Modulo de utilidades y callbacks en `airflow/include/`.
* Criterio de Exito:
  - Los 4 DAGs cargan sin errores de sintaxis (`AirflowDagCycleException` igual a 0).

---

### FASE 5: GOBERNANZA Y TRAZABILIDAD CON OPENMETADATA
* Objetivo: Configurar la catalogacion de datos, linaje de extremo a extremo y pruebas de calidad automatizadas.
* Tareas de la Fase:
  1. Configurar los conectores de metadatos en OpenMetadata:
     - Conector S3 / MinIO para los buckets Bronce, Silver y Gold.
     - Conector PostgreSQL para las tablas analiticas.
  2. Registrar el Linaje de Datos (Lineage):
     - Trazabilidad visual: `USGS API -> sismowatch-bronze -> sismowatch-silver -> sismowatch-gold -> FastAPI -> Dashboard`.
  3. Configurar pruebas automaticas de perfilado de datos:
     - Freshness check (< 15 minutos en la capa Silver).
     - Column level checks (completitud de identificadores y rangos geograficos).
* Entregables de la Fase:
  - Manifiestos de ingesta YAML de OpenMetadata y scripts de configuracion.
* Criterio de Exito:
  - Linaje visible en la consola de OpenMetadata en el puerto 8585.

---

### FASE 6: BACKEND API (FASTAPI), STREAMING SSE Y CHATBOT
* Objetivo: Construir la API REST de alta disponibilidad, autenticacion RBAC y streaming en tiempo real.
* Tareas de la Fase:
  1. Modulo de Seguridad y Autenticacion (`api/app/auth.py`):
     - Endpoint `POST /auth/login` (emision de JWT con rol `viewer` o `admin`).
     - Dependencias de seguridad `get_current_user` y `require_admin`.
  2. Endpoints de Consulta Analitica (`api/app/routes/analytics.py`):
     - `GET /api/kpis`: Metricas 24h consolidadas.
     - `GET /api/events`: Consulta paginada con filtros de magnitud, fecha y lugar.
     - `GET /api/stats/timeseries`: Serie temporal y distribucion.
     - `GET /api/reports`: Historico de reportes ejecutivos.
     - `GET /api/reports/export`: Descarga de reportes en formato CSV o PDF.
     - `GET /api/pipeline/status`: Estado de DAGs y notificaciones de error.
  3. Modulo de Streaming en Tiempo Real (`api/app/routes/stream.py`):
     - Endpoint `GET /api/stream` implementando Server-Sent Events (SSE) con `StreamingResponse`.
  4. Endpoints Administrativos Protegidos (`api/app/routes/admin.py`):
     - `POST /api/admin/backfill`: Dispara el DAG de backfill en Airflow via API.
     - `POST /api/admin/reports/regenerate`: Fuerza la regeneracion del reporte IA.
     - Restriccion estricta: Retorna HTTP 403 Forbidden a usuarios con rol `viewer`.
  5. Endpoint del Chatbot IA Desacoplado (`api/app/routes/chat.py`):
     - `POST /api/chat/ask`: Conexion con Ollama (`host.docker.internal:11434`).
     - Timeout de 2 segundos. Si Ollama esta apagado, retorna mensaje amigable informando que el servicio de chat esta inactivo pero las metricas estan operativas.
* Entregables de la Fase:
  - Codigo fuente completo de la API en `api/`.
  - Dockerfile de la API.
* Criterio de Exito:
  - Documentacion interactiva OpenAPI accesible en `http://localhost:8000/docs` con tests de autorizacion pasando.

---

### FASE 7: FRONTEND WEB (REACT + TS + VITE + TAILWIND + JITTER)
* Objetivo: Implementar la aplicacion web con la identidad visual Fintech BigPay, micro-animaciones Jitter y 5 vistas especializadas.
* Tareas de la Fase:
  1. Inicializacion del proyecto Vite con React 18 y TypeScript.
  2. Configuracion de Tailwind CSS con los tokens de diseno BigPay:
     - Colores primarios blanco (`#FFFFFF`) y fondo base (`#F8FAFC`).
     - Acentos cian y verde menta (`#2FD5C6`, `#10B981`, `#E0F7F4`).
     - Tipografia carbón oscuro (`#0F172A`).
     - Botones tipo capsula redondeados (`rounded-full bg-slate-900 text-white`).
  3. Desarrollo de las 5 Vistas Especializadas:
     - `/login`: Formulario de inicio de sesion con validacion y feedback.
     - `/dashboard`: KPIs en gran formato, graficos de series temporales, mapa de eventos, feed en tiempo real SSE y beacon pulsante "En Vivo".
     - `/reports`: Historial de reportes ejecutivos, tabla paginada con buscador y filtros, exportador CSV/PDF con retroalimentacion animada.
     - `/pipeline`: Estado de ejecucion de DAGs, frescura de datos y Centro de Notificaciones de incidentes.
     - `/admin`: Panel exclusivo para rol `admin` con controles de backfill y regeneracion de reportes. Si entra un `viewer`, se muestra pantalla de bloqueo 403.
  4. Componente Global del Chatbot IA (Drawer Deslizante):
     - Boton flotante en esquina inferior derecha.
     - Panel lateral off-canvas con animacion elastica Framer Motion inspirada en Jitter UI (`cubic-bezier(0.16, 1, 0.3, 1)`).
  5. Manejo riguroso de estados en cada vista:
     - Skeletons animados durante cargas.
     - Empty states ilustrativos.
     - Error boundaries con boton de reintento.
* Entregables de la Fase:
  - Codigo fuente completo de la aplicacion en `web/`.
  - Dockerfile de produccion de la plataforma web.
* Criterio de Exito:
  - Interfaz web accesible en `http://localhost:3000` con navegacion fluida y sin pantallas en blanco.

---

### FASE 8: SUITE DE PRUEBAS AUTOMATIZADAS Y ESCANEO DE SEGURIDAD
* Objetivo: Garantizar la calidad de software y cumplimiento de los requisitos de seguridad de la prueba.
* Tareas de la Fase:
  1. Suite de Pruebas Automatizadas con Pytest:
     - Prueba 1: Transformacion unitaria de un evento GeoJSON a estructura Silver Parquet.
     - Prueba 2: Integridad de importacion de todos los DAGs de Airflow.
     - Prueba 3: Reglas de calidad y consistencia ACID (filtrado de coordenadas imposibles en memoria sin caida ni cuarentena).
     - Prueba 4: Seguridad y autorizacion RBAC en endpoints de FastAPI (pruebas de codigos 401, 403 y 200).
  2. Auditoria de Seguridad Estatica y Dependencias:
     - Ejecucion de `bandit -r api/ airflow/` para deteccion de malas practicas de seguridad en codigo Python.
     - Ejecucion de `pip-audit -r requirements.txt` para revision de vulnerabilidades en librerias.
     - Documentacion de los resultados del escaneo en el archivo `docs/SEGURIDAD.md`.
* Entregables de la Fase:
  - Archivos de prueba en `tests/`.
  - Reporte de ejecucion de pytest con cobertura.
  - Reporte de evidencias de escaneo de seguridad.
* Criterio de Exito:
  - Todos los tests de pytest pasan exitosamente con `pytest -v`.

---

### FASE 9: VERIFICACION INTEGRAL END-TO-END Y EMPAQUETADO FINAL
* Objetivo: Comprobar el funcionamiento del ecosistema completo, elaborar la documentacion final para la sustentacion y generar el entregable.
* Tareas de la Fase:
  1. Prueba Integral End-to-End:
     - Levantamiento completo con `docker compose up -d`.
     - Verificacion del flujo continuo: Ingesta desde USGS -> Airflow -> MinIO Parquet -> PostgreSQL -> FastAPI -> Web SSE.
     - Verificacion de re-ejecucion de DAGs sin duplicar registros (idempotencia verificada).
     - Verificacion de apagado de Ollama: comprobar que el dashboard y las metricas sigan funcionando al 100%.
  2. Elaboracion del archivo `README.md` exhaustivo:
     - Guia paso a paso de puesta en marcha.
     - Arquitectura y justificacion tecnica para la sustentacion.
     - Respuestas tecnicas a las preguntas guia de la prueba.
     - Evidencias de escaneo de seguridad y ejecucion de pruebas.
  3. Empaquetado del proyecto:
     - Limpieza de archivos temporales (`__pycache__`, `.pytest_cache`).
     - Generacion del archivo comprimido del proyecto.
* Entregables de la Fase:
  - `README.md` definitivo del repositorio.
  - Proyecto validado y listo para sustentacion individual.
* Criterio de Exito:
  - Flujo de datos 100% automatico, seguro y verificable sin intervencion manual.
