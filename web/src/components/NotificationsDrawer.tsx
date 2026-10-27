import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, AlertTriangle, CheckCircle2, ShieldCheck, Clock, FileText } from 'lucide-react';
import { PipelineAlert } from '../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PipelineAlert[];
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  alerts
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP OSCURO */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* DRAWER LATERAL */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* CABECERA */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-fintech-dark dark:text-white leading-snug">Centro de Notificaciones</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Alertas y telemetría de fallos del pipeline</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENIDO DE ALERTAS */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#2FD5C6] flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Sin incidentes registrados</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    El orquestador Apache Airflow y el motor de Lakehouse no presentan fallos. Todas las tareas operan al 100%.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      <FileText className="w-3.5 h-3.5" />
                      logs/pipeline_errors.log
                    </span>
                  </div>
                </div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span>{al.dag_id} &rarr; {al.task_id}</span>
                      </div>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200">
                        {al.severity}
                      </span>
                    </div>

                    <p className="text-xs text-red-900 dark:text-red-200 font-mono bg-white/80 dark:bg-slate-900 p-2.5 rounded-xl border border-red-100 dark:border-red-900/40 overflow-x-auto">
                      {al.error_message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>{new Date(al.created_at).toLocaleString()}</span>
                      <span className={al.is_resolved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                        {al.is_resolved ? 'Resuelto' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PIE */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              Notificaciones reactivas vinculadas al callback de Airflow
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
