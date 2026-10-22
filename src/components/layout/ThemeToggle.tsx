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

  // Opción 1: Control Segmentado (ideal para Sidebar y Ajustes)
  if (variant === 'segmented') {
    return (
      <div className={`p-1 bg-border-sora/40 dark:bg-border-sora/20 rounded-2xl flex items-center justify-between gap-1 border border-border-sora/60 ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            theme === 'light'
              ? 'bg-white text-primary-sora shadow-xs font-bold'
              : 'text-text-sora/70 hover:text-text-sora'
          }`}
          title="Modo Claro"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px]">Claro</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            theme === 'dark'
              ? 'bg-white text-primary-sora shadow-xs font-bold'
              : 'text-text-sora/70 hover:text-text-sora'
          }`}
          title="Modo Oscuro / Vista Nocturna"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px]">Oscuro</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            theme === 'system'
              ? 'bg-white text-primary-sora shadow-xs font-bold'
              : 'text-text-sora/70 hover:text-text-sora'
          }`}
          title="Automático según el sistema operativo"
        >
          <Laptop className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px]">Auto</span>
        </button>
      </div>
    );
  }

  // Opción 2: Botón con Desplegable Flotante (ideal para Header Móvil o Barras Compactas)
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-border-sora text-text-sora hover:text-primary-sora transition-all flex items-center space-x-1 shadow-2xs"
        title="Cambiar tema visual (Claro / Oscuro / Sistema)"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#221E1C] rounded-2xl shadow-xl border border-border-sora p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-sora/50 uppercase tracking-wider">
            Tema Visual
          </div>

          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              theme === 'light'
                ? 'bg-primary-sora/10 text-primary-sora font-bold'
                : 'text-text-sora/80 hover:bg-bg-sora'
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
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-primary-sora/10 text-primary-sora font-bold'
                : 'text-text-sora/80 hover:bg-bg-sora'
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
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              theme === 'system'
                ? 'bg-primary-sora/10 text-primary-sora font-bold'
                : 'text-text-sora/80 hover:bg-bg-sora'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-emerald-500" />
              <span>💻 Automático (Sistema)</span>
            </div>
            {theme === 'system' && <Check className="w-3.5 h-3.5 text-primary-sora" />}
          </button>
        </div>
      )}
    </div>
  );
}
