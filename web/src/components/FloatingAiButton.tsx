import React from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingAiButtonProps {
  onClick: () => void;
}

export const FloatingAiButton: React.FC<FloatingAiButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      title="Asistente de Inteligencia Artificial (Qwen 2.5)"
      aria-label="Abrir Asistente IA"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-[#0F172A] text-[#2FD5C6] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-[#2FD5C6]/50 group hover:shadow-[#2FD5C6]/25"
    >
      <Sparkles className="w-6 h-6 text-[#2FD5C6] animate-pulse group-hover:rotate-12 transition-transform" />
      <span className="sr-only">Asistente IA</span>
    </button>
  );
};
