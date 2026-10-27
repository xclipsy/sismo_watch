from datetime import date, datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: Optional[str] = None

class KpiResponse(BaseModel):
    date: date
    total_events_24h: int
    max_magnitude: float
    avg_magnitude: float
    tsunami_alerts_count: int
    quality_score: float
    last_update_utc: Optional[datetime] = None

class EventItem(BaseModel):
    id: str
    mag: float
    place: str
    time: datetime
    updated: datetime
    tz: Optional[int] = None
    url: Optional[str] = None
    tsunami: bool = False
    sig: Optional[int] = 0
    status: Optional[str] = None
    mag_type: Optional[str] = None
    event_type: Optional[str] = None
    longitude: float
    latitude: float
    depth_km: float

class PaginatedEvents(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[EventItem]

class TimeSeriesPoint(BaseModel):
    timestamp: str
    count: int
    max_mag: float
    avg_mag: float

class MagnitudeDistribution(BaseModel):
    bracket: str
    count: int

class StatsResponse(BaseModel):
    timeseries: List[TimeSeriesPoint]
    distribution: List[MagnitudeDistribution]

class ReportItem(BaseModel):
    id: int
    report_date: date
    summary_text: str
    validated_kpis: Dict[str, Any]
    model_name: str
    inference_latency_ms: int
    token_count: Optional[int] = 0
    created_at: Optional[datetime] = None

class PipelineAlertItem(BaseModel):
    id: int
    dag_id: str
    task_id: str
    execution_date: datetime
    error_message: str
    severity: str
    is_resolved: bool
    created_at: datetime

class PipelineStatusResponse(BaseModel):
    dags: List[Dict[str, Any]]
    freshness_minutes: float
    total_events_curated: int
    alerts: List[PipelineAlertItem]

class BackfillRequest(BaseModel):
    start_date: str = Field(..., description="Formato YYYY-MM-DD")
    end_date: str = Field(..., description="Formato YYYY-MM-DD")
    min_magnitude: float = Field(2.5, ge=0.0, le=10.0)

class ActionResponse(BaseModel):
    status: str
    message: str
    execution_id: Optional[str] = None

class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    status: str
    reply: str
    model: str = "qwen2.5:3b"
    latency_ms: Optional[int] = None

class DuckDBQueryRequest(BaseModel):
    query: str

class DuckDBQueryResponse(BaseModel):
    columns: List[str]
    rows: List[dict]
    row_count: int
    execution_ms: float

