import React, { useState } from 'react';
import { Shield, RefreshCw, Calendar, Zap, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';

interface AdminViewProps {
  userRole: string;
  apiUrl: string;
  token: string;
}

export const AdminView: React.FC<AdminViewProps> = ({ userRole, apiUrl, token }) => {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-10');
  const [minMag, setMinMag] = useState<number>(2.5);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // RESTRICCION ESTRICTA DE SEGURIDAD (RBAC)
  if (userRole !== 'admin') {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-4xl border border-red-100 dark:border-red-900/40 shadow-fintech space-y-4 max-w-lg mx-auto mt-12 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/40">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-fintech-dark dark:text-white">403 Acceso Denegado</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Esta vista y sus acciones administrativas están estrictamente reservadas para usuarios con rol de administrador.
        </p>
      </div>
    );
  }

  const handleTriggerBackfill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackfillLoading(true);
    setMsg(null);

    try {
      const response = await axios.post(
        `${apiUrl}/api/admin/backfill`,
        {
          start_date: startDate,
          end_date: endDate,
          min_magnitude: minMag
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMsg({ type: 'success', text: response.data.message });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Error al lanzar el backfill histórico.'
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleRegenerateReport = async () => {
    setReportLoading(true);
    setMsg(null);

    try {
      const response = await axios.post(
        `${apiUrl}/api/admin/reports/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMsg({ type: 'success', text: response.data.message });
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Error al solicitar la regeneración del reporte.'
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            Zona Restringida: Rol Administrador
          </span>
          <h1 className="text-3xl font-extrabold text-fintech-dark dark:text-white tracking-tight mt-2">
            Panel de Operaciones & Backfill
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Acciones operativas reservadas para reprocesamiento histórico y regeneración de modelos.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-3xl border flex items-center gap-3 text-sm font-semibold ${
          msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* MODULO 1: BACKFILL HISTORICO PARAMETRIZADO */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-fintech space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600 dark:text-[#2FD5C6] border border-teal-100 dark:border-teal-900/60">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-fintech-dark dark:text-white tracking-tight">Backfill Histórico</h2>
              <p className="text-xs text-slate-400 font-medium">Ingesta parametrizada de hasta 30 días con idempotencia</p>
            </div>
          </div>

          <form onSubmit={handleTriggerBackfill} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Fecha de Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Magnitud Mínima (Filtro USGS)</label>
              <input
                type="number"
                step="0.1"
                min="0.0"
                max="10.0"
                value={minMag}
                onChange={(e) => setMinMag(parseFloat(e.target.value))}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={backfillLoading}
              className="w-full py-3.5 px-6 rounded-full bg-fintech-dark dark:bg-slate-800 text-white font-extrabold text-sm hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 shadow-fintech disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {backfillLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-fintech-mint" />
                  <span>Encolando Backfill en Airflow...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-fintech-mint" />
                  <span>Lanzar Backfill Histórico</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* MODULO 2: REGENERACION FORZADA DE REPORTE IA */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-fintech space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-[#2FD5C6] border border-emerald-100 dark:border-emerald-900/60">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-fintech-dark dark:text-white tracking-tight">Regeneración de Reporte IA</h2>
                <p className="text-xs text-slate-400 font-medium">Forzar re-ejecución inmediata de Ollama sobre la capa Gold</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                Esta acción vuelve a compilar las estadísticas sismológicas del día actual en PostgreSQL, regenera el prompt contextualizado y solicita un nuevo resumen narrativo a Ollama (<strong className="text-fintech-dark dark:text-white">qwen2.5:3b</strong>).
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                Garantía de Resiliencia: Si el servicio local de Ollama se encuentra inactivo, el proceso aplicará automáticamente la plantilla determinista sin interrumpir la operación.
              </div>
            </div>
          </div>

          <button
            onClick={handleRegenerateReport}
            disabled={reportLoading}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-extrabold text-sm hover:opacity-90 shadow-fintech disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {reportLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Regenerando Reporte...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Regenerar Reporte Diario Ahora</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
