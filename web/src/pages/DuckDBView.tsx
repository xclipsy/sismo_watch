import React, { useState } from 'react';
import axios from 'axios';
import { Database, Play, Terminal, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';
import { DuckDBQueryResponse } from '../types';

interface DuckDBViewProps {
  apiUrl: string;
  token: string;
}

export const DuckDBView: React.FC<DuckDBViewProps> = ({ apiUrl, token }) => {
  const defaultQuery = `SELECT 
    mag,
    place,
    depth_km,
    tsunami,
    strftime(time, '%Y-%m-%d %H:%M') as event_time
FROM silver_events
ORDER BY mag DESC
LIMIT 10`;

  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DuckDBQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predefinedQueries = [
    {
      title: 'Top 10 Sismos de Mayor Magnitud',
      query: `SELECT mag, place, depth_km, tsunami FROM silver_events ORDER BY mag DESC LIMIT 10`
    },
    {
      title: 'Conteo y Promedios por Categoría de Magnitud',
      query: `SELECT 
  CASE 
    WHEN mag < 2.5 THEN 'Menor (< 2.5)'
    WHEN mag < 4.5 THEN 'Moderado (2.5 - 4.5)'
    ELSE 'Fuerte / Crítico (>= 4.5)'
  END as categoria,
  count(*) as total_sismos,
  round(avg(mag), 2) as mag_promedio,
  round(avg(depth_km), 1) as prof_promedio_km
FROM silver_events
GROUP BY 1
ORDER BY mag_promedio DESC`
    },
    {
      title: 'Métricas Agregadas de Capa Gold',
      query: `SELECT metric_date, total_events_24h, max_magnitude, avg_magnitude, tsunami_alerts_count, quality_score FROM gold_kpis ORDER BY metric_date DESC LIMIT 5`
    },
    {
      title: 'Detección de Anomalías Sísmicas (Z-Score)',
      query: `SELECT mag, place, depth_km, round(z_score, 2) as z_score, alert_level FROM gold_anomalies ORDER BY z_score DESC LIMIT 10`
    }
  ];

  const handleRunQuery = async (queryToRun?: string) => {
    const sql = queryToRun || query;
    if (!sql.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${apiUrl}/api/analytics/duckdb`,
        { query: sql },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error ejecutando la consulta en DuckDB.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      {/* HEADER DE LA VISTA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-[#2FD5C6] bg-teal-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-500/30">
              Motor OLAP In-Process
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Cero Sobrecarga JVM
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-fintech-dark dark:text-white tracking-tight mt-2">
            Explorador Analítico DuckDB
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Consultas SQL directas sobre los archivos Parquet del Lakehouse (Silver y Gold) con latencia de 20 ms.
          </p>
        </div>

        {/* BADGES TECNICOS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-xs font-bold shadow-xs">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Vistas Parquet: silver_events, gold_kpis, gold_anomalies</span>
          </div>
        </div>
      </div>

      {/* TARJETAS DE CONSULTA RAPIDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {predefinedQueries.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(pq.query);
              handleRunQuery(pq.query);
            }}
            className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-[#2FD5C6] shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-[#2FD5C6]">
              <span>{pq.title}</span>
              <Play className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-1.5">
              {pq.query.split('\n')[0]}
            </p>
          </button>
        ))}
      </div>

      {/* CONSOLA SQL */}
      <div className="bg-slate-900 rounded-3xl p-5 shadow-fintech border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span className="font-mono font-bold text-slate-200">Consola SQL DuckDB (Read-Only)</span>
          </div>
          <span className="text-[11px] font-mono text-teal-300">
            Formato: Parquet Nativo Snappy
          </span>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={5}
          className="w-full bg-slate-950 text-teal-300 font-mono text-xs sm:text-sm p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all resize-y"
          placeholder="Escribe tu consulta SQL sobre silver_events, gold_kpis o gold_anomalies..."
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-400 font-medium">
            Selecciona una tarjeta rápida superior o ejecuta consultas SQL analíticas sobre los archivos Parquet.
          </div>

          <button
            onClick={() => handleRunQuery()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-slate-950" />
            )}
            <span>{loading ? 'Consultando...' : 'Ejecutar SQL'}</span>
          </button>
        </div>
      </div>

      {/* ERROR O RESULTADOS */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold animate-fadeIn">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-fintech space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {result.row_count} registros encontrados
              </span>
              <span className="text-slate-400">
                (mostrando {result.rows.length})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-[#2FD5C6]" />
              <span>Tiempo de ejecución DuckDB: <strong className="text-slate-800 dark:text-slate-200">{result.execution_ms} ms</strong></span>
            </div>
          </div>

          {result.rows.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              La consulta no devolvió filas.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {result.columns.map((col, idx) => (
                      <th key={idx} className="p-3 font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-teal-50/40 dark:hover:bg-slate-800/50 transition-colors">
                      {result.columns.map((col, cIdx) => (
                        <td key={cIdx} className="p-3 font-medium text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
