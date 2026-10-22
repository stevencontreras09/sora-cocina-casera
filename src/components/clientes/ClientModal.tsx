'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/types/database.types';
import { MapLocationPicker } from '@/components/maps/MapLocationPicker';
import { SORA_KITCHEN_COORDS } from '@/lib/routeOptimizer';
import { extractWhatsAppMessage } from '@/lib/storage';
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
  Sparkles,
  MessageCircle,
  Truck,
  ArrowRight,
  ClipboardPaste,
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
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [includeAddress, setIncludeAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState('Casa');
  const [addressText, setAddressText] = useState('');
  const [addressReference, setAddressReference] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDefaultAddress, setIsDefaultAddress] = useState(true);

  // Extractor inteligente de WhatsApp
  const [whatsappText, setWhatsappText] = useState('');
  const [showExtractor, setShowExtractor] = useState(false);
  const [extractorSuccess, setExtractorSuccess] = useState<string | null>(null);

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
        const isPickup =
          firstAddr.label?.toLowerCase().includes('retiro') ||
          firstAddr.address?.toLowerCase().includes('retiro en local');
        setDeliveryMode(isPickup ? 'pickup' : 'delivery');
        setIncludeAddress(true);
        setAddressLabel(firstAddr.label || 'Casa');
        setAddressText(firstAddr.address || '');
        setAddressReference(firstAddr.reference || '');
        setLatitude(firstAddr.latitude);
        setLongitude(firstAddr.longitude);
        setIsDefaultAddress(!!firstAddr.is_default);
      } else {
        setDeliveryMode('delivery');
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
      setDeliveryMode('delivery');
      setIncludeAddress(true);
      setAddressLabel('Casa');
      setAddressText('');
      setAddressReference('');
      setLatitude(null);
      setLongitude(null);
      setIsDefaultAddress(true);
      setWhatsappText('');
      setShowExtractor(false);
    }
    setError(null);
  }, [initialClient, isOpen]);

  const handleExtractWhatsApp = () => {
    if (!whatsappText.trim()) return;
    const res = extractWhatsAppMessage(whatsappText);
    let count = 0;
    if (res.name) {
      setName(res.name);
      count++;
    }
    if (res.phone) {
      setPhone(res.phone);
      count++;
    }
    if (res.address) {
      setAddressText(res.address);
      count++;
    }
    if (res.reference) {
      setAddressReference(res.reference);
      count++;
    }
    if (res.isPickup) {
      setDeliveryMode('pickup');
      count++;
    }

    setExtractorSuccess(
      count > 0
        ? `¡Datos detectados y rellenados automáticamente! (${count} campos actualizados)`
        : 'Texto analizado. Revisa los campos y completa cualquier dato faltante.'
    );
    setTimeout(() => setExtractorSuccess(null), 3500);
  };

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
    if (deliveryMode === 'pickup') {
      addressData = {
        label: 'Retiro en Local',
        address: SORA_KITCHEN_COORDS.address || 'Sora Cocina Casera (Retiro en Local)',
        reference: 'Cliente habitual de Mostrador / Pickup',
        latitude: SORA_KITCHEN_COORDS.lat,
        longitude: SORA_KITCHEN_COORDS.lng,
        is_default: true,
      };
    } else if (includeAddress && addressText.trim()) {
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

            {/* BOTÓN / PANEL EXTRACTOR DE MENSAJE DE WHATSAPP */}
            <div className="rounded-2xl border border-primary-sora/30 bg-gradient-to-r from-primary-sora/10 via-amber-500/5 to-white p-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-sora text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-text-sora">
                      ¿El cliente te escribió por WhatsApp?
                    </h5>
                    <p className="text-[10px] text-text-sora/60">
                      Pega su mensaje para extraer su nombre, teléfono y dirección automáticamente
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtractor(!showExtractor)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-border-sora text-[11px] font-semibold text-text-sora hover:bg-bg-sora shadow-2xs"
                >
                  {showExtractor ? 'Ocultar' : 'Pegar WhatsApp'}
                </button>
              </div>

              {showExtractor && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <textarea
                    rows={3}
                    placeholder="Pega aquí el mensaje de WhatsApp. Ej: 'Hola soy Carlos Peña 829-555-1234, quiero una lasaña para llevar a la Calle Carmen Mendoza #12, Apto 3B'..."
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border-sora bg-white text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleExtractWhatsApp}
                      disabled={!whatsappText.trim()}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary-sora text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-xs disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analizar y Auto-llenar Campos</span>
                    </button>
                    {whatsappText && (
                      <button
                        type="button"
                        onClick={() => setWhatsappText('')}
                        className="text-[11px] text-text-sora/50 hover:text-text-sora"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
              )}

              {extractorSuccess && (
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-semibold flex items-center space-x-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{extractorSuccess}</span>
                </div>
              )}
            </div>

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

            {/* SECCIÓN 2: MODALIDAD DE ENTREGA / RETIRO EN LOCAL */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-border-sora/60">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-primary-sora" />
                  <h4 className="font-serif font-bold text-sm text-text-sora">
                    2. Modalidad de Entrega / Dirección
                  </h4>
                </div>
              </div>

              {/* Selector de Modalidad: Delivery vs Solo Pickup */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMode('delivery');
                    setIncludeAddress(true);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-2.5 ${
                    deliveryMode === 'delivery'
                      ? 'bg-primary-sora/10 border-primary-sora text-primary-sora font-semibold shadow-xs'
                      : 'bg-white border-border-sora text-text-sora/70 hover:bg-bg-sora'
                  }`}
                >
                  <Truck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">🛵 Entrega a Domicilio</span>
                    <span className="text-[10px] text-text-sora/50 font-normal">Con mapa GPS y dirección</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMode('pickup')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-2.5 ${
                    deliveryMode === 'pickup'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold shadow-xs'
                      : 'bg-white border-border-sora text-text-sora/70 hover:bg-bg-sora'
                  }`}
                >
                  <Store className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold block">🏪 Solo Retiro en Local</span>
                    <span className="text-[10px] text-text-sora/50 font-normal">Sin mapa ni dirección de envío</span>
                  </div>
                </button>
              </div>

              {deliveryMode === 'pickup' ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center space-x-2 font-bold text-emerald-900">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Cliente de Mostrador (Solo Pickup)</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Este cliente retirará sus órdenes directamente en el mostrador de <strong>Cocina Sora</strong>. No requiere registro de calles, GPS ni costo de delivery.
                  </p>
                  <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200/60 text-[11px] text-emerald-900 font-medium">
                    📍 Ubicación asignada: {SORA_KITCHEN_COORDS.address}
                  </div>
                </div>
              ) : includeAddress ? (
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
                    Sin dirección domiciliaria asignada en este momento.
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
