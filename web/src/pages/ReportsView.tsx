import React, { useState } from 'react';
import { AiReport, SeismicEvent } from '../types';
import { FileText, Download, Sparkles, Search, ArrowUpDown, ChevronLeft, ChevronRight, ShieldCheck, Calendar, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import axios from 'axios';

interface ReportsViewProps {
  reports: AiReport[];
  events: SeismicEvent[];
  apiUrl: string;
  token: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ reports, events, apiUrl, token }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedReportId, setExpandedReportId] = useState<number | null>(reports.length > 0 ? reports[0].id : null);
  const pageSize = 10;

  const handleExportCsv = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/reports/export?format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sismowatch_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#2FD5C6', '#10B981', '#0F172A']
      });
    } catch (err) {
      console.error('Error al exportar CSV:', err);
    }
  };

  const handleExportPdf = (targetReport?: AiReport) => {
    const reportToPrint = targetReport || reports[0];
    if (!reportToPrint) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cleanText = reportToPrint.summary_text.replace(/\*\*/g, '');
    const kpis = (reportToPrint.validated_kpis || {}) as Record<string, any>;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>SismoWatch - Informe Ejecutivo ${reportToPrint.report_date}</title>
        <style>
          @page { margin: 20mm; size: A4; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; line-height: 1.6; }
          .header { border-bottom: 2px solid #2FD5C6; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 22px; font-weight: 800; color: #0F172A; }
          .subtitle { font-size: 12px; color: #64748B; margin-top: 4px; }
          .badge { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta { font-size: 12px; color: #64748B; margin-top: 6px; }
          .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 12px; }
          .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px; }
          .kpi-val { font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 4px; }
          .content-box { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 24px; border-radius: 12px; white-space: pre-wrap; font-size: 13px; color: #1E293B; line-height: 1.7; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SismoWatch &bull; Risk Analytics</div>
            <div class="subtitle">Monitoreo Sismológico Global &bull; Auditoría de Riesgo</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">Validación Gold Lakehouse</span>
            <div class="meta">Fecha de Emisión: ${reportToPrint.report_date} 00:00 UTC</div>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi-card">
            <div class="kpi-label">Eventos Registrados</div>
            <div class="kpi-val">${kpis.total_events || 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Magnitud Máxima</div>
            <div class="kpi-val">${kpis.max_mag || 0.0} M</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Magnitud Promedio</div>
            <div class="kpi-val">${kpis.avg_mag || 0.0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Alertas Tsunami</div>
            <div class="kpi-val">${kpis.tsunamis || 0}</div>
          </div>
        </div>

        <div class="content-box">${cleanText}</div>

        <div class="footer">
          <span>Inferencia Local: ${reportToPrint.model_name} (Latencia: ${reportToPrint.inference_latency_ms} ms)</span>
          <span>Certificación Idempotente &bull; Parquet ACID &bull; DuckDB Engine</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#2FD5C6', '#10B981', '#0F172A']
    });
  };

  const renderFormattedReport = (rawText: string) => {
    const lines = rawText.split('\n');
    return (
      <div className="space-y-2 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Titulo de encabezado inicial
          if (trimmed.startsWith('Informe Ejecutivo') || trimmed.startsWith('Fecha:')) {
            return (
              <p key={idx} className="font-extrabold text-slate-900 dark:text-white">
                {trimmed.replace(/\*\*/g, '')}
              </p>
            );
          }

          // Secciones numeradas o principales ("1. **Número de Sismos**:" o "**Evaluación Tecnológica**:")
          const isNumberedSection = /^\d+\.\s*\*\*(.*?)\*\*:?/.test(trimmed);
          const isNamedSection = /^\*\*(.*?)\*\*:?/.test(trimmed);

          if (isNumberedSection || isNamedSection) {
            const cleanHeader = trimmed.replace(/\*\*/g, '');
            return (
              <div key={idx} className="pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-sm text-teal-700 dark:text-[#2FD5C6] uppercase tracking-wide">
                  {cleanHeader}
                </span>
              </div>
            );
          }

          // Sub-items con viñetas ("- **Detección**: ..." o "   - Total de sismos...")
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const itemContent = trimmed.replace(/^[-*]\s*/, '');
            const boldMatch = itemContent.match(/^\*\*(.*?)\*\*(.*)/);
            if (boldMatch) {
              return (
                <div key={idx} className="flex items-start gap-2.5 pl-3 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0"></span>
                  <div className="text-slate-700 dark:text-slate-300">
                    <strong className="font-bold text-slate-900 dark:text-white">{boldMatch[1]}</strong>
                    <span>{boldMatch[2].replace(/\*\*/g, '')}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-3 py-0.5 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                <span>{itemContent.replace(/\*\*/g, '')}</span>
              </div>
            );
          }

          // Parrafo ordinario
          return (
            <p key={idx} className="text-slate-700 dark:text-slate-300">
              {trimmed.replace(/\*\*/g, '')}
            </p>
          );
        })}
      </div>
    );
  };

  const filteredEvents = events.filter(e =>
    e.place.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => sortAsc ? a.mag - b.mag : b.mag - a.mag);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      
      {/* CABECERA DE REPORTES */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-[#2FD5C6] bg-teal-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-500/30">
            Inteligencia y Archivo
          </span>
          <h1 className="text-3xl font-extrabold text-fintech-dark dark:text-white tracking-tight mt-2">
            Informes Ejecutivos & Exportación
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Resúmenes estructurados en formato ejecutivo estilo documento formal, listos para auditoría y exportación.
          </p>
        </div>

        {/* BOTONES DE EXPORTACION */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-fintech-dark dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-teal-600 dark:text-[#2FD5C6]" />
            <span>Descargar CSV</span>
          </button>
          <button
            onClick={() => handleExportPdf()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-fintech-dark dark:bg-slate-800 text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 shadow-fintech transition-all"
          >
            <Download className="w-4 h-4 text-[#2FD5C6]" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* SECCION 1: HISTORIAL DE REPORTES IA CON ESTRUCTURA EJECUTIVA TIPO DOCUMENTO */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600 dark:text-[#2FD5C6] border border-teal-100 dark:border-teal-900/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-fintech-dark dark:text-white tracking-tight">Reportes Diarios de IA</h2>
              <p className="text-xs text-slate-400 font-medium">Documentos ejecutivos auditados y consolidados por el modelo local (Qwen 2.5 3B)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            {reports.length} reportes archivados
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
            No se registran reportes diarios generados todavía. Se generarán automáticamente a medianoche o mediante regeneración de administrador.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((rep) => {
              const isExpanded = expandedReportId === rep.id;
              return (
                <div
                  key={rep.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-teal-300 dark:hover:border-teal-500/50 transition-all overflow-hidden"
                >
                  {/* BARRA SUPERIOR COLAPSABLE */}
                  <div
                    onClick={() => setExpandedReportId(isExpanded ? null : rep.id)}
                    className="p-5 flex items-center justify-between cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-[#2FD5C6] flex items-center justify-center font-bold text-xs border border-teal-100 dark:border-teal-900/50">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-fintech-dark dark:text-white">
                            Informe de Situación Sísmica ({rep.report_date})
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Validado Gold
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Modelo: <span className="font-mono text-slate-600 dark:text-slate-300">{rep.model_name}</span> | Latencia: {rep.inference_latency_ms} ms
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {rep.validated_kpis && (
                        <div className="hidden sm:flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700">
                            {rep.validated_kpis.total_events || 0} sismos
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900/60">
                            M máx {rep.validated_kpis.max_mag || 0.0}
                          </span>
                        </div>
                      )}
                      <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* CUERPO DEL INFORME (ESTILO DOCUMENTO EJECUTIVO FORMAL) */}
                  {isExpanded && (
                    <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-fadeIn">
                      
                      {/* HOJA DE ESTILO DOCUMENTAL (MEMBRETE EJECUTIVO) */}
                      <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 bg-slate-50/40 dark:bg-slate-800/40 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 uppercase tracking-widest font-black text-[10px] block">ORGANIZACIÓN</span>
                            <strong className="text-fintech-dark dark:text-white text-sm">SismoWatch Monitoring System &bull; Risk Analytics</strong>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-slate-400 uppercase tracking-widest font-black text-[10px] block">FECHA DE EMISIÓN</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{rep.report_date} 00:00 UTC</span>
                          </div>
                        </div>

                        {/* TABLA DE METRICAS AUDITADAS */}
                        {rep.validated_kpis && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Eventos 24h</span>
                              <span className="text-lg font-black text-slate-900 dark:text-white">{rep.validated_kpis.total_events || 0}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Magnitud Máxima</span>
                              <span className="text-lg font-black text-amber-600 dark:text-amber-400">{rep.validated_kpis.max_mag || 0.0} M</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Magnitud Media</span>
                              <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{rep.validated_kpis.avg_mag || 0.0}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Alertas Tsunami</span>
                              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{rep.validated_kpis.tsunamis || 0}</span>
                            </div>
                          </div>
                        )}

                        {/* CUERPO DEL TEXTO SINTETIZADO FORMATEADO SIN ASTERISCOS MARKDOWN */}
                        <div className="pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Síntesis Analítica y Evaluación de Riesgo
                            </h5>
                            <button
                              onClick={() => handleExportPdf(rep)}
                              className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-[#2FD5C6] hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Imprimir / PDF</span>
                            </button>
                          </div>
                          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {renderFormattedReport(rep.summary_text)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span>Certificación de Idempotencia: Capa Gold Lakehouse</span>
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">&check; Auditoría Matemática OK</span>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCION 2: TABLA DE EVENTOS */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-fintech-dark dark:text-white tracking-tight">Catálogo de Eventos Sísmicos Curados</h2>
            <p className="text-xs text-slate-400 font-medium">Registros normalizados y tipados en Silver Parquet</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por región o lugar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:border-teal-500 w-64"
              />
            </div>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortAsc ? 'Menor Mag' : 'Mayor Mag'}</span>
            </button>
          </div>
        </div>

        {/* TABLA PAGINADA */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 font-extrabold">Magnitud</th>
                <th className="p-3.5 font-extrabold">Ubicación / Epicentro</th>
                <th className="p-3.5 font-extrabold">Profundidad</th>
                <th className="p-3.5 font-extrabold">Fecha y Hora UTC</th>
                <th className="p-3.5 font-extrabold">Tsunami</th>
                <th className="p-3.5 font-extrabold text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3.5 font-black text-slate-900 dark:text-white">
                    <span className={`px-2 py-0.5 rounded-md ${ev.mag >= 4.5 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'}`}>
                      {ev.mag.toFixed(1)} M
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">{ev.place}</td>
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{ev.depth_km} km</td>
                  <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{new Date(ev.time).toLocaleString()}</td>
                  <td className="p-3.5">
                    {ev.tsunami ? (
                      <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 font-extrabold text-[10px] border border-red-200 dark:border-red-800">ALERTA</span>
                    ) : (
                      <span className="text-slate-400 font-medium">No</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <a
                      href={ev.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${ev.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      &rarr;
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINADOR */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
          <span>Mostrando página {page} de {totalPages} ({filteredEvents.length} eventos)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
