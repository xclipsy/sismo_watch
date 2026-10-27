import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, AlertCircle, Bot, User, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'assistant' | 'user' | 'system';
  content: string;
  isOffline?: boolean;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  apiUrl,
  token
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hola, soy tu asistente sismico de SismoWatch. Puedo responder tus preguntas sobre la actividad sismica actual a partir de la capa Gold enriquecida.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${apiUrl}/api/chat/ask`,
        { prompt: query },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000
        }
      );

      const data = response.data;
      if (data.status === 'offline') {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            isOffline: true
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply
          }
        ]);
      }
    } catch (err: any) {
      const errorMsg = err.code === 'ECONNABORTED'
        ? 'La consulta demoró más del tiempo esperado. Por favor reintenta tu pregunta.'
        : err.response?.data?.reply || err.response?.data?.detail || 'No fue posible conectar con el servicio backend. Verifica que la API este en ejecucion.';

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: errorMsg,
          isOffline: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Cual fue el sismo de mayor magnitud hoy?',
    'Hay alertas de tsunami activas en las ultimas 24h?',
    'Cual es el promedio de magnitud observado?'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP OSCURO TRASLUCIDO */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* DRAWER DESLIZANTE CON FISICA ELASTICA JITTER STYLE */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
          >
            {/* CABECERA DEL CHAT */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-fintech-dark dark:text-white leading-snug">Asistente Sismico IA</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Modelo local privado (qwen2.5:3b)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AREA DE MENSAJES */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-fintech-dark dark:text-white flex-shrink-0 mt-1 border border-slate-200 dark:border-slate-700">
                      <Bot className="w-4 h-4 text-teal-600 dark:text-[#2FD5C6]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] p-4 rounded-3xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0F172A] text-white dark:bg-[#2FD5C6] dark:text-[#0F172A] dark:font-bold rounded-br-none shadow-md border border-slate-700/50 dark:border-[#2FD5C6]'
                        : msg.isOffline
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/60 rounded-bl-none'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-none'
                    }`}
                  >
                    {msg.isOffline && (
                      <div className="flex items-center gap-2 mb-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Servicio Ollama Inactivo</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-[#0F172A] dark:bg-[#2FD5C6] text-white dark:text-[#0F172A] flex items-center justify-center flex-shrink-0 mt-1 border border-slate-700 dark:border-[#2FD5C6]">
                      <User className="w-4 h-4 text-[#2FD5C6] dark:text-[#0F172A]" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]"></div>
                  <span>Analizando capa Gold con Ollama...</span>
                </div>
              )}
            </div>

            {/* PROMPTS RAPIDOS */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Preguntas sugeridas</p>
              <div className="flex flex-col gap-1.5">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-left text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-fintech-dark dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 p-2 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* INPUT DE ENVIO */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu consulta sismica..."
                  className="flex-1 px-4 py-3 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-full bg-fintech-dark dark:bg-slate-800 text-white flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 disabled:opacity-40 transition-all flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-fintech-mint" />
                </button>
              </form>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
