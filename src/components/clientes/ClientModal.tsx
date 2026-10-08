'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/types/database.types';
import { User, Phone, FileText, X, Loader2, Check } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: { name: string; phone: string; notes: string }) => Promise<void>;
  initialClient?: Client | null;
}

export function ClientModal({
  isOpen,
  onClose,
  onSave,
  initialClient,
}: ClientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialClient) {
      setName(initialClient.name || '');
      setPhone(initialClient.phone || '');
      setNotes(initialClient.notes || '');
    } else {
      setName('');
      setPhone('');
      setNotes('');
    }
    setError(null);
  }, [initialClient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Por favor completa el nombre y teléfono del cliente.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Error guardando cliente:', err);
      setError(err?.message || 'Error al guardar los datos del cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-border-sora shadow-sora overflow-hidden">
        {/* Cabecera del modal */}
        <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/40">
          <div>
            <h3 className="font-serif font-bold text-lg text-text-sora">
              {initialClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
            <p className="text-xs text-text-sora/60 mt-0.5">
              {initialClient
                ? 'Actualiza los datos personales y preferencias'
                : 'Registra un cliente en el directorio de Sora'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
              Nombre Completo *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="Ej: Camila Valenzuela"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
              Teléfono / WhatsApp *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                placeholder="+56987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all"
              />
            </div>
            <p className="text-[11px] text-text-sora/50 mt-1">
              Ingresa el código de país (ej. +569...) para habilitar WhatsApp directo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
              Notas y Preferencias
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3.5 pointer-events-none text-text-sora/40">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={3}
                placeholder="Ej: Cliente frecuente de almuerzos, prefiere sin cebolla, alérgica a frutos secos..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all resize-none"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-4 border-t border-border-sora flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-text-sora/70 hover:bg-border-sora/30 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs font-semibold transition-all shadow-sm shadow-primary-sora/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{initialClient ? 'Actualizar Cliente' : 'Guardar Cliente'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
