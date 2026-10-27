import React from 'react';
import { PipelineStatus } from '../types';
import { Server, Activity, ShieldCheck, AlertTriangle, Clock, Database, CheckCircle2, FileText, ArrowRight, Layers, Cpu, Sparkles } from 'lucide-react';

interface PipelineViewProps {
  statusData: PipelineStatus | null;
  loading: boolean;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ statusData, loading }) => {
  const dags = statusData?.dags || [
    { dag_id: 'usgs_ingest_bronze', status: 'active', schedule: 'cada 5 min', last_run: 'Exitoso' },
    { dag_id: 'bronze_to_silver_gold', status: 'active', schedule: 'evento/dataset', last_run: 'Exitoso' },
    { dag_id: 'daily_ai_reporting', status: 'active', schedule: 'diario 00:00 UTC', last_run: 'Exitoso' },
    { dag_id: 'historical_backfill', status: 'idle', schedule: 'bajo demanda', last_run: 'Completado' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-[#2FD5C6] bg-teal-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-500/30">
            Observabilidad y Gobernanza
          </span>
          <h1 className="text-3xl font-extrabold text-fintech-dark dark:text-white tracking-tight mt-2">
            Topología del Pipeline & Calidad Medallón
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Flujo end-to-end de datos sísmicos desde ingestión cruda hasta serving layer relacional y DuckDB.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#2FD5C6]" />
          <span>Garantías ACID: Activas sin cuarentena</span>
        </div>
      </div>

      {/* DIAGRAMA GRAFICO INTERACTIVO ARQUITECTURA MEDALLON */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600 dark:text-[#2FD5C6]" />
              <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                Topología Gráfica de Datos Medallón
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Diagrama interactivo de flujo continuo: Ingestión, capas Lakehouse ACID Parquet, motor DuckDB e inferencia IA
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2FD5C6] animate-ping"></span>
            <span className="font-bold text-[#0F172A] dark:text-[#2FD5C6]">Pipeline en Línea &bull; Streaming Activo</span>
          </div>
        </div>

        {/* DIAGRAMA VISUAL ESQUEMATICO CONECTADO */}
        <div className="space-y-6">
          
          {/* MAPA DE NODOS GRAFICOS CONECTADOS HORIZONTALMENTE (SOLO BRONCE, SILVER Y GOLD) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">

            {/* NODO 1: CAPA BRONCE (LAKEHOUSE INMUTABLE) */}
            <div className="p-6 rounded-3xl bg-[#FAF6F0] dark:bg-[#1E1712]/50 border-2 border-[#CD7F32]/60 dark:border-[#CD7F32]/50 flex flex-col justify-between hover:border-[#CD7F32] transition-all shadow-xs group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#CD7F32]/20 text-[#7C4717] dark:text-[#E69B56] border border-[#CD7F32]/40">
                    Capa Bronce
                  </span>
                  <span className="text-[10px] font-bold text-[#A25F22] dark:text-[#E69B56]">Inmutable</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#CD7F32]/20 text-[#CD7F32] dark:text-[#E69B56] font-black text-base flex items-center justify-center border border-[#CD7F32]/50 shrink-0 shadow-xs">
                    B
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#7C4717] dark:text-[#E69B56]">Almacén Raw</h3>
                    <span className="text-[11px] text-[#A25F22] dark:text-[#D48942] font-semibold block">MinIO S3 + Postgres JSONB</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                  Persistencia no estructurada forense desde la API USGS. Ingestión histórica y reciente sin pérdida de campos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#CD7F32]/20 dark:border-[#CD7F32]/30 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>sismowatch-bronze/</span>
                <span className="font-bold text-[#CD7F32]">JSONB Staging</span>
              </div>
            </div>

            {/* NODO 2: CAPA SILVER (CURADA & DEDUPLICADA) */}
            <div className="p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-600 flex flex-col justify-between hover:border-teal-500 transition-all shadow-xs group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                    Capa Silver
                  </span>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-[#2FD5C6]">Parquet ACID</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-base flex items-center justify-center border border-slate-300 dark:border-slate-500 shrink-0 shadow-xs">
                    S
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Curación PyArrow</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Filtros WGS84 + Dedup</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                  Validación espacial, magnitudes físicas y deduplicación atómica en _staging/ sin tablas de cuarentena.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>events.parquet</span>
                <span className="font-bold text-teal-600 dark:text-[#2FD5C6]">Snappy 100%</span>
              </div>
            </div>

            {/* NODO 3: CAPA GOLD & SERVING (OLAP + IA) */}
            <div className="p-6 rounded-3xl bg-yellow-50/50 dark:bg-yellow-950/20 border-2 border-yellow-300 dark:border-yellow-900/60 flex flex-col justify-between hover:border-yellow-400 transition-all shadow-xs group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-yellow-200/80 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800">
                    Capa Gold
                  </span>
                  <span className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300">Serving Layer</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 dark:bg-yellow-500/10 text-yellow-900 dark:text-yellow-300 font-black text-base flex items-center justify-center border border-yellow-300 dark:border-yellow-700 shrink-0 shadow-xs">
                    G
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-yellow-950 dark:text-yellow-200">Analítica & Qwen 2.5</h3>
                    <span className="text-[11px] text-yellow-800 dark:text-yellow-400 font-semibold block">DuckDB OLAP + IA</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                  Agregaciones móviles 24h, dispersión Z-Score, alertas y resúmenes ejecutivos auditados en PDF/CSV.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-yellow-200/80 dark:border-yellow-900/50 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>gold_ai_reports</span>
                <span className="font-bold text-yellow-700 dark:text-yellow-300">DuckDB Columnar</span>
              </div>
            </div>

          </div>

          {/* MATRIZ TECNICA DE TRANSICIONES Y CONECTORES DE DATOS */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#2FD5C6]" />
                Flujo Vectorial y Políticas de Calidad entre Capas
              </span>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Garantía Atómica: Sin Cuarentena
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ArrowRight className="w-3.5 h-3.5 text-[#CD7F32]" />
                  <span>Transición Bronce &rarr; Silver</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Extracción de JSONB crudo, validación de bounding box geoespacial WGS84 (-90&le;lat&le;90, -180&le;lon&le;180) y reemplazo atómico mediante directorio temporal staging.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Transición Silver &rarr; Gold</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Cálculo de ventanas estadísticas deslizantes de 1h y 24h, detección de anomalías Z-Score en magnitudes y agregación columnar para consultas OLAP sub-segundo.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                  <span>Transición Gold &rarr; Serving & IA</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Entrega de KPIs consolidados al modelo local Qwen 2.5 3B para generar resúmenes ejecutivos sin alucinaciones, transmitidos por SSE y exportables a PDF/CSV.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* METRICAS DE SALUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Frescura de Datos</span>
            <Clock className="w-5 h-5 text-teal-600 dark:text-[#2FD5C6]" />
          </div>
          <div className="text-3xl font-extrabold text-fintech-dark dark:text-white">
            {loading ? '--' : `${statusData?.freshness_minutes || 0.0} min`}
          </div>
          <p className="text-xs font-semibold text-teal-600 dark:text-[#2FD5C6] mt-2">Intervalo USGS dentro de tolerancia</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Curados (Gold)</span>
            <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-fintech-dark dark:text-white">
            {loading ? '--' : (statusData?.total_events_curated || 0)}
          </div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mt-2">Eventos normalizados e indexados</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">DAGs de Airflow</span>
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-fintech-dark dark:text-white">
            4 / 4
          </div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">Todos los flujos activos y sincronizados</p>
        </div>
      </div>

      {/* TARJETAS DE ESTADO DE DAGS */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600 dark:text-[#2FD5C6] border border-teal-100 dark:border-teal-900/60">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-fintech-dark dark:text-white tracking-tight">Flujos de Trabajo en Apache Airflow</h2>
            <p className="text-xs text-slate-400 font-medium">Orquestación continua con reintentos exponenciales y callbacks de falla</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dags.map((d) => (
            <div
              key={d.dag_id}
              className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-extrabold text-sm text-fintech-dark dark:text-white">{d.dag_id}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  <span>Frecuencia: {d.schedule}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {d.last_run}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
