'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'sora_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [isMounted, setIsMounted] = useState(false);

  // Aplicar tema en el elemento raíz del DOM (HTML)
  const applyThemeToDOM = useCallback((resolved: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Determinar el tema resuelto
  const computeResolved = useCallback((currentMode: ThemeMode): ResolvedTheme => {
    if (currentMode === 'dark') return 'dark';
    if (currentMode === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  // Inicialización en cliente
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      const initialMode: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
      setThemeState(initialMode);
      const res = computeResolved(initialMode);
      setResolvedTheme(res);
      applyThemeToDOM(res);
    } catch (_) {
      const res = computeResolved('system');
      setResolvedTheme(res);
      applyThemeToDOM(res);
    }
  }, [computeResolved, applyThemeToDOM]);

  // Cambiar tema
  const setTheme = useCallback(
    (newMode: ThemeMode) => {
      setThemeState(newMode);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newMode);
      } catch (_) {}

      const res = computeResolved(newMode);
      setResolvedTheme(res);
      applyThemeToDOM(res);
    },
    [computeResolved, applyThemeToDOM]
  );

  // Alternar rápidamente entre Claro y Oscuro
  const toggleTheme = useCallback(() => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  }, [resolvedTheme, setTheme]);

  // Escuchar cambios en la preferencia del sistema operativo si theme === 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const res = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(res);
        applyThemeToDOM(res);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Soporte para navegadores antiguos
      (mediaQuery as any).addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, [theme, applyThemeToDOM]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
}
