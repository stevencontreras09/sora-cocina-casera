'use client';

import React, { useState, useEffect } from 'react';
import { ClientAddress } from '@/types/database.types';
import { MapLocationPicker } from '@/components/maps/MapLocationPicker';
import {
  MapPin,
  Tag,
  Home,
  Briefcase,
  Store,
  FileText,
  X,
  Loader2,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  initialAddress?: ClientAddress | null;
  onSave: (
    addressData: {
      label: string;
      address: string;
      reference?: string;
      latitude: number | null;
      longitude: number | null;
      is_default?: boolean;
    }
  ) => Promise<void>;
}

const PRESET_LABELS = ['Casa', 'Oficina', 'Negocio', 'Taller'];

export function AddressModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  initialAddress,
  onSave,
}: AddressModalProps) {
  const [label, setLabel] = useState('Casa');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAddress) {
      setLabel(initialAddress.label || 'Casa');
      setAddress(initialAddress.address || '');
      setReference(initialAddress.reference || '');
      setLatitude(initialAddress.latitude);
      setLongitude(initialAddress.longitude);
      setIsDefault(!!initialAddress.is_default);
    } else {
      setLabel('Casa');
      setAddress('');
      setReference('');
      setLatitude(null);
      setLongitude(null);
      setIsDefault(false);
    }
    setError(null);
  }, [initialAddress, isOpen]);

  if (!isOpen) return null;

  const handleLocationChange = (location: {
    latitude: number;
    longitude: number;
    address?: string;
  }) => {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    if (location.address) {
      setAddress(location.address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Por favor define una etiqueta (ej. Casa, Oficina).');
      return;
    }
    if (!address.trim()) {
      setError('Por favor ingresa o busca la dirección en el mapa.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        label: label.trim(),
        address: address.trim(),
        reference: reference.trim() || undefined,
        latitude,
        longitude,
        is_default: isDefault,
      });
      onClose();
    } catch (err: any) {
      console.error('Error guardando dirección:', err);
      setError(err?.message || 'Error al guardar la dirección.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-border-sora shadow-sora overflow-hidden my-6">
        {/* Cabecera del Modal */}
        <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-sora/10 text-primary-sora font-semibold">
                {clientName}
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-text-sora mt-1">
              {initialAddress ? 'Editar Dirección' : 'Agregar Nueva Dirección'}
            </h3>
            <p className="text-xs text-text-sora/60 mt-0.5">
              Geolocalización exacta para repartos y rutas optimizadas
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          {/* Etiqueta / Nombre de la Ubicación */}
          <div>
            <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
              Etiqueta de la Ubicación *
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_LABELS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setLabel(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    label === preset
                      ? 'bg-primary-sora text-white shadow-sm'
                      : 'bg-bg-sora/80 text-text-sora/70 hover:bg-bg-sora border border-border-sora'
                  }`}
                >
                  {preset === 'Casa' && <Home className="w-3.5 h-3.5 inline mr-1" />}
                  {preset === 'Oficina' && <Briefcase className="w-3.5 h-3.5 inline mr-1" />}
                  {preset === 'Negocio' && <Store className="w-3.5 h-3.5 inline mr-1" />}
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="O escribe una etiqueta personalizada (ej. Casa de Verano, Taller)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
            />
          </div>

          {/* Componente MapLocationPicker con Google Maps & Places */}
          <div className="pt-1">
            <MapLocationPicker
              latitude={latitude}
              longitude={longitude}
              address={address}
              onChangeLocation={handleLocationChange}
            />
          </div>

          {/* Dirección Textual */}
          <div>
            <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
              Dirección Textual *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="Av. Providencia 1234, Depto 501..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
              />
            </div>
          </div>

          {/* Campo de Referencia para el Repartidor */}
          <div>
            <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
              Referencia de Entrega (Instrucciones para el Repartidor)
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3.5 pointer-events-none text-text-sora/40">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                placeholder="Ej: Casa blanca, rejas negras, timbre al fondo. Si no contesta, dejar con conserje Don Luis."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora resize-none"
              />
            </div>
          </div>

          {/* Checkbox Dirección Principal */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="is_default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-primary-sora focus:ring-primary-sora border-border-sora"
            />
            <label htmlFor="is_default" className="text-xs text-text-sora/80 font-medium select-none cursor-pointer">
              Marcar como dirección predeterminada de este cliente
            </label>
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
                  <span>{initialAddress ? 'Guardar Cambios' : 'Guardar Dirección'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
