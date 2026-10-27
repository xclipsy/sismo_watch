import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, KpiData, SeismicEvent, AiReport, PipelineStatus, StatsResponse } from './types';
import { Navbar } from './components/Navbar';
import { ChatDrawer } from './components/ChatDrawer';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { FloatingAiButton } from './components/FloatingAiButton';
import { DashboardView } from './pages/DashboardView';
import { ReportsView } from './pages/ReportsView';
import { PipelineView } from './pages/PipelineView';
import { AdminView } from './pages/AdminView';
import { DuckDBView } from './pages/DuckDBView';
import { LoginView } from './pages/LoginView';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('sismo_token'));
  const [user, setUser] = useState<User | null>(
    localStorage.getItem('sismo_user') ? JSON.parse(localStorage.getItem('sismo_user')!) : null
  );

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sismo_dark_mode');
    return saved !== null ? saved === 'true' : true; // Default dark mode
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sismo_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sismo_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Estados de datos
  const [kpis, setKpis] = useState<KpiData>({
    date: new Date().toISOString().split('T')[0],
    total_events_24h: 0,
    max_magnitude: 0.0,
    avg_magnitude: 0.0,
    tsunami_alerts_count: 0,
    quality_score: 100.0
  });

  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Guardado de sesion
  const handleLoginSuccess = (newToken: string, role: 'viewer' | 'admin', email: string, fullName?: string) => {
    const newUser: User = { role, email, full_name: fullName };
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('sismo_token', newToken);
    localStorage.setItem('sismo_user', JSON.stringify(newUser));
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sismo_token');
    localStorage.removeItem('sismo_user');
  };

  // Carga inicial de datos
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [kpiRes, evRes, statsRes, repRes, pipeRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/kpis`, { headers }),
          axios.get(`${API_URL}/api/events?page=1&page_size=50`, { headers }),
          axios.get(`${API_URL}/api/stats/timeseries`, { headers }),
          axios.get(`${API_URL}/api/reports`, { headers }),
          axios.get(`${API_URL}/api/pipeline/status`, { headers })
        ]);

        // Si el token expiro o fue revocado, limpiar sesion para que vuelva a iniciar sesion
        const has401 = [kpiRes, evRes, statsRes, repRes, pipeRes].some(
          r => r.status === 'rejected' && (r.reason as any)?.response?.status === 401
        );
        if (has401) {
          console.warn('Sesion expirada (401). Solicitando nuevo inicio de sesion...');
          handleLogout();
          return;
        }

        if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value.data);
        if (evRes.status === 'fulfilled') setEvents(evRes.value.data.items || []);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (repRes.status === 'fulfilled') setReports(repRes.value.data || []);
        if (pipeRes.status === 'fulfilled') setPipelineStatus(pipeRes.value.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          handleLogout();
        }
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Transmision en tiempo real via Server-Sent Events (SSE)
  useEffect(() => {
    if (!token) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_URL}/api/stream?token=${encodeURIComponent(token)}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'update' && Array.isArray(payload.events)) {
            // Actualizar feed si hay nuevos eventos
            setEvents(prev => {
              const newIds = new Set(payload.events.map((e: any) => e.id));
              const remaining = prev.filter(e => !newIds.has(e.id));
              return [...payload.events, ...remaining];
            });
          }
        } catch (e) {
          console.error('Error parseando SSE:', e);
        }
      };

      eventSource.onerror = () => {
        console.warn('Conexion SSE interrumpida. EventSource reconectara automaticamente...');
      };
    } catch (err) {
      console.error('No se pudo establecer canal SSE:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [token]);

  if (!token || !user) {
    return <LoginView apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />;
  }

  const alerts = pipelineStatus?.alerts || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0E1A] text-slate-800 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200">
      {/* BARRA DE NAVEGACION SUPERIOR (FULL WIDTH, SINGLE LINE) */}
      <Navbar
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        alertsCount={alerts.length}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* CONTENIDO PRINCIPAL POR VISTA (CENTRADO Y BALANCEADO: max-w-7xl mx-auto) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeView === 'dashboard' && (
          <DashboardView kpis={kpis} events={events} stats={stats} loading={loading} />
        )}

        {activeView === 'reports' && (
          <ReportsView reports={reports} events={events} apiUrl={API_URL} token={token} />
        )}

        {activeView === 'pipeline' && (
          <PipelineView statusData={pipelineStatus} loading={loading} />
        )}

        {activeView === 'duckdb' && (
          <DuckDBView apiUrl={API_URL} token={token} />
        )}

        {activeView === 'admin' && (
          <AdminView userRole={user.role} apiUrl={API_URL} token={token} />
        )}
      </main>

      {/* BOTON FLOTANTE DE IA (UNICO ICONO, ESQUINA INFERIOR DERECHA) */}
      <FloatingAiButton onClick={() => setIsChatOpen(true)} />

      {/* DRAWER DESLIZANTE DEL CHATBOT IA */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        apiUrl={API_URL}
        token={token}
      />

      {/* DRAWER DESLIZANTE DE NOTIFICACIONES */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        alerts={alerts}
      />
    </div>
  );
};
