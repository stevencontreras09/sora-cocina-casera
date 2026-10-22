'use client';

import React, { useState } from 'react';
import {
  HISTORICAL_RELEASES,
  CURRENT_APP_VERSION,
  ReleaseChangelog,
  applyAppUpdate,
} from '@/lib/version';
import {
  Sparkles,
  X,
  History,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Tag,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>(CURRENT_APP_VERSION);
  const [viewMode, setViewMode] = useState<'timeline' | 'single'>('timeline');

  if (!isOpen) return null;

  const currentRelease =
    HISTORICAL_RELEASES.find((r) => r.version === selectedVersion) ||
    HISTORICAL_RELEASES[0];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-[#141824] rounded-3xl max-w-2xl w-full border border-border-sora dark:border-[#232B3E] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-border-sora dark:border-[#232B3E] flex items-center justify-between bg-bg-sora/60 dark:bg-[#0B0E14] flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-sora text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-base text-text-sora dark:text-white leading-tight">
                  Novedades de Sora Cocina Casera
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-sora/15 text-primary-sora font-mono font-bold">
                  v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-text-sora/60 dark:text-slate-400 mt-0.5">
                Historial completo de mejoras y funciones desde la versión 1.2 a la actualidad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-border-sora/40 dark:hover:bg-white/10 text-text-sora/60 dark:text-slate-400 hover:text-text-sora dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Modo de Vista y Selector de Versión */}
        <div className="p-3 bg-bg-sora/40 dark:bg-[#10141F] border-b border-border-sora dark:border-[#232B3E] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-primary-sora text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-[#1A2030] text-text-sora/70 dark:text-slate-300 border border-border-sora dark:border-[#232B3E]'
              }`}
            >
              Línea de Tiempo Completa
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'single'
                  ? 'bg-primary-sora text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-[#1A2030] text-text-sora/70 dark:text-slate-300 border border-border-sora dark:border-[#232B3E]'
              }`}
            >
              Por Versión
            </button>
          </div>

          {viewMode === 'single' && (
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="text-xs px-2.5 py-1 rounded-xl border border-border-sora dark:border-[#232B3E] bg-white dark:bg-[#1A2030] text-text-sora dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-primary-sora"
            >
              {HISTORICAL_RELEASES.map((rel) => (
                <option key={rel.version} value={rel.version}>
                  v{rel.version} {rel.version === CURRENT_APP_VERSION ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Cuerpo del Contenido */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {viewMode === 'timeline' ? (
            /* Vista 1: Línea de Tiempo Completa (v1.2 a v1.3) */
            <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border-sora dark:before:bg-[#232B3E]">
              {HISTORICAL_RELEASES.map((rel, idx) => {
                const isCurrent = rel.version === CURRENT_APP_VERSION;
                return (
                  <div key={rel.version} className="relative pl-8 space-y-2">
                    {/* Indicador de la línea */}
                    <div
                      className={`absolute left-1.5 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white dark:bg-[#0B0E14] ${
                        isCurrent
                          ? 'border-primary-sora ring-4 ring-primary-sora/20'
                          : 'border-text-sora/30 dark:border-slate-600'
                      }`}
                    >
                      {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-primary-sora" />}
                    </div>

                    {/* Cabecera de la versión */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-primary-sora bg-primary-sora/10 dark:bg-primary-sora/20 px-2.5 py-0.5 rounded-lg border border-primary-sora/25">
                          v{rel.version}
                        </span>
                        <h4 className="font-bold text-sm text-text-sora dark:text-white">
                          {rel.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-text-sora/50 dark:text-slate-400 font-medium flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {rel.date}
                      </span>
                    </div>

                    {/* Lista de mejoras de esta versión */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {rel.highlights.map((h, hIdx) => (
                        <div
                          key={hIdx}
                          className="p-3 rounded-2xl bg-bg-sora/50 dark:bg-[#1A2030] border border-border-sora/60 dark:border-[#232B3E] flex items-start space-x-3 text-xs"
                        >
                          <span className="text-base flex-shrink-0 mt-0.5">{h.icon}</span>
                          <div>
                            <span className="font-bold text-text-sora dark:text-white block">{h.title}</span>
                            <span className="text-text-sora/70 dark:text-slate-300 text-[11px] leading-relaxed block mt-0.5">
                              {h.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista 2: Por Versión Individual */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary-sora/10 dark:bg-[#1A2030] border border-primary-sora/25 dark:border-[#232B3E]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-primary-sora">
                    Versión {currentRelease.version}
                  </span>
                  <span className="text-xs text-text-sora/60 dark:text-slate-400">{currentRelease.date}</span>
                </div>
                <h4 className="font-serif font-bold text-lg text-text-sora dark:text-white mt-1">
                  {currentRelease.title}
                </h4>
              </div>

              <div className="space-y-2.5">
                {currentRelease.highlights.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-bg-sora/50 dark:bg-[#1A2030] border border-border-sora/60 dark:border-[#232B3E] flex items-start space-x-3 text-xs"
                  >
                    <span className="text-xl flex-shrink-0">{h.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-text-sora dark:text-white">{h.title}</span>
                      </div>
                      <p className="text-text-sora/70 dark:text-slate-300 text-xs mt-1 leading-relaxed">
                        {h.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal con botón de cierre */}
        <div className="p-4 border-t border-border-sora dark:border-[#232B3E] bg-bg-sora/40 dark:bg-[#0B0E14] flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-text-sora/50 dark:text-slate-400">
            Sora Web App • Build v{CURRENT_APP_VERSION}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
