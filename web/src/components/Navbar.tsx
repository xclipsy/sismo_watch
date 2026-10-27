import React, { useState } from 'react';
import { User } from '../types';
import { Activity, FileText, Server, Shield, LogOut, Database, Menu, X, Bell, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNotifications: () => void;
  alertsCount: number;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  setActiveView,
  onOpenNotifications,
  alertsCount,
  onLogout,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'pipeline', label: 'Pipeline & Calidad', icon: Server },
    { id: 'duckdb', label: 'DuckDB Lakehouse', icon: Database },
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Administrador', icon: Shield });
  }

  const handleSelectView = (view: string) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* PADDING RESPIRABLE Y CENTRADO: max-w-7xl mx-auto */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 min-h-[4.75rem] flex items-center justify-between gap-3 sm:gap-4">
        
        {/* LOGO & BADGE EN VIVO */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => handleSelectView('dashboard')}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#0F172A] flex items-center justify-center text-[#2FD5C6] font-black text-lg shadow-fintech group-hover:scale-105 transition-transform border border-slate-700/50">
              S
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap">
              sismo<span className="text-[#2FD5C6]">watch</span>
            </span>
          </div>

          {/* BADGE EN VIVO SSE */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F172A] text-[#2FD5C6] border border-[#2FD5C6]/30 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FD5C6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FD5C6]"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2FD5C6] whitespace-nowrap">
              En Vivo SSE
            </span>
          </div>
        </div>

        {/* NAVEGACION CENTRAL EN UNA SOLA LINEA */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-inner shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectView(item.id)}
                className={`flex items-center gap-2 px-3.5 xl:px-4 py-2 rounded-full text-xs xl:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0F172A] dark:bg-slate-800 text-white shadow-md border border-slate-700/60'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive && item.id === 'admin' ? 'text-[#2FD5C6]' : ''}`} />
                <span className="whitespace-nowrap tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ACCIONES EXTREMO DERECHO */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* BOTON MODO OSCURO */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* BOTON NOTIFICACIONES */}
          <button
            onClick={onOpenNotifications}
            title="Centro de notificaciones del pipeline"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {alertsCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {alertsCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#2FD5C6]"></span>
            )}
          </button>

          {/* BADGE DE USUARIO: Vista Admin */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#0F172A] text-[#2FD5C6] border border-[#2FD5C6]/40 shadow-xs inline-block">
                Vista Admin
              </span>
            </div>

            {/* BOTON CERRAR SESION */}
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* BOTON MOVIL */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

      </div>

      {/* MENU MOVIL */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] px-6 py-4 space-y-1.5 animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#0F172A] dark:bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
