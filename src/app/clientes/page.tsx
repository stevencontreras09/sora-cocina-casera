'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { Client, ClientAddress } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { ClientModal } from '@/components/clientes/ClientModal';
import { AddressModal } from '@/components/clientes/AddressModal';
import { cleanPhoneNumber } from '@/lib/utils';
import {
  saveStoredClients,
  getStoredClients,
  isValidUuid,
  generateUuid,
} from '@/lib/storage';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Home,
  Briefcase,
  Store,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function ClientesPage() {
  const { role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Lista con respaldo de autoguardado
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estados de Modales
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [activeClientForAddress, setActiveClientForAddress] = useState<Client | null>(null);
  const [editingAddress, setEditingAddress] = useState<ClientAddress | null>(null);

  // Cargar clientes con combinación inteligente que PRESERVA todas las direcciones locales
  const fetchClients = async () => {
    try {
      setIsLoading(true);

      // Carga inmediata de respaldo para que la UI nunca esté vacía
      const localCached = getStoredClients();
      if (localCached.length > 0) {
        setClients(localCached);
      }

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (!clientsError && clientsData) {
        const { data: addressesData } = await supabase
          .from('client_addresses')
          .select('*')
          .order('created_at');

        const freshCached = getStoredClients();

        // 1. Mapear clientes de Supabase fusionando direcciones para no perder las guardadas localmente
        const combined = clientsData.map((client) => {
          const supabaseAddresses = (addressesData || []).filter(
            (addr) => addr.client_id === client.id
          );
          // Buscar si en caché local hay direcciones para este cliente que falten en Supabase
          const localClient = freshCached.find(
            (c) => c.id === client.id || c.name.toLowerCase() === client.name.toLowerCase()
          );
          const localAddresses = (localClient?.addresses || []).filter(
            (la) => !supabaseAddresses.some((sa) => sa.id === la.id || sa.address === la.address)
          );

          return {
            ...client,
            addresses: [...supabaseAddresses, ...localAddresses],
          };
        });

        // 2. Preservar clientes que se crearon localmente y aún no están en Supabase
        const localOnlyClients = freshCached.filter(
          (lc) => !clientsData.some((sc) => sc.id === lc.id || sc.name.toLowerCase() === lc.name.toLowerCase())
        );

        const mergedAll = [...combined, ...localOnlyClients];
        setClients(mergedAll);
        saveStoredClients(mergedAll);
      } else {
        const cachedFallback = getStoredClients();
        if (cachedFallback.length > 0) {
          setClients(cachedFallback);
        }
      }
    } catch (err) {
      console.warn('Cargando directorio desde respaldo seguro', err);
      const cached = getStoredClients();
      if (cached.length > 0) setClients(cached);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // 1. Guardar Cliente (Crear o Actualizar con Autoguardado)
  const handleSaveClient = async (clientData: {
    name: string;
    phone: string;
    notes: string;
  }) => {
    if (editingClient) {
      const updatedList = clients.map((c) =>
        c.id === editingClient.id ? { ...c, ...clientData } : c
      );
      setClients(updatedList);
      saveStoredClients(updatedList);

      try {
        if (isValidUuid(editingClient.id)) {
          await supabase
            .from('clients')
            .update({
              name: clientData.name,
              phone: clientData.phone,
              notes: clientData.notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingClient.id);
        }
      } catch (err) {
        console.warn('Actualizado en respaldo local');
      }

      showFeedback('Cliente actualizado correctamente');
    } else {
      const newClientId = generateUuid();
      const newClient: Client = {
        id: newClientId,
        name: clientData.name,
        phone: clientData.phone,
        notes: clientData.notes,
        addresses: [],
      };

      const updatedList = [newClient, ...clients];
      setClients(updatedList);
      saveStoredClients(updatedList);

      try {
        await supabase
          .from('clients')
          .insert([
            {
              id: newClientId,
              name: clientData.name,
              phone: clientData.phone,
              notes: clientData.notes,
            },
          ]);
      } catch (err) {
        console.warn('Cliente guardado en respaldo local');
      }

      showFeedback('Nuevo cliente registrado y guardado automáticamente');
    }
  };

  // 2. Eliminar Cliente
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente y sus direcciones?')) {
      return;
    }

    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);
    saveStoredClients(updated);

    try {
      if (isValidUuid(clientId)) {
        await supabase.from('clients').delete().eq('id', clientId);
      }
    } catch (err) {
      console.warn('Eliminado local');
    }

    showFeedback('Cliente eliminado');
  };

  // 3. Guardar Dirección
  const handleSaveAddress = async (addressData: {
    label: string;
    address: string;
    reference?: string;
    latitude: number | null;
    longitude: number | null;
    is_default?: boolean;
  }) => {
    if (!activeClientForAddress) return;

    if (editingAddress) {
      const updatedClients = clients.map((c) => {
        if (c.id !== activeClientForAddress.id) return c;
        const updatedAddresses = (c.addresses || []).map((a) =>
          a.id === editingAddress.id ? { ...a, ...addressData } : a
        );
        return { ...c, addresses: updatedAddresses };
      });
      setClients(updatedClients);
      saveStoredClients(updatedClients);

      try {
        if (isValidUuid(editingAddress.id)) {
          await supabase
            .from('client_addresses')
            .update({
              label: addressData.label,
              address: addressData.address,
              reference: addressData.reference,
              latitude: addressData.latitude,
              longitude: addressData.longitude,
              is_default: addressData.is_default,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingAddress.id);
        }
      } catch (err) {
        console.warn('Actualización local de dirección');
      }

      showFeedback('Dirección actualizada');
    } else {
      const newAddrId = generateUuid();
      const newAddress: ClientAddress = {
        id: newAddrId,
        client_id: activeClientForAddress.id,
        label: addressData.label,
        address: addressData.address,
        reference: addressData.reference,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        is_default: addressData.is_default,
      };

      const updatedClients = clients.map((c) => {
        if (c.id !== activeClientForAddress.id) return c;
        return {
          ...c,
          addresses: [...(c.addresses || []), newAddress],
        };
      });
      setClients(updatedClients);
      saveStoredClients(updatedClients);

      try {
        // Asegurar que el cliente exista en Supabase primero para evitar error de clave foránea
        if (isValidUuid(activeClientForAddress.id)) {
          await supabase.from('clients').upsert([
            {
              id: activeClientForAddress.id,
              name: activeClientForAddress.name,
              phone: activeClientForAddress.phone,
              notes: activeClientForAddress.notes || null,
            },
          ]);
        }

        const payload: any = {
          id: newAddrId,
          label: addressData.label,
          address: addressData.address,
          reference: addressData.reference || null,
          latitude: addressData.latitude || null,
          longitude: addressData.longitude || null,
          is_default: addressData.is_default || false,
        };
        if (isValidUuid(activeClientForAddress.id)) {
          payload.client_id = activeClientForAddress.id;
        }
        const { error: insertErr } = await supabase.from('client_addresses').insert([payload]);
        if (insertErr) {
          console.warn('Nota Supabase client_addresses:', insertErr.message);
        }
      } catch (err) {
        console.warn('Dirección guardada en respaldo local persistente');
      }

      showFeedback(`Nueva dirección guardada exitosamente para ${activeClientForAddress.name}`);
    }
  };

  // 4. Eliminar Dirección
  const handleDeleteAddress = async (clientId: string, addressId: string) => {
    if (!confirm('¿Deseas eliminar esta dirección?')) return;

    const updated = clients.map((c) => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        addresses: (c.addresses || []).filter((a) => a.id !== addressId),
      };
    });
    setClients(updated);
    saveStoredClients(updated);

    try {
      if (isValidUuid(addressId)) {
        await supabase.from('client_addresses').delete().eq('id', addressId);
      }
    } catch (err) {
      console.warn('Eliminado local');
    }

    showFeedback('Dirección eliminada');
  };

  const filteredClients = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return clients;

    return clients.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchNotes = c.notes?.toLowerCase().includes(q);
      const matchAddress = c.addresses?.some(
        (a) =>
          a.address.toLowerCase().includes(q) ||
          a.label.toLowerCase().includes(q) ||
          a.reference?.toLowerCase().includes(q)
      );
      return matchName || matchPhone || matchNotes || matchAddress;
    });
  }, [clients, searchTerm]);

  const totalAddresses = clients.reduce(
    (acc, curr) => acc + (curr.addresses?.length || 0),
    0
  );

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Directorio & Geolocalización
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Optimizado para iPad, PC y Móvil
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Clientes y Direcciones de Entrega
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Registra clientes, múltiples ubicaciones en Google Maps y contacta por WhatsApp.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchClients}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
            <button
              onClick={() => {
                setEditingClient(null);
                setIsClientModalOpen(true);
              }}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs sm:text-sm font-semibold transition-all shadow-md shadow-primary-sora/20 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {/* Notificación de feedback */}
        {feedbackMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2 border transition-all animate-in fade-in ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Barra de Búsqueda y Métricas (Adaptado a iPad/Tablet) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, teléfono, notas o dirección..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border-sora bg-white text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora shadow-sm"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-border-sora shadow-sm flex items-center justify-between">
            <span className="text-xs text-text-sora/60">Total Clientes</span>
            <span className="text-lg font-bold text-text-sora">{clients.length}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-border-sora shadow-sm flex items-center justify-between">
            <span className="text-xs text-text-sora/60">Direcciones Mapeadas</span>
            <span className="text-lg font-bold text-primary-sora">{totalAddresses}</span>
          </div>
        </div>

        {/* Lista de Tarjetas de Clientes (Grid ergonómico para iPad y PC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredClients.map((client) => {
            const cleanPhone = cleanPhoneNumber(client.phone);
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `Hola ${client.name}, te escribimos de Sora Cocina Casera...`
            )}`;

            return (
              <div
                key={client.id}
                className="bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora flex flex-col justify-between hover:shadow-sora-hover transition-all"
              >
                <div>
                  {/* Encabezado del Cliente */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-border-sora/80 gap-2">
                    <div className="min-w-0">
                      <h2 className="font-serif font-bold text-lg sm:text-xl text-text-sora truncate">
                        {client.name}
                      </h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <a
                          href={`tel:${client.phone}`}
                          className="text-xs text-text-sora/70 hover:text-primary-sora flex items-center font-medium transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1 text-primary-sora" />
                          <span>{client.phone}</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {/* Botón WhatsApp Directo */}
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                        title={`Escribir a ${client.name} por WhatsApp`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      {/* Botón Editar */}
                      <button
                        onClick={() => {
                          setEditingClient(client);
                          setIsClientModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-text-sora/60 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notas y Preferencias */}
                  {client.notes && (
                    <div className="my-3 p-3 rounded-2xl bg-bg-sora/70 border border-border-sora text-xs">
                      <div className="flex items-center space-x-1 text-text-sora/50 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                        <FileText className="w-3 h-3" />
                        <span>Preferencias & Notas</span>
                      </div>
                      <p className="text-text-sora/80 leading-relaxed italic">
                        "{client.notes}"
                      </p>
                    </div>
                  )}

                  {/* Direcciones del Cliente */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-sora/70 uppercase tracking-wider">
                        Direcciones ({client.addresses?.length || 0})
                      </span>
                      <button
                        onClick={() => {
                          setActiveClientForAddress(client);
                          setEditingAddress(null);
                          setIsAddressModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-primary-sora hover:text-primary-hover transition-colors py-1 px-2 rounded-lg hover:bg-primary-sora/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Dirección</span>
                      </button>
                    </div>

                    {(!client.addresses || client.addresses.length === 0) && (
                      <p className="text-xs text-text-sora/40 py-2 italic">
                        Sin direcciones registradas aún. Haz clic en "Agregar Dirección" para mapear la ubicación.
                      </p>
                    )}

                    <div className="space-y-2.5">
                      {client.addresses?.map((addr) => (
                        <div
                          key={addr.id}
                          className="p-3.5 rounded-2xl bg-white border border-border-sora/90 shadow-sm space-y-2 hover:border-primary-sora/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-bg-sora text-primary-sora border border-border-sora">
                                {addr.label === 'Casa' && <Home className="w-3 h-3 mr-1" />}
                                {addr.label === 'Oficina' && <Briefcase className="w-3 h-3 mr-1" />}
                                {addr.label === 'Negocio' && <Store className="w-3 h-3 mr-1" />}
                                {addr.label}
                              </span>
                              {addr.is_default && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                                  Principal
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setActiveClientForAddress(client);
                                  setEditingAddress(addr);
                                  setIsAddressModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
                                title="Editar dirección"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(client.id, addr.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar dirección"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-start space-x-1.5 text-xs text-text-sora">
                            <MapPin className="w-3.5 h-3.5 text-primary-sora flex-shrink-0 mt-0.5" />
                            <span className="font-medium leading-snug">{addr.address}</span>
                          </div>

                          {addr.reference && (
                            <p className="text-[11px] text-text-sora/60 bg-bg-sora/50 px-2.5 py-1.5 rounded-xl border border-border-sora/50">
                              <strong className="text-text-sora/70 font-semibold">Ref: </strong>
                              {addr.reference}
                            </p>
                          )}

                          {addr.latitude !== null && addr.longitude !== null && (
                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <span className="font-mono text-text-sora/50 text-[10px]">
                                GPS: {addr.latitude?.toFixed(4)}, {addr.longitude?.toFixed(4)}
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-sora hover:text-primary-hover font-semibold inline-flex items-center transition-colors"
                              >
                                <span>Ver en Maps</span>
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="p-12 text-center bg-white/80 rounded-3xl border border-border-sora shadow-sm space-y-3">
            <Users className="w-12 h-12 mx-auto text-text-sora/30" />
            <h3 className="text-base font-bold text-text-sora">
              No hay clientes registrados aún
            </h3>
            <p className="text-xs text-text-sora/60 max-w-sm mx-auto">
              Comienza a construir el directorio de clientes de Sora para gestionar direcciones de entrega.
            </p>
            <button
              onClick={() => {
                setEditingClient(null);
                setIsClientModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Primer Cliente</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal para Crear / Editar Cliente */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        initialClient={editingClient}
        onSave={handleSaveClient}
      />

      {/* Modal para Crear / Editar Dirección con MapLocationPicker */}
      {activeClientForAddress && (
        <AddressModal
          isOpen={isAddressModalOpen}
          onClose={() => {
            setIsAddressModalOpen(false);
            setActiveClientForAddress(null);
            setEditingAddress(null);
          }}
          clientId={activeClientForAddress.id}
          clientName={activeClientForAddress.name}
          initialAddress={editingAddress}
          onSave={handleSaveAddress}
        />
      )}
    </AppNavigation>
  );
}
