export interface User {
  email: string;
  role: 'viewer' | 'admin';
  full_name?: string;
}

export interface KpiData {
  date: string;
  total_events_24h: number;
  max_magnitude: number;
  avg_magnitude: number;
  tsunami_alerts_count: number;
  quality_score: number;
  last_update_utc?: string;
}

export interface SeismicEvent {
  id: string;
  mag: number;
  place: string;
  time: string;
  updated: string;
  longitude: number;
  latitude: number;
  depth_km: number;
  tsunami: boolean;
  sig?: number;
  status?: string;
  mag_type?: string;
  url?: string;
}

export interface AiReport {
  id: number;
  report_date: string;
  summary_text: string;
  validated_kpis: {
    total_events: number;
    max_mag: number;
    avg_mag: number;
    tsunamis: number;
  };
  model_name: string;
  inference_latency_ms: number;
  created_at?: string;
}

export interface PipelineAlert {
  id: number;
  dag_id: string;
  task_id: string;
  execution_date: string;
  error_message: string;
  severity: string;
  is_resolved: boolean;
  created_at: string;
}

export interface PipelineStatus {
  dags: Array<{
    dag_id: string;
    status: string;
    schedule: string;
    last_run: string;
  }>;
  freshness_minutes: number;
  total_events_curated: number;
  alerts: PipelineAlert[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  count: number;
  max_mag: number;
  avg_mag: number;
}

export interface MagnitudeDistribution {
  bracket: string;
  count: number;
}

export interface StatsResponse {
  timeseries: TimeSeriesPoint[];
  distribution: MagnitudeDistribution[];
}

export interface DuckDBQueryResponse {
  columns: string[];
  rows: Array<Record<string, any>>;
  row_count: number;
  execution_ms: number;
}

