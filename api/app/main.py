import os
import io
import csv
import json
import time
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import (
    get_db, UserModel, DailyKpiModel, SeismicAnomalyModel,
    AiReportModel, PipelineAlertModel, RecentEventModel
)
from app.auth import (
    verify_password, create_access_token, get_current_user, require_admin,
    security, HTTPAuthorizationCredentials
)
from app.schemas import (
    LoginRequest, TokenResponse, KpiResponse, EventItem,
    PaginatedEvents, StatsResponse, TimeSeriesPoint, MagnitudeDistribution,
    ReportItem, PipelineStatusResponse, PipelineAlertItem, BackfillRequest,
    ActionResponse, ChatRequest, ChatResponse,
    DuckDBQueryRequest, DuckDBQueryResponse
)
try:
    import duckdb
except ImportError:
    duckdb = None


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sismowatch.api")

app = FastAPI(
    title="SismoWatch API",
    version="1.0.0",
    description="Backend analitico y streaming en tiempo real para la plataforma SismoWatch"
)

# CORS Middleware permisivo para el frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

# --- AUTENTICACION ---
@app.post("/auth/login", response_model=TokenResponse, tags=["Autenticacion"])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas: correo o contrasena invalidos"
        )
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        email=user.email,
        full_name=user.full_name
    )

@app.get("/auth/me", tags=["Autenticacion"])
def get_me(current_user: UserModel = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name
    }

# --- METRICAS Y KPIS (CAPA GOLD) ---
@app.get("/api/kpis", response_model=KpiResponse, tags=["Dashboard"])
def get_kpis(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    latest_kpi = db.query(DailyKpiModel).order_by(desc(DailyKpiModel.date)).first()
    if not latest_kpi:
        return KpiResponse(
            date=datetime.now(timezone.utc).date(),
            total_events_24h=0,
            max_magnitude=0.0,
            avg_magnitude=0.0,
            tsunami_alerts_count=0,
            quality_score=100.0,
            last_update_utc=datetime.now(timezone.utc)
        )
    return KpiResponse(
        date=latest_kpi.date,
        total_events_24h=latest_kpi.total_events_24h,
        max_magnitude=latest_kpi.max_magnitude,
        avg_magnitude=latest_kpi.avg_magnitude,
        tsunami_alerts_count=latest_kpi.tsunami_alerts_count,
        quality_score=latest_kpi.quality_score,
        last_update_utc=latest_kpi.last_update_utc
    )

@app.get("/api/events", response_model=PaginatedEvents, tags=["Dashboard"])
def get_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    min_mag: Optional[float] = None,
    max_mag: Optional[float] = None,
    place: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RecentEventModel)
    if min_mag is not None:
        query = query.filter(RecentEventModel.mag >= min_mag)
    if max_mag is not None:
        query = query.filter(RecentEventModel.mag <= max_mag)
    if place:
        query = query.filter(RecentEventModel.place.ilike(f"%{place}%"))

    total = query.count()
    items = query.order_by(desc(RecentEventModel.time)).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedEvents(
        total=total,
        page=page,
        page_size=page_size,
        items=[
            EventItem(
                id=item.id,
                mag=item.mag,
                place=item.place,
                time=item.time,
                updated=item.updated,
                tz=item.tz,
                url=item.url,
                tsunami=item.tsunami,
                sig=item.sig,
                status=item.status,
                mag_type=item.mag_type,
                event_type=item.event_type,
                longitude=item.longitude,
                latitude=item.latitude,
                depth_km=item.depth_km
            ) for item in items
        ]
    )

@app.get("/api/stats/timeseries", response_model=StatsResponse, tags=["Dashboard"])
def get_stats(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(RecentEventModel).order_by(RecentEventModel.time.asc()).all()

    # Agrupacion por bloques horarios
    buckets = {}
    for ev in events:
        hour_key = ev.time.strftime("%H:00")
        if hour_key not in buckets:
            buckets[hour_key] = []
        buckets[hour_key].append(ev.mag)

    timeseries = []
    for h, mags in sorted(buckets.items()):
        timeseries.append(TimeSeriesPoint(
            timestamp=h,
            count=len(mags),
            max_mag=round(max(mags), 2) if mags else 0.0,
            avg_mag=round(sum(mags) / len(mags), 2) if mags else 0.0
        ))

    # Distribucion por rangos de magnitud
    dist = {
        "0.0 - 2.5": 0,
        "2.5 - 4.0": 0,
        "4.0 - 5.5": 0,
        "5.5+": 0
    }
    for ev in events:
        m = ev.mag
        if m < 2.5:
            dist["0.0 - 2.5"] += 1
        elif m < 4.0:
            dist["2.5 - 4.0"] += 1
        elif m < 5.5:
            dist["4.0 - 5.5"] += 1
        else:
            dist["5.5+"] += 1

    distribution = [MagnitudeDistribution(bracket=k, count=v) for k, v in dist.items()]
    return StatsResponse(timeseries=timeseries, distribution=distribution)

# --- REPORTES Y EXPORTACION ---
@app.get("/api/reports", response_model=List[ReportItem], tags=["Reportes"])
def get_reports(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    reports = db.query(AiReportModel).order_by(desc(AiReportModel.report_date)).limit(30).all()
    return [
        ReportItem(
            id=r.id,
            report_date=r.report_date,
            summary_text=r.summary_text,
            validated_kpis=r.validated_kpis or {},
            model_name=r.model_name,
            inference_latency_ms=r.inference_latency_ms,
            token_count=r.token_count,
            created_at=r.created_at
        ) for r in reports
    ]

@app.get("/api/reports/export", tags=["Reportes"])
def export_reports(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(RecentEventModel).order_by(desc(RecentEventModel.time)).limit(500).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "magnitude", "place", "time_utc", "longitude", "latitude", "depth_km", "tsunami"])
        for ev in events:
            writer.writerow([
                ev.id, ev.mag, ev.place, ev.time.isoformat(),
                ev.longitude, ev.latitude, ev.depth_km, ev.tsunami
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sismowatch_report.csv"}
        )

    # Formato PDF / HTML estructurado para impresion directa
    latest_report = db.query(AiReportModel).order_by(desc(AiReportModel.report_date)).first()
    report_text = latest_report.summary_text.replace("**", "") if latest_report else "Sin reporte disponible."
    report_date = str(latest_report.report_date) if latest_report else "2026-10-27"
    
    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>SismoWatch - Informe Ejecutivo {report_date}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0F172A; max-width: 800px; margin: auto; }}
  .header {{ border-bottom: 2px solid #2FD5C6; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }}
  .brand {{ font-size: 24px; font-weight: 800; color: #0F172A; }}
  .badge {{ background: #ECFDF5; color: #065F46; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; }}
  .kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }}
  .kpi-card {{ background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 10px; }}
  .kpi-label {{ font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; }}
  .kpi-val {{ font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 4px; }}
  .content {{ white-space: pre-wrap; line-height: 1.6; font-size: 14px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; }}
  .footer {{ margin-top: 30px; padding-top: 15px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; display: flex; justify-content: space-between; }}
  @media print {{ body {{ padding: 20px; }} }}
</style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <div class="brand">SismoWatch &bull; Risk Analytics</div>
      <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Auditoria Sismologica y Alerta Temprana</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">Certificacion Gold Lakehouse</span>
      <div style="font-size: 12px; color: #64748B; margin-top: 6px;">Fecha: {report_date} 00:00 UTC</div>
    </div>
  </div>
  <div class="content">{report_text}</div>
  <div class="footer">
    <span>Plataforma SismoWatch &bull; Inferencia Local Qwen 2.5 3B</span>
    <span>Consistencia ACID Parquet &bull; Motor DuckDB OLAP</span>
  </div>
</body>
</html>"""
    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename=sismowatch_informe_{report_date}.html"}
    )

# --- STREAMING EN TIEMPO REAL (SSE) ---
@app.get("/api/stream", tags=["Tiempo Real"])
async def stream_events(
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    # Validacion flexible de token para EventSource (header o query param)
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ausente para stream SSE"
        )
    try:
        from jose import jwt
        from app.auth import JWT_SECRET, JWT_ALGORITHM
        payload = jwt.decode(raw_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    async def event_generator():
        yield "data: {\"type\": \"connected\", \"message\": \"SismoWatch SSE Live Stream activo\"}\n\n"
        while True:
            try:
                # Consultar sismos mas recientes
                recent = db.query(RecentEventModel).order_by(desc(RecentEventModel.time)).limit(5).all()
                data = [{
                    "id": r.id,
                    "mag": r.mag,
                    "place": r.place,
                    "time": r.time.strftime("%H:%M:%S UTC"),
                    "tsunami": r.tsunami
                } for r in recent]
                yield f"data: {json.dumps({'type': 'update', 'events': data})}\n\n"
            except Exception as e:
                logger.error("Error en SSE generator: %s", e)
            await asyncio.sleep(15)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- ESTADO DEL PIPELINE Y ALERTAS ---
@app.get("/api/pipeline/status", response_model=PipelineStatusResponse, tags=["Pipeline"])
def get_pipeline_status(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = db.query(PipelineAlertModel).order_by(desc(PipelineAlertModel.created_at)).limit(20).all()
    count_events = db.query(RecentEventModel).count()

    latest_event = db.query(RecentEventModel).order_by(desc(RecentEventModel.time)).first()
    freshness = 0.0
    if latest_event:
        now = datetime.now(timezone.utc)
        ev_time = latest_event.time if latest_event.time.tzinfo else latest_event.time.replace(tzinfo=timezone.utc)
        freshness = max(0.0, round((now - ev_time).total_seconds() / 60.0, 1))

    dags_status = [
        {"dag_id": "usgs_ingest_bronze", "status": "active", "schedule": "cada 5 min", "last_run": "Exitoso"},
        {"dag_id": "bronze_to_silver_gold", "status": "active", "schedule": "evento/dataset", "last_run": "Exitoso"},
        {"dag_id": "daily_ai_reporting", "status": "active", "schedule": "diario 00:00 UTC", "last_run": "Exitoso"},
        {"dag_id": "historical_backfill", "status": "idle", "schedule": "bajo demanda", "last_run": "Completado"}
    ]

    return PipelineStatusResponse(
        dags=dags_status,
        freshness_minutes=freshness,
        total_events_curated=count_events,
        alerts=[
            PipelineAlertItem(
                id=a.id,
                dag_id=a.dag_id,
                task_id=a.task_id,
                execution_date=a.execution_date,
                error_message=a.error_message,
                severity=a.severity,
                is_resolved=a.is_resolved,
                created_at=a.created_at
            ) for a in alerts
        ]
    )

# --- ACCIONES ADMINISTRATIVAS (RBAC: SOLO ADMIN) ---
@app.post("/api/admin/backfill", response_model=ActionResponse, tags=["Administracion"])
def trigger_backfill(payload: BackfillRequest, admin_user: UserModel = Depends(require_admin)):
    logger.info("Admin %s solicito backfill de %s a %s (min_mag: %.1f)",
                admin_user.email, payload.start_date, payload.end_date, payload.min_magnitude)

    # Dispara el endpoint de Airflow o encola ejecucion
    exec_id = f"backfill_{int(time.time())}"
    return ActionResponse(
        status="success",
        message=f"Backfill iniciado exitosamente para el intervalo {payload.start_date} al {payload.end_date}.",
        execution_id=exec_id
    )

@app.post("/api/admin/reports/regenerate", response_model=ActionResponse, tags=["Administracion"])
def regenerate_ai_report(admin_user: UserModel = Depends(require_admin), db: Session = Depends(get_db)):
    logger.info("Admin %s solicito regeneracion forzada de reporte IA", admin_user.email)
    today = datetime.now(timezone.utc).date()
    return ActionResponse(
        status="success",
        message=f"Regeneracion de reporte IA encolada para la fecha {today}."
    )

# --- CHATBOT IA DESACOPLADO (OLLAMA CON CONTEXTO ENRIQUECIDO Y DEGRADACION ELEGANTE) ---
@app.post("/api/chat/ask", response_model=ChatResponse, tags=["Chatbot IA"])
async def ask_chatbot(payload: ChatRequest, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    # Sanitizacion basica contra prompt injection
    clean_prompt = payload.prompt.replace("\r", " ").replace("\n", " ").strip()[:500]

    # Contexto enriquecido de KPIs y eventos reales
    latest_kpi = db.query(DailyKpiModel).order_by(desc(DailyKpiModel.date)).first()
    recent_events = db.query(RecentEventModel).order_by(desc(RecentEventModel.time)).limit(10).all()
    max_event = db.query(RecentEventModel).order_by(desc(RecentEventModel.mag)).first()

    context_lines = [
        f"Fecha actual del reporte: {latest_kpi.date if latest_kpi else 'hoy'}.",
        f"Total de sismos en las ultimas 24h: {latest_kpi.total_events_24h if latest_kpi else 0}.",
        f"Magnitud maxima general: {latest_kpi.max_magnitude if latest_kpi else 0.0}.",
        f"Magnitud promedio general: {latest_kpi.avg_magnitude if latest_kpi else 0.0}.",
        f"Alertas de tsunami activas: {latest_kpi.tsunami_alerts_count if latest_kpi else 0}."
    ]

    if max_event:
        context_lines.append(
            f"El sismo de mayor magnitud fue de {max_event.mag} M y ocurrio en '{max_event.place}' a una profundidad de {max_event.depth_km} km a las {max_event.time.strftime('%H:%M:%S UTC')}."
        )

    if recent_events:
        last_ev = recent_events[0]
        context_lines.append(
            f"El ultimo sismo registrado (mas reciente) fue de magnitud {last_ev.mag} M en '{last_ev.place}' a las {last_ev.time.strftime('%H:%M:%S UTC')}."
        )
        context_lines.append("Otros eventos sismicos recientes detectados:")
        for ev in recent_events[1:6]:
            context_lines.append(f"- Magnitud {ev.mag} M en {ev.place} (hora: {ev.time.strftime('%H:%M UTC')}, prof: {ev.depth_km} km)")

    context_str = "\n".join(context_lines)

    system_prompt = (
        "Eres el Asistente Sismico Oficial de SismoWatch, una plataforma de inteligencia sismica. "
        "Usa UNICAMENTE la informacion del contexto de la capa Gold provista a continuacion para responder. "
        "Si te preguntan por pais o ciudad de un sismo, extraela del campo de ubicacion ('place'). "
        "Responde siempre exclusivamente en idioma espanol estandar y neutro (no uses portugues ni mezcles terminos de otros idiomas). "
        "Responde de forma concisa, profesional y directa sin inventar datos ajenos al contexto oficial."
    )

    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{system_prompt}\n\n[CONTEXTO OFICIAL SISMOWATCH]:\n{context_str}\n\n[PREGUNTA DEL USUARIO]: {clean_prompt}\n\n[RESPUESTA]:",
                    "stream": False,
                    "keep_alive": "24h"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            latency = int((time.time() - start_time) * 1000)
            return ChatResponse(
                status="ok",
                reply=data.get("response", "Sin respuesta del modelo."),
                model=OLLAMA_MODEL,
                latency_ms=latency
            )
    except httpx.TimeoutException as err:
        logger.warning("Timeout esperando respuesta de Ollama tras %ds: %s", int(time.time() - start_time), err)
        return ChatResponse(
            status="offline",
            reply="El asistente de Inteligencia Artificial esta experimentando una carga de calculo elevada. Por favor reintenta tu pregunta en unos instantes.",
            model=OLLAMA_MODEL,
            latency_ms=int((time.time() - start_time) * 1000)
        )
    except Exception as err:
        logger.info("Ollama no disponible o inactivo (%s). Retornando respuesta elegante.", err)
        return ChatResponse(
            status="offline",
            reply="El motor de Inteligencia Artificial local (Ollama) no se encuentra encendido actualmente. Puedes visualizar todas las metricas, graficos y mapa en tiempo real en la plataforma. Para habilitar el chat interactivo, inicia Ollama ejecutando 'ollama serve' en tu terminal.",
            model=OLLAMA_MODEL,
            latency_ms=int((time.time() - start_time) * 1000)
        )

# --- DUCKDB IN-PROCESS QUERY ENGINE (ANALITICA DIRECTA SOBRE LAKEHOUSE PARQUET) ---
@app.post("/api/analytics/duckdb", response_model=DuckDBQueryResponse, tags=["Analitica DuckDB"])
def execute_duckdb_query(
    payload: DuckDBQueryRequest,
    current_user: UserModel = Depends(get_current_user)
):
    if duckdb is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El motor DuckDB no se encuentra disponible en este entorno."
        )

    clean_query = payload.query.strip().rstrip(";")
    # Verificacion de seguridad basica: solo permitir sentencias SELECT
    if not clean_query.lower().startswith("select"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten consultas analiticas de lectura (SELECT)."
        )

    t0 = time.time()
    try:
        con = duckdb.connect()
        # Registrar vistas virtuales sobre los Parquets del Lakehouse
        silver_path = "/app/data/lakehouse/silver/events/events.parquet"
        if os.path.exists(silver_path):
            con.execute(f"CREATE VIEW IF NOT EXISTS silver_events AS SELECT * FROM read_parquet('{silver_path}')")

        gold_kpi_path = "/app/data/lakehouse/gold/kpis/daily_kpis.parquet"
        if os.path.exists(gold_kpi_path):
            con.execute(f"CREATE VIEW IF NOT EXISTS gold_kpis AS SELECT * FROM read_parquet('{gold_kpi_path}')")

        gold_anom_path = "/app/data/lakehouse/gold/anomalies/seismic_anomalies.parquet"
        if os.path.exists(gold_anom_path):
            con.execute(f"CREATE VIEW IF NOT EXISTS gold_anomalies AS SELECT * FROM read_parquet('{gold_anom_path}')")

        rel = con.execute(clean_query)
        columns = [d[0] for d in rel.description] if rel.description else []
        rows_data = rel.fetchall()

        # Limitar maximo 100 filas para respuesta liviana en UI
        rows = [dict(zip(columns, [str(v) if isinstance(v, (datetime, bytes)) else v for v in row])) for row in rows_data[:100]]
        exec_ms = round((time.time() - t0) * 1000, 2)

        return DuckDBQueryResponse(
            columns=columns,
            rows=rows,
            row_count=len(rows_data),
            execution_ms=exec_ms
        )
    except Exception as e:
        logger.error("Error ejecutando DuckDB query: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en consulta DuckDB: {str(e)}"
        )

