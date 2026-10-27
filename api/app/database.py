import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Date, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sismo_admin:SismoSecretPassword2026_Secure@postgres:5432/sismowatch_db")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="viewer")
    full_name = Column(String(128))
    created_at = Column(DateTime(timezone=True))

class DailyKpiModel(Base):
    __tablename__ = "gold_daily_kpis"
    date = Column(Date, primary_key=True)
    total_events_24h = Column(Integer, nullable=False, default=0)
    max_magnitude = Column(Float, nullable=False, default=0.0)
    avg_magnitude = Column(Float, nullable=False, default=0.0)
    tsunami_alerts_count = Column(Integer, nullable=False, default=0)
    quality_score = Column(Float, nullable=False, default=100.0)
    last_update_utc = Column(DateTime(timezone=True))

class SeismicAnomalyModel(Base):
    __tablename__ = "gold_seismic_anomalies"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), nullable=False)
    detection_method = Column(String(64), nullable=False)
    score = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime(timezone=True))

class AiReportModel(Base):
    __tablename__ = "gold_ai_reports"
    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(Date, unique=True, nullable=False)
    summary_text = Column(Text, nullable=False)
    validated_kpis = Column(JSONB, nullable=False)
    model_name = Column(String(64), nullable=False)
    inference_latency_ms = Column(Integer, default=0)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))

class PipelineAlertModel(Base):
    __tablename__ = "pipeline_alerts"
    id = Column(Integer, primary_key=True, index=True)
    dag_id = Column(String(128), nullable=False)
    task_id = Column(String(128), nullable=False)
    execution_date = Column(DateTime(timezone=True), nullable=False)
    error_message = Column(Text, nullable=False)
    severity = Column(String(32), default="ERROR")
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True))

class RecentEventModel(Base):
    __tablename__ = "gold_recent_events"
    id = Column(String(64), primary_key=True, index=True)
    mag = Column(Float, nullable=False)
    place = Column(String(255), nullable=False)
    time = Column(DateTime(timezone=True), nullable=False, index=True)
    updated = Column(DateTime(timezone=True), nullable=False)
    tz = Column(Integer)
    url = Column(String(512))
    tsunami = Column(Boolean, default=False)
    sig = Column(Integer, default=0)
    status = Column(String(32))
    mag_type = Column(String(16))
    event_type = Column(String(32))
    longitude = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    depth_km = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
