'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/types/database.types';
import { MapLocationPicker } from '@/components/maps/MapLocationPicker';
import {
  User,
  Phone,
  FileText,
  MapPin,
  Home,
  Briefcase,
  Store,
  X,
  Loader2,
  Check,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export interface ClientAddressFormData {
  label: string;
  address: string;
  reference?: string;
  latitude: number | null;
  longitude: number | null;
  is_default?: boolean;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    clientData: { name: string; phone: string; notes: string },
    addressData?: ClientAddressFormData | null
  ) => Promise<void>;
  initialClient?: Client | null;
}

const PRESET_LABELS = ['Casa', 'Oficina', 'Negocio', 'Taller'];

export function ClientModal({
  isOpen,
  onClose,
  onSave,
  initialClient,
}: ClientModalProps) {
  // Datos personales del cliente
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Datos de la dirección (en la misma vista sin pestañas)
  const [includeAddress, setIncludeAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState('Casa');
  const [addressText, setAddressText] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDefaultAddress, setIsDefaultAddress] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialClient) {
      setName(initialClient.name || '');
      setPhone(initialClient.phone || '');
      setNotes(initialClient.notes || '');

      // Si el cliente ya tiene direcciones registradas, precargar la principal o primera
      const firstAddr =
        initialClient.addresses?.find((a) => a.is_default) ||
        initialClient.addresses?.[0];

      if (firstAddr) {
        setIncludeAddress(true);
        setAddressLabel(firstAddr.label || 'Casa');
        setAddressText(firstAddr.address || '');
        setAddressReference(firstAddr.reference || '');
        setLatitude(firstAddr.latitude);
        setLongitude(firstAddr.longitude);
        setIsDefaultAddress(!!firstAddr.is_default);
      } else {
        setIncludeAddress(false);
        setAddressLabel('Casa');
        setAddressText('');
        setAddressReference('');
        setLatitude(null);
        setLongitude(null);
        setIsDefaultAddress(true);
      }
    } else {
      // Nuevo cliente: resetear campos y habilitar dirección por defecto para conveniencia
      setName('');
      setPhone('');
      setNotes('');
      setIncludeAddress(true);
      setAddressLabel('Casa');
      setAddressText('');
      setAddressReference('');
      setLatitude(null);
      setLongitude(null);
      setIsDefaultAddress(true);
    }
    setError(null);
  }, [initialClient, isOpen]);

  if (!isOpen) return null;

  const handleLocationChange = (loc: {
    latitude: number;
    longitude: number;
    address?: string;
  }) => {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    if (loc.address) {
      setAddressText(loc.address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Por favor completa el nombre y teléfono del cliente.');
      return;
    }

    let addressData: ClientAddressFormData | null = null;
    if (includeAddress && addressText.trim()) {
      addressData = {
        label: addressLabel.trim() || 'Casa',
        address: addressText.trim(),
        reference: addressReference.trim() || undefined,
        latitude,
        longitude,
        is_default: isDefaultAddress,
      };
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(
        {
          name: name.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
        },
        addressData
      );
      onClose();
    } catch (err: any) {
      console.error('Error guardando cliente con dirección:', err);
      setError(err?.message || 'Error al guardar los datos del cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-border-sora shadow-sora overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-border-sora flex items-center justify-between bg-bg-sora/40 flex-shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                {initialClient ? 'Edición de Cliente' : 'Nuevo Cliente & Dirección'}
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-text-sora mt-0.5">
              {initialClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h3>
            <p className="text-xs text-text-sora/60">
              Ingresa los datos personales y la dirección de entrega en el mismo formulario.
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido unificado y scrolleable sin pestañas */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-border-sora/60">
                <User className="w-4 h-4 text-primary-sora" />
                <h4 className="font-serif font-bold text-sm text-text-sora">
                  1. Información Personal
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all font-medium"
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
                      placeholder="+18091234567 o 8091234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Notas y Preferencias (Cocina)
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3.5 pointer-events-none text-text-sora/40">
                    <FileText className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Ej: Sin cebolla, extra ensalada, cliente frecuente, alérgico al marisco..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DIRECCIÓN DE ENTREGA (EN LA MISMA VISTA) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-border-sora/60">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-primary-sora" />
                  <h4 className="font-serif font-bold text-sm text-text-sora">
                    2. Dirección de Entrega (Delivery)
                  </h4>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include_addr_check"
                    checked={includeAddress}
                    onChange={(e) => setIncludeAddress(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-sora focus:ring-primary-sora border-border-sora cursor-pointer"
                  />
                  <label
                    htmlFor="include_addr_check"
                    className="text-xs font-medium text-text-sora/80 cursor-pointer select-none"
                  >
                    Guardar dirección
                  </label>
                </div>
              </div>

              {includeAddress ? (
                <div className="space-y-4 bg-bg-sora/30 p-4 rounded-2xl border border-border-sora/80 animate-in fade-in duration-200">
                  {/* Presets de Etiqueta */}
                  <div>
                    <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                      Etiqueta de la Ubicación
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PRESET_LABELS.map((preset) => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => setAddressLabel(preset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            addressLabel === preset
                              ? 'bg-primary-sora text-white shadow-sm'
                              : 'bg-white text-text-sora/70 hover:bg-border-sora/30 border border-border-sora'
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
                      placeholder="O etiqueta personalizada (ej. Apartamento, Consultorio, Taller)"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                    />
                  </div>

                  {/* Selector y Búsqueda Google Maps */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                        Ubicación en Google Maps & GPS
                      </label>
                      {latitude && longitude ? (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Coordenadas GPS listas
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-sora/50 font-medium">
                          Opcional pero recomendado para optimizar rutas
                        </span>
                      )}
                    </div>
                    <MapLocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      address={addressText}
                      onChangeLocation={handleLocationChange}
                    />
                  </div>

                  {/* Dirección Textual */}
                  <div>
                    <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                      Dirección Textual (Calle, Número, Sector) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Av. 27 de Febrero esq. Winston Churchill, Edif. A..."
                        value={addressText}
                        onChange={(e) => setAddressText(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-white text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                      />
                    </div>
                  </div>

                  {/* Referencia para Motoristas */}
                  <div>
                    <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                      Referencia para Repartidores (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3.5 pointer-events-none text-text-sora/40">
                        <Compass className="w-4 h-4" />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Ej: Portón verde, segundo piso, tocar intercom 2B. Dejar con seguridad si no baja."
                        value={addressReference}
                        onChange={(e) => setAddressReference(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora resize-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-bg-sora/40 rounded-2xl border border-border-sora space-y-1">
                  <p className="text-xs text-text-sora/60">
                    Sin dirección asignada en este momento.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIncludeAddress(true)}
                    className="text-xs font-semibold text-primary-sora hover:underline"
                  >
                    + Activar dirección de entrega ahora
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Acciones del pie de formulario */}
          <div className="px-6 py-4 border-t border-border-sora bg-bg-sora/30 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-text-sora/60">
              {includeAddress && addressText.trim()
                ? '✓ Se guardará el cliente y su dirección'
                : 'Solo se guardarán datos personales'}
            </span>

            <div className="flex items-center space-x-2">
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
                    <span>
                      {includeAddress && addressText.trim()
                        ? initialClient
                          ? 'Guardar Cambios y Dirección'
                          : 'Guardar Cliente y Dirección'
                        : initialClient
                        ? 'Actualizar Cliente'
                        : 'Guardar Cliente'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
