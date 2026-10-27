import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface LoginViewProps {
  apiUrl: string;
  onLoginSuccess: (token: string, role: 'viewer' | 'admin', email: string, fullName?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ apiUrl, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${apiUrl}/auth/login`, {
        email: email.trim(),
        password: password
      });

      const data = response.data;
      onLoginSuccess(data.access_token, data.role, data.email, data.full_name);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'viewer') => {
    if (role === 'admin') {
      setEmail('admin@sismowatch.internal');
      setPassword('Admin2026!Secure');
    } else {
      setEmail('viewer@sismowatch.internal');
      setPassword('Viewer2026!Secure');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 dark:from-[#0A0E1A] dark:via-[#0F172A] dark:to-[#0A0E1A]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 md:p-10 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-fintech-lg space-y-8 animate-fadeIn">
        
        {/* LOGO & TITULAR */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-fintech-dark flex items-center justify-center text-fintech-mint font-extrabold text-2xl shadow-fintech mx-auto border border-slate-700/50">
            S
          </div>
          <h1 className="text-2xl font-extrabold text-fintech-dark dark:text-white tracking-tight">
            sismo<span className="text-fintech-mint">watch</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Plataforma de Monitoreo e Inteligencia Sísmica en Tiempo Real
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-800 dark:text-red-300 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* FORMULARIO DE INICIO DE SESION */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@sismowatch.internal"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full bg-fintech-dark dark:bg-slate-800 text-white font-extrabold text-sm hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 shadow-fintech disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
          >
            <span>{loading ? 'Validando Credenciales...' : 'Acceder al Sistema'}</span>
            <ArrowRight className="w-4 h-4 text-fintech-mint group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* BOTONES DE PRUEBA RAPIDA */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acceso Rápido para Pruebas Evaluativas</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Rol Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('viewer')}
              className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Rol Viewer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
