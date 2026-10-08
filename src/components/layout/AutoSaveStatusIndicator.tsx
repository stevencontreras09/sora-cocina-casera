'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function AutoSaveStatusIndicator() {
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [isSavingPulse, setIsSavingPulse] = useState(false);

  useEffect(() => {
    // Leer último guardado inicial
    const initialTime = localStorage.getItem('sora_last_autosave_time');
    const initialSection = localStorage.getItem('sora_last_autosave_section');
    if (initialTime) {
      const d = new Date(initialTime);
      setLastSaved(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setSavedSection(initialSection);
    }

    const handleAutoSave = (e: any) => {
      const { section, timestamp } = e.detail || {};
      const d = new Date(timestamp || Date.now());
      setLastSaved(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSavedSection(section || 'Sistema');
      setIsSavingPulse(true);
      setTimeout(() => setIsSavingPulse(false), 2000);
    };

    window.addEventListener('sora-autosave-event', handleAutoSave);
    return () => {
      window.removeEventListener('sora-autosave-event', handleAutoSave);
    };
  }, []);

  return (
    <div
      title={
        lastSaved
          ? `Último cambio guardado automáticamente a las ${lastSaved} en ${savedSection || 'Sora'}`
          : 'Guardado automático activo'
      }
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-300 ${
        isSavingPulse
          ? 'bg-emerald-100 text-emerald-800 border-emerald-400 scale-105 shadow-sm'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isSavingPulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
      </span>
      <span>
        {isSavingPulse ? 'Guardando...' : lastSaved ? `Guardado ${lastSaved}` : 'Autoguardado activo'}
      </span>
    </div>
  );
}
