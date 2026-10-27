import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { WORLD_PATHS } from '../data/worldMapData';
import { SeismicEvent } from '../types';


interface WorldMapSvgProps {
  events: SeismicEvent[];
  selectedEvent: SeismicEvent | null;
  onSelectEvent: (event: SeismicEvent | null) => void;
}

export const WorldMapSvg: React.FC<WorldMapSvgProps> = ({
  events,
  selectedEvent,
  onSelectEvent
}) => {
  const [hoveredEvent, setHoveredEvent] = useState<SeismicEvent | null>(null);

  // Proyeccion Equirectangular WGS84 estandar:
  // Ancho 1000, Alto 500
  // x = (lon + 180) * (1000 / 360)
  // y = (90 - lat) * (500 / 180)
  const projectCoordinates = (lat: number, lon: number) => {
    let normLon = lon;
    while (normLon > 180) normLon -= 360;
    while (normLon < -180) normLon += 360;

    const x = ((normLon + 180) * 1000) / 360;
    const y = ((90 - lat) * 500) / 180;
    return { x, y };
  };

  const getAlertSeverity = (mag: number) => {
    if (mag >= 5.0) {
      return {
        color: '#EF4444',
        label: 'Critico',
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
        ringColor: 'rgba(239, 68, 68, 0.45)'
      };
    }
    if (mag >= 4.0) {
      return {
        color: '#F59E0B',
        label: 'Moderado',
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        ringColor: 'rgba(245, 158, 11, 0.45)'
      };
    }
    if (mag >= 2.5) {
      return {
        color: '#2FD5C6',
        label: 'Menor',
        badgeClass: 'bg-[#2FD5C6]/20 text-[#2FD5C6] border-[#2FD5C6]/40',
        ringColor: 'rgba(47, 213, 198, 0.45)'
      };
    }
    return {
      color: '#10B981',
      label: 'Micro',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      ringColor: 'rgba(16, 185, 129, 0.45)'
    };
  };

  const latGrid = [-60, -30, 0, 30, 60];
  const lonGrid = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  return (
    <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#080C16] shadow-xs select-none transition-colors duration-200">
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Capa Oceano con soporte Dark/Light */}
        <rect width="1000" height="500" className="fill-slate-100/60 dark:fill-[#080C16]" />

        {/* Grilla Geodesica Cartografica */}
        <g strokeWidth="0.6" strokeDasharray="3 4" className="stroke-slate-300 dark:stroke-[#1E293B] opacity-70">
          {latGrid.map((lat) => {
            const y = ((90 - lat) * 500) / 180;
            return <line key={`lat-${lat}`} x1="0" y1={y} x2="1000" y2={y} />;
          })}
          {lonGrid.map((lon) => {
            const x = ((lon + 180) * 1000) / 360;
            return <line key={`lon-${lon}`} x1={x} y1="0" x2={x} y2="500" />;
          })}
        </g>

        {/* Linea del Ecuador y Meridiano de Greenwich */}
        <line x1="0" y1="250" x2="1000" y2="250" className="stroke-slate-400 dark:stroke-[#334155]" strokeWidth="0.8" opacity="0.8" />
        <line x1="500" y1="0" x2="500" y2="500" className="stroke-slate-400 dark:stroke-[#334155]" strokeWidth="0.8" opacity="0.8" />

        {/* Continentes: Blanco/Slate suave en modo claro (#FFFFFF, border #CBD5E1), Dark slate en modo oscuro (#131B2E, border #243452) */}
        <g>
          {WORLD_PATHS.map((country, idx) => (
            <path
              key={`${country.name}-${idx}`}
              d={country.d}
              strokeWidth="0.6"
              strokeLinejoin="round"
              className="fill-white dark:fill-[#131B2E] stroke-slate-300 dark:stroke-[#243452] transition-colors duration-150 hover:fill-teal-50 dark:hover:fill-[#1A253E]"
            >
              <title>{country.name}</title>
            </path>
          ))}
        </g>
      </svg>

      {events.map((ev) => {
        const { x, y } = projectCoordinates(ev.latitude, ev.longitude);
        const leftPercent = (x / 1000) * 100;
        const topPercent = (y / 500) * 100;
        const sev = getAlertSeverity(ev.mag);
        const isHovered = hoveredEvent?.id === ev.id;
        const isSelected = selectedEvent?.id === ev.id;
        const isMajor = ev.mag >= 4.0;

        return (
          <div
            key={ev.id}
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${
              isHovered ? 'z-[100]' : isSelected ? 'z-40' : 'z-20'
            }`}
            onMouseEnter={() => setHoveredEvent(ev)}
            onMouseLeave={() => setHoveredEvent(null)}
            onClick={() => onSelectEvent(isSelected ? null : ev)}
          >
            {isMajor && (
              <span
                className="absolute -inset-2.5 rounded-full animate-ping pointer-events-none"
                style={{ backgroundColor: sev.ringColor }}
              />
            )}

            <div
              className={`relative flex items-center justify-center rounded-full transition-transform duration-200 shadow-md ${
                isMajor ? 'p-1' : 'p-0.5'
              } ${isHovered || isSelected ? 'scale-150 ring-2 ring-white dark:ring-slate-900 z-30' : 'hover:scale-130'}`}
              style={{ backgroundColor: sev.color }}
            >
              {isMajor ? (
                <AlertTriangle className="w-3.5 h-3.5 text-slate-950 font-black" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-950/80" />
              )}
            </div>

            {isHovered && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white p-3.5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 pointer-events-none z-[110] backdrop-blur-md animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${sev.badgeClass}`}>
                    M {ev.mag.toFixed(1)} &bull; {sev.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                  </span>
                </div>

                <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                  {ev.place}
                </h5>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    Profundidad: <strong className="text-slate-800 dark:text-slate-200">{ev.depth_km} km</strong>
                  </div>
                  <div>
                    Tsunami: <strong className={ev.tsunami ? 'text-red-500 font-black' : 'text-emerald-600 dark:text-emerald-400'}>{ev.tsunami ? 'ALERTA' : 'Sin alerta'}</strong>
                  </div>
                  <div className="col-span-2 text-slate-500 dark:text-slate-400">
                    Coords: <span className="text-slate-700 dark:text-slate-300">{ev.latitude.toFixed(2)}° Lat, {ev.longitude.toFixed(2)}° Lon</span>
                  </div>
                </div>

                <div className="text-[9px] text-teal-600 dark:text-[#2FD5C6] font-bold mt-2 pt-1 border-t border-slate-200 dark:border-slate-800/60 text-center uppercase tracking-wider">
                  Clic para abrir ficha completa
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-600 dark:text-slate-400/80 bg-white/80 dark:bg-slate-950/70 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 pointer-events-none backdrop-blur-xs">
        Proyeccion WGS84 Equirectangular &bull; Base Geodesica Natural Earth
      </div>
      <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-600 dark:text-slate-400/80 bg-white/80 dark:bg-slate-950/70 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 pointer-events-none backdrop-blur-xs">
        {events.length} Sismos Visualizados
      </div>
    </div>
  );
};
