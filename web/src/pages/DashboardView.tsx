import React, { useState } from 'react';
import { KpiData, SeismicEvent, StatsResponse } from '../types';
import {
  Activity, Zap, ShieldAlert, CheckCircle2, TrendingUp,
  Clock, ArrowUpRight, BarChart3, Filter, Globe, Layers,
  AlertTriangle, Flame, Waves, ExternalLink, Sparkles
} from 'lucide-react';
import { WorldMapSvg } from '../components/WorldMapSvg';

interface DashboardViewProps {
  kpis: KpiData;
  events: SeismicEvent[];
  stats: StatsResponse | null;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ kpis, events, stats, loading }) => {
  const [minMagFilter, setMinMagFilter] = useState<number>(0);
  const [hoveredEvent, setHoveredEvent] = useState<SeismicEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);

  const filteredEvents = events.filter(e => e.mag >= minMagFilter);

  // Proyección Cilíndrica Miller calibrada con precisión geodésica sobre la imagen 1480x984
  // Longitud lineal centrada en el meridiano de Greenwich (47.0% X) con factor de escala 0.258%/grado
  // Latitud calculada con función no lineal de Miller: y_norm = 1.25 * ln(tan(pi/4 + 0.4 * lat_rad))
  const getMapCoordinatesPercent = (lat: number, lon: number) => {
    // Normalización de longitud a rango [-180, 180]
    let normalizedLon = lon;
    while (normalizedLon > 180) normalizedLon -= 360;
    while (normalizedLon < -180) normalizedLon += 360;

    const left = 47.0 + normalizedLon * 0.258;

    // Proyección Miller: acota la latitud para evitar indeterminaciones polares
    const clampedLat = Math.max(-82, Math.min(82, lat));
    const rad = (clampedLat * Math.PI) / 180;
    const yNorm = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * rad));
    const top = 68.87 - 24.06 * yNorm;

    return {
      left: `${Math.max(1.5, Math.min(98.5, left))}%`,
      top: `${Math.max(2.5, Math.min(97.5, top))}%`
    };
  };

  const getAlertSeverity = (mag: number) => {
    if (mag >= 5.0) {
      return {
        label: 'CRÍTICO',
        color: '#EF4444',
        border: 'border-red-500',
        bg: 'bg-red-500/20 text-red-400',
        pingBg: 'bg-red-500',
        iconBg: 'bg-red-600',
        badge: 'bg-red-950/80 text-red-300 border-red-800'
      };
    }
    if (mag >= 4.0) {
      return {
        label: 'ALERTA',
        color: '#F59E0B',
        border: 'border-amber-500',
        bg: 'bg-amber-500/20 text-amber-400',
        pingBg: 'bg-amber-500',
        iconBg: 'bg-amber-500',
        badge: 'bg-amber-950/80 text-amber-300 border-amber-800'
      };
    }
    if (mag >= 2.5) {
      return {
        label: 'MODERADO',
        color: '#2FD5C6',
        border: 'border-[#2FD5C6]',
        bg: 'bg-[#2FD5C6]/20 text-[#2FD5C6]',
        pingBg: 'bg-[#2FD5C6]',
        iconBg: 'bg-[#2FD5C6]',
        badge: 'bg-slate-900/90 text-[#2FD5C6] border-[#2FD5C6]/40'
      };
    }
    return {
      label: 'LEVE',
      color: '#10B981',
      border: 'border-emerald-500',
      bg: 'bg-emerald-500/20 text-emerald-400',
      pingBg: 'bg-emerald-500',
      iconBg: 'bg-emerald-500',
      badge: 'bg-slate-900/90 text-emerald-300 border-emerald-800'
    };
  };

  // Comparativa contra línea base global de la red USGS (~2.45 M)
  const baselineAvgMag = 2.45;
  const avgDiff = kpis.avg_magnitude ? (kpis.avg_magnitude - baselineAvgMag).toFixed(2) : '0.00';
  const isHigherThanBaseline = Number(avgDiff) >= 0;

  // Calculo de curva suave para el gráfico de área (Spline SVG)
  const timeseries = stats?.timeseries || [];
  const maxTimeseriesCount = Math.max(...timeseries.map(t => t.count), 1);
  const chartWidth = 700;
  const chartHeight = 180;
  
  const generateSmoothAreaPath = () => {
    if (timeseries.length === 0) return { path: '', area: '', points: [] };
    const step = chartWidth / Math.max(timeseries.length - 1, 1);
    
    const points = timeseries.map((pt, i) => {
      const x = i * step;
      const y = chartHeight - ((pt.count / maxTimeseriesCount) * (chartHeight - 30) + 15);
      return { x, y, pt };
    });

    if (points.length === 1) {
      return {
        path: `M 0 ${points[0].y} L ${chartWidth} ${points[0].y}`,
        area: `M 0 ${points[0].y} L ${chartWidth} ${points[0].y} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`,
        points
      };
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const area = `${d} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
    return { path: d, area, points };
  };

  const smoothChart = generateSmoothAreaPath();
  const activeEvent = hoveredEvent || selectedEvent;

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      
      {/* SECCION HERO & TITULO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#2FD5C6] bg-[#0F172A] px-3.5 py-1.5 rounded-full border border-[#2FD5C6]/40 shadow-xs">
              Arquitectura Medallón
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Gold Analytics Ready
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mt-2.5">
            Panel de Inteligencia Sísmica Global
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Visualización interactiva geolocalizada con alertas tectónicas y análisis predictivo en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <Clock className="w-4 h-4 text-[#2FD5C6]" />
          <span>Último refresco: {kpis.last_update_utc ? new Date(kpis.last_update_utc).toLocaleTimeString() : 'En curso'}</span>
        </div>
      </div>

      {/* TARJETAS DE KPIS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: TOTAL SISMOS */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech hover:shadow-fintech-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Sismos 24h</span>
            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-[#0F172A] flex items-center justify-center text-teal-600 dark:text-[#2FD5C6] group-hover:scale-110 transition-transform shadow-xs border border-teal-200 dark:border-slate-800">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {loading ? '--' : kpis.total_events_24h}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#0F172A] dark:text-slate-200">
            <TrendingUp className="w-4 h-4 text-[#2FD5C6]" />
            <span>Curados en capa Gold</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#2FD5C6]/10 rounded-full pointer-events-none"></div>
        </div>

        {/* KPI 2: MAGNITUD MAXIMA */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech hover:shadow-fintech-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Magnitud Máxima</span>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform border border-amber-200 dark:border-amber-500/40">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {loading ? '--' : kpis.max_magnitude.toFixed(1)}
            <span className="text-lg font-bold text-slate-400 ml-1.5">M</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Pico máximo de energía liberada</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full pointer-events-none"></div>
        </div>

        {/* KPI 3: MAGNITUD MEDIA VS LINEA BASE */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech hover:shadow-fintech-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Magnitud Promedio</span>
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform border border-cyan-200 dark:border-cyan-500/40">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {loading ? '--' : kpis.avg_magnitude.toFixed(2)}
          </div>
          <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${isHigherThanBaseline ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            <span>{isHigherThanBaseline ? `+${avgDiff} M` : `${avgDiff} M`} vs media global (2.45 M)</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-cyan-500/10 rounded-full pointer-events-none"></div>
        </div>

        {/* KPI 4: SCORE DE CALIDAD */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-fintech hover:shadow-fintech-lg transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Score de Calidad</span>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              kpis.tsunami_alerts_count > 0 ? 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/40' : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40'
            }`}>
              {kpis.tsunami_alerts_count > 0 ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
          <div className="text-4xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {loading ? '--' : `${kpis.quality_score.toFixed(1)}%`}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>{kpis.tsunami_alerts_count} alertas de tsunami activas</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full pointer-events-none"></div>
        </div>

      </div>

      {/* SECCION CENTRAL: MAPA MUNDIAL REALISTA CON ICONOS DE ALERTA INTERACTIVOS (HOVER DIRECTO) */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-[#2FD5C6]" />
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white tracking-tight">
                Mapa Mundial de Distribución Tectónica y Alertas
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Pasa el cursor sobre los iconos de alerta en cualquier región para desplegar automáticamente los detalles del sismo.
            </p>
          </div>

          {/* FILTRO DE MAGNITUD Y CONTEO */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Filtrar:</span>
              <select
                value={minMagFilter}
                onChange={(e) => setMinMagFilter(parseFloat(e.target.value))}
                className="bg-transparent text-xs font-bold text-[#0F172A] dark:text-white focus:outline-none cursor-pointer"
              >
                <option value={0} className="dark:bg-slate-900 dark:text-white">Todos los sismos ({events.length})</option>
                <option value={2.5} className="dark:bg-slate-900 dark:text-white">&ge; 2.5 M (Sensibles)</option>
                <option value={4.0} className="dark:bg-slate-900 dark:text-white">&ge; 4.0 M (Alertas)</option>
                <option value={5.0} className="dark:bg-slate-900 dark:text-white">&ge; 5.0 M (Críticos)</option>
              </select>
            </div>

            <span className="text-xs font-bold bg-[#0F172A] text-[#2FD5C6] px-3.5 py-1.5 rounded-full border border-[#2FD5C6]/30 shadow-xs">
              {filteredEvents.length} eventos activos
            </span>
          </div>
        </div>

        {/* CONTENEDOR DEL MAPA ADAPTABLE: INTEGRACION PERFECTA EN MODO CLARO Y OSCURO */}
        <div className="relative w-full rounded-3xl bg-slate-50/50 dark:bg-[#0A0F1D] p-3 sm:p-4 overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
          
          {/* LEYENDA SUPERIOR ADAPTADA A MODO CLARO Y OSCURO */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-3 px-3 z-20 relative gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2FD5C6] animate-ping"></span>
              <span className="font-mono text-[11px] font-black text-slate-900 dark:text-[#2FD5C6] uppercase tracking-widest">
                Monitoreo Global Sísmico Activo
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> &lt; 2.5 M
              </span>
              <span className="flex items-center gap-1.5 text-teal-600 dark:text-[#2FD5C6] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2FD5C6] inline-block"></span> 2.5 - 4.0 M
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> 4.0 - 5.0 M
              </span>
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> ≥ 5.0 M Crítico
              </span>
            </div>
          </div>

          {/* MAPA MUNDIAL VECTORIAL DE ALTA PRECISION CARTOGRAFICA */}
          <WorldMapSvg
            events={filteredEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
          />

          {/* FICHA DETALLADA: FONDO BLANCO PURO EN MODO CLARO */}
          {activeEvent ? (
            <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900 dark:text-white shadow-sm animate-fadeIn">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md ${getAlertSeverity(activeEvent.mag).iconBg} text-slate-950 shrink-0`}>
                  {activeEvent.mag.toFixed(1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{activeEvent.place}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getAlertSeverity(activeEvent.mag).badge}`}>
                      {getAlertSeverity(activeEvent.mag).label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    <span>Lat: <strong className="text-slate-700 dark:text-slate-200">{activeEvent.latitude.toFixed(3)}°</strong></span>
                    <span>Lon: <strong className="text-slate-700 dark:text-slate-200">{activeEvent.longitude.toFixed(3)}°</strong></span>
                    <span>Profundidad: <strong className="text-slate-700 dark:text-slate-200">{activeEvent.depth_km} km</strong></span>
                    <span>Hora UTC: <strong className="text-slate-700 dark:text-slate-200">{new Date(activeEvent.time).toUTCString()}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={activeEvent.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${activeEvent.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#2FD5C6] hover:bg-[#2FD5C6]/90 text-slate-950 text-xs font-black transition-colors shadow-xs"
                >
                  <span>Ficha Oficial USGS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {selectedEvent && (
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-center text-slate-400 text-xs font-mono">
              Pasa el cursor sobre los pines de alerta en el mapa para previsualizar los sismos en tiempo real.
            </div>
          )}
        </div>
      </div>

      {/* SECCION DE DIAGRAMAS ANALITICOS: GRAFICO DE AREA / GRADIENTE CONTINUO (SPLINE WAVE) Y DISTRIBUCION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAFICO 1: GRAFICO DE ONDA / AREA DE GRADIENTE CONTINUO (REEMPLAZANDO BARRAS SIMPLES) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Waves className="w-5 h-5 text-[#2FD5C6]" />
                <h3 className="text-lg font-black text-[#0F172A] dark:text-white tracking-tight">
                  Espectro de Liberación Sísmica (Curva Continua de Frecuencia 24h)
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Modelado fluido de actividad horaria con picos de intensidad y gradiente volumétrico.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#0F172A] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
                Media: {(events.length / 24).toFixed(1)} sismos/h
              </span>
            </div>
          </div>

          {/* SVG AREA CHART DE ONDA CONTINUA */}
          {timeseries.length > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="h-52 w-full bg-[#0F172A] rounded-2xl p-4 border border-slate-800 relative overflow-hidden shadow-inner">
                
                {/* SVG GRAFICO DE AREA */}
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2FD5C6" stopOpacity="0.75" />
                      <stop offset="50%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2FD5C6" />
                      <stop offset="50%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>

                  {/* LINEAS GUIA HORIZONTALES */}
                  <line x1="0" y1="45" x2={chartWidth} y2="45" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2={chartWidth} y2="90" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <line x1="0" y1="135" x2={chartWidth} y2="135" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

                  {/* AREA DE GRADIENTE SOMBREADO */}
                  {smoothChart.area && (
                    <path d={smoothChart.area} fill="url(#areaGradient)" />
                  )}

                  {/* TRAZO DE LA ONDA CONTINUA */}
                  {smoothChart.path && (
                    <path d={smoothChart.path} fill="none" stroke="url(#strokeGradient)" strokeWidth="3" strokeLinecap="round" />
                  )}

                  {/* PUNTOS CLAVE CON TOOLTIP SVG EN HOVER */}
                  {smoothChart.points.map((pt, i) => (
                    <g key={i} className="group/dot cursor-pointer">
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#0F172A" stroke="#2FD5C6" strokeWidth="2.5" className="group-hover/dot:r-7 transition-all" />
                      <circle cx={pt.x} cy={pt.y} r="10" fill="#2FD5C6" opacity="0" className="group-hover/dot:opacity-25 transition-opacity" />
                    </g>
                  ))}
                </svg>

                {/* ETIQUETAS HORARIAS DEL EJE X */}
                <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] font-mono text-slate-400 select-none">
                  {timeseries.map((t, idx) => (
                    <span key={idx} className="font-bold text-slate-400">{t.timestamp}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
                <span>Eje X: Horas de Registro UTC</span>
                <span>Eje Y: Curva Suavizada de Liberación Tectónica</span>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
              Sin datos temporales suficientes para graficar.
            </div>
          )}
        </div>

        {/* GRAFICO 2: HISTOGRAMA DE MAGNITUDES Y PROFUNDIDAD */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-6">
          <div>
            <h3 className="text-lg font-black text-[#0F172A] dark:text-white tracking-tight">
              Distribución por Magnitud
            </h3>
            <p className="text-xs text-slate-400 font-medium">Desglose comparativo por categorías Richter</p>
          </div>

          {/* HISTOGRAMA */}
          <div className="space-y-3.5">
            {stats?.distribution.map((dist, idx) => {
              const totalEvents = events.length || 1;
              const pct = Math.round((dist.count / totalEvents) * 100);

              let barColor = 'from-[#2FD5C6] to-emerald-500';
              if (dist.bracket.includes('4.0')) barColor = 'from-amber-400 to-amber-500';
              if (dist.bracket.includes('5.5')) barColor = 'from-red-400 to-red-500';

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{dist.bracket} M</span>
                    <span className="font-mono text-slate-900 dark:text-white">{dist.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESGLOSE POR PROFUNDIDAD HIPOCENTRAL */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Profundidad Hipocentral
            </span>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-[#0F172A] text-white border border-slate-800">
                <span className="text-[10px] font-bold text-[#2FD5C6] block">Superficial</span>
                <span className="text-sm font-black">&le; 30km</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{events.filter(e => e.depth_km <= 30).length} sismos</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0F172A] text-white border border-slate-800">
                <span className="text-[10px] font-bold text-cyan-400 block">Intermedio</span>
                <span className="text-sm font-black">30-70km</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{events.filter(e => e.depth_km > 30 && e.depth_km <= 70).length} sismos</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0F172A] text-white border border-slate-800">
                <span className="text-[10px] font-bold text-amber-400 block">Profundo</span>
                <span className="text-sm font-black">&gt; 70km</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{events.filter(e => e.depth_km > 70).length} sismos</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* FEED EN TIEMPO REAL SSE */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-4xl border border-slate-200 dark:border-slate-800 shadow-fintech space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-[#0F172A] dark:text-white tracking-tight">
              Feed Sísmico en Vivo (Server-Sent Events)
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Transmisión reactiva sin recargar la página. Cada tarjeta permite consultar la ficha oficial en USGS.
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs font-black bg-[#0F172A] text-[#2FD5C6] px-3.5 py-1.5 rounded-full border border-[#2FD5C6]/40 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#2FD5C6] animate-pulse"></span>
            <span>Stream Conectado</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {filteredEvents.slice(0, 6).map((e) => {
            const sev = getAlertSeverity(e.mag);
            return (
              <div
                key={e.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between transition-all"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${sev.bg}`}>
                      M {e.mag.toFixed(1)}
                    </span>
                    {e.tsunami && (
                      <span className="text-[10px] font-extrabold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                        TSUNAMI
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-1.5">{e.place}</p>
                  <span className="text-[10px] text-slate-400">Profundidad: {e.depth_km} km</span>
                </div>

                <a
                  href={e.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${e.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white shadow-xs border border-slate-200 dark:border-slate-600 transition-colors shrink-0"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
