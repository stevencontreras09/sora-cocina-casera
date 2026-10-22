'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'segmented' | 'icon' | 'dropdown';
  className?: string;
}

export function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera en modo dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Opción 1: Control Segmentado Moderno (Diseño estilo Apple macOS)
  if (variant === 'segmented') {
    return (
      <div
        className={`p-1 bg-black/5 dark:bg-[#0B0E14] rounded-2xl flex items-center justify-between gap-1 border border-border-sora/60 dark:border-[#232B3E] shadow-inner ${className}`}
        role="group"
        aria-label="Selector de tema visual"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            theme === 'light'
              ? 'bg-white text-text-sora shadow-sm border border-black/5 font-bold'
              : 'text-text-sora/60 dark:text-slate-400 hover:text-text-sora dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Modo Claro (Fondo Vainilla)"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-[11px]">Claro</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            theme === 'dark'
              ? 'bg-white dark:bg-[#1E2436] text-primary-sora dark:text-white shadow-sm dark:shadow-md dark:border dark:border-[#2E374E] font-bold'
              : 'text-text-sora/60 dark:text-slate-400 hover:text-text-sora dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Modo Oscuro / Vista Nocturna"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[11px]">Oscuro</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            theme === 'system'
              ? 'bg-white dark:bg-[#1E2436] text-primary-sora dark:text-white shadow-sm dark:shadow-md dark:border dark:border-[#2E374E] font-bold'
              : 'text-text-sora/60 dark:text-slate-400 hover:text-text-sora dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Automático (sigue el tema de tu dispositivo)"
        >
          <Laptop className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px]">Auto</span>
        </button>
      </div>
    );
  }

  // Opción 2: Botón con Menú Desplegable Flotante (Para Barra Superior Móvil)
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-white/80 dark:bg-[#141824] border border-border-sora dark:border-[#232B3E] text-text-sora dark:text-slate-200 hover:text-primary-sora dark:hover:text-primary-sora transition-all flex items-center space-x-1 shadow-2xs"
        title="Cambiar tema visual (Claro / Oscuro / Sistema)"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#141824] rounded-2xl shadow-2xl border border-border-sora dark:border-[#232B3E] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-text-sora/50 dark:text-slate-400 uppercase tracking-wider">
            Tema Visual
          </div>

          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              theme === 'light'
                ? 'bg-primary-sora/10 dark:bg-primary-sora/20 text-primary-sora font-bold'
                : 'text-text-sora/80 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>☀️ Modo Claro</span>
            </div>
            {theme === 'light' && <Check className="w-3.5 h-3.5 text-primary-sora" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-primary-sora/10 dark:bg-primary-sora/20 text-primary-sora font-bold'
                : 'text-text-sora/80 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>🌙 Vista Nocturna</span>
            </div>
            {theme === 'dark' && <Check className="w-3.5 h-3.5 text-primary-sora" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              theme === 'system'
                ? 'bg-primary-sora/10 dark:bg-primary-sora/20 text-primary-sora font-bold'
                : 'text-text-sora/80 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-emerald-400" />
              <span>💻 Automático (Sistema)</span>
            </div>
            {theme === 'system' && <Check className="w-3.5 h-3.5 text-primary-sora" />}
          </button>
        </div>
      )}
    </div>
  );
}
