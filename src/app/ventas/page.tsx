'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { createClient } from '@/lib/supabase/client';
import {
  Order,
  Client,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
} from '@/types/database.types';
import { formatCurrency, cleanPhoneNumber } from '@/lib/utils';
import {
  saveStoredOrders,
  getStoredOrders,
  getStoredClients,
  saveStoredClients,
  isValidUuid,
  generateUuid,
} from '@/lib/storage';
import { triggerKitchenAlert } from '@/lib/audioAlerts';
import { ProductionReminderAlerts } from '@/components/alerts/ProductionReminderAlerts';
import {
  ShoppingBag,
  Plus,
  Trash2,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  MessageCircle,
  Truck,
  CreditCard,
  Banknote,
  Search,
  AlertCircle,
  RefreshCw,
  Calendar,
  Flame,
  Bell,
  Sparkles,
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Plato Casero del Día', price: 350 },
  { name: 'Pollo Guisado con Arroz y Habichuelas', price: 375 },
  { name: 'Res Guisada Tradicional', price: 425 },
  { name: 'Chivo Liniero al Caldero', price: 550 },
  { name: 'Pescado con Coco Tradicional', price: 525 },
  { name: 'Lasaña Casera Horneada', price: 390 },
  { name: 'Porción Tostones / Ensalada', price: 150 },
  { name: 'Jugo Natural de Chinola / Frutas', price: 120 },
  { name: 'Postre Majarete / Dulce Casero', price: 150 },
];

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), []);

  // Clientes y Repartidores
  const [clients, setClients] = useState<Client[]>([]);
  const [deliveryDrivers, setDeliveryDrivers] = useState<{ id: string; name: string }[]>([]);

  // Estados del Formulario de Pedido
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'item-1',
      name: 'Plato Casero del Día',
      quantity: 1,
      price: 350,
      subtotal: 350,
    },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pagado');
  const [deliveryUserId, setDeliveryUserId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // HORARIO Y FECHA DE ENTREGA (NUEVO REQUERIMIENTO)
  const todayStr = new Date().toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState<string>(todayStr);
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [productionReminderTime, setProductionReminderTime] = useState<string>('60m');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Lista de pedidos reales
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Cargar datos (Supabase + Respaldo Local Auto-guardado)
  const loadData = async () => {
    setIsLoadingOrders(true);
    try {
      // 1. Cargar Clientes
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsData && clientsData.length > 0) {
        const { data: addressesData } = await supabase
          .from('client_addresses')
          .select('*');

        const merged = clientsData.map((c) => ({
          ...c,
          addresses: (addressesData || []).filter((a) => a.client_id === c.id),
        }));
        setClients(merged);
        saveStoredClients(merged);
      } else {
        const cachedClients = getStoredClients();
        if (cachedClients.length > 0) {
          setClients(cachedClients);
        }
      }

      // 2. Cargar Repartidores
      const { data: driversData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'delivery')
        .eq('is_active', true);

      if (driversData && driversData.length > 0) {
        setDeliveryDrivers(
          driversData.map((d) => ({
            id: d.id,
            name: d.full_name || 'Repartidor',
          }))
        );
      }

      // 3. Cargar Pedidos
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData as Order[]);
        saveStoredOrders(ordersData as Order[]);
      } else {
        const cachedOrders = getStoredOrders();
        if (cachedOrders.length > 0) {
          setOrders(cachedOrders);
        }
      }
    } catch (err) {
      console.warn('Cargando respaldo local de ventas');
      const cached = getStoredOrders();
      if (cached.length > 0) setOrders(cached);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const currentClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const availableAddresses = useMemo(
    () => currentClient?.addresses || [],
    [currentClient]
  );

  useEffect(() => {
    if (availableAddresses.length > 0) {
      const defaultAddr =
        availableAddresses.find((a) => a.is_default) || availableAddresses[0];
      setSelectedAddressId(defaultAddr.id);
    } else {
      setSelectedAddressId('');
    }
  }, [availableAddresses]);

  const currentAddress = useMemo(
    () => availableAddresses.find((a) => a.id === selectedAddressId) || null,
    [availableAddresses, selectedAddressId]
  );

  const handleItemChange = (
    index: number,
    field: 'name' | 'quantity' | 'price',
    value: any
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'name') {
      item.name = value;
      const matched = MENU_ITEMS.find((m) => m.name === value);
      if (matched) {
        item.price = matched.price;
      }
    } else if (field === 'quantity') {
      item.quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'price') {
      item.price = Math.max(0, parseFloat(value) || 0);
    }

    item.subtotal = item.quantity * item.price;
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = (dishName = '', price = 0) => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: dishName || 'Plato Casero Sora',
        quantity: 1,
        price: price || 350,
        subtotal: price || 350,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCalculated = useMemo(
    () => items.reduce((sum, item) => sum + item.subtotal, 0),
    [items]
  );

  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [clients, clientSearchQuery]);

  // Actualizar estado de una orden (por ejemplo 'En Preparacion' al iniciar producción)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const updatedList = orders.map((o) =>
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    setOrders(updatedList);
    saveStoredOrders(updatedList);

    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    } catch (e) {
      console.warn('Actualización local persistida');
    }
  };

  // 1. CREACIÓN DEL PEDIDO (GUARDADO AUTOMÁTICO PERSISTENTE)
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) {
      alert('Por favor selecciona un cliente para el pedido.');
      return;
    }

    setIsSubmitting(true);
    const orderNumber = `SORA-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverObj = deliveryDrivers.find((d) => d.id === deliveryUserId);
    const newOrderId = generateUuid();

    const newOrder: Order = {
      id: newOrderId,
      order_number: orderNumber,
      client_id: currentClient.id,
      client_name: currentClient.name,
      client_phone: currentClient.phone,
      address_id: currentAddress?.id,
      address_label: currentAddress?.label || 'Dirección',
      address: currentAddress?.address || 'Retiro en local',
      address_reference: currentAddress?.reference || undefined,
      latitude: currentAddress?.latitude,
      longitude: currentAddress?.longitude,
      items: items,
      total: totalCalculated,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      delivery_user_id: deliveryUserId || null,
      delivery_user_name: driverObj?.name || 'Por asignar',
      status: 'Pendiente',
      delivery_date: deliveryDate,
      delivery_time: deliveryTime || undefined,
      production_reminder_time: productionReminderTime,
      is_scheduled: isScheduled || deliveryDate > todayStr,
      notes: notes,
      created_at: new Date().toISOString(),
    };

    // 1. Guardar inmediatamente en almacenamiento local (cero pérdida de datos)
    const updatedList = [newOrder, ...orders];
    setOrders(updatedList);
    saveStoredOrders(updatedList);

    // 2. Enviar a Supabase con validación de tipos
    try {
      const supabasePayload: any = {
        id: newOrderId,
        order_number: orderNumber,
        client_name: currentClient.name,
        client_phone: currentClient.phone,
        address: currentAddress?.address || 'Retiro en local',
        address_label: currentAddress?.label || null,
        address_reference: currentAddress?.reference || null,
        latitude: currentAddress?.latitude || null,
        longitude: currentAddress?.longitude || null,
        items: items,
        total: totalCalculated,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: 'Pendiente',
        delivery_date: deliveryDate,
        delivery_time: deliveryTime || null,
        production_reminder_time: productionReminderTime,
        is_scheduled: isScheduled || deliveryDate > todayStr,
        notes: notes || null,
      };

      if (isValidUuid(currentClient.id)) supabasePayload.client_id = currentClient.id;
      if (currentAddress && isValidUuid(currentAddress.id)) supabasePayload.address_id = currentAddress.id;
      if (isValidUuid(deliveryUserId)) {
        supabasePayload.delivery_user_id = deliveryUserId;
        supabasePayload.delivery_user_name = driverObj?.name || null;
      }

      const { error } = await supabase.from('orders').insert([supabasePayload]);
      if (error) {
        console.warn('Nota Supabase orders:', error.message);
      }
    } catch (err) {
      console.warn('Orden guardada en caché local persistente');
    }

    // 3. Campana y vibración auditiva inmediata en cocina
    triggerKitchenAlert(
      '¡Nueva Orden en Cocina!',
      `Pedido #${orderNumber} para ${currentClient.name} (${formatCurrency(totalCalculated)}). Entrega: ${deliveryTime || 'Inmediata'}.`,
      'new_order',
      orderNumber
    );

    setIsSubmitting(false);
    setSuccessNotice(`¡Pedido #${orderNumber} creado y guardado automáticamente! 🔔 Campana de cocina activada.`);

    // Resetear formulario para el próximo pedido
    setItems([
      {
        id: `item-${Date.now()}`,
        name: 'Plato Casero del Día',
        quantity: 1,
        price: 350,
        subtotal: 350,
      },
    ]);
    setNotes('');
    setDeliveryTime('');
    setIsScheduled(false);

    setTimeout(() => {
      setSuccessNotice(null);
    }, 4500);
  };

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Módulo de Ventas
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Moneda: DOP (RD$)
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Creación y Despacho de Pedidos
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Registra pedidos, programa horarios de entrega con recordatorios automáticos de cocina y asigna repartidores.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoadingOrders}
            className="self-start sm:self-auto p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm flex items-center space-x-1.5"
            title="Refrescar pedidos y clientes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin text-primary-sora' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Notificación de Éxito */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-sm">{successNotice}</span>
          </div>
        )}

        {/* SISTEMA DE ALERTAS Y RECORDATORIOS DE PRODUCCIÓN */}
        <ProductionReminderAlerts
          orders={orders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* COLUMNA IZQUIERDA: FORMULARIO DE NUEVO PEDIDO */}
          <div className="lg:col-span-7 bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora">
            <div className="pb-4 border-b border-border-sora flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-sm">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-lg text-text-sora">
                    Nuevo Pedido
                  </h2>
                  <p className="text-xs text-text-sora/60">
                    Completar datos de entrega, platos y recordatorio de producción
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-5">
              {/* 1. SELECCIÓN DE CLIENTE */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                  1. Seleccionar Cliente *
                </label>

                {clients.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aún no hay clientes registrados en el directorio.</p>
                      <p className="mt-0.5 text-[11px]">
                        Ve a la pestaña <strong>Clientes</strong> para registrar el primero y asignarle dirección.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Filtrar por nombre o teléfono..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                      />
                    </div>

                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                    >
                      <option value="">-- Elige un cliente ({filteredClients.length}) --</option>
                      {filteredClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {currentClient && (
                  <div className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-primary-sora" />
                      <span className="font-semibold text-text-sora">{currentClient.name}</span>
                      <span className="text-text-sora/60">({currentClient.phone})</span>
                    </div>
                    {currentClient.notes && (
                      <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate max-w-xs">
                        {currentClient.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. DIRECCIÓN DE ENTREGA */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                  2. Dirección de Entrega
                </label>
                {availableAddresses.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-bg-sora/60 border border-border-sora text-text-sora/70 text-xs">
                    Sin direcciones guardadas. El pedido se marcará como <strong>Retiro en Local</strong>.
                  </div>
                ) : (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                  >
                    {availableAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        [{addr.label}] {addr.address} {addr.reference ? `(${addr.reference})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. HORARIO DE ENTREGA Y RECORDATORIO DE PRODUCCIÓN (REQUERIMIENTO PRINCIPAL) */}
              <div className="p-4 rounded-2xl bg-bg-sora/60 border border-border-sora space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-primary-sora" />
                    <span className="text-xs font-bold text-text-sora uppercase tracking-wider">
                      3. Horario y Programación de Entrega
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-text-sora/60 bg-white px-2 py-0.5 rounded-md border border-border-sora">
                    Alerta de Cocina
                  </span>
                </div>

                {/* Accesos rápidos de programación */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduled(false);
                      setDeliveryDate(todayStr);
                      setDeliveryTime('');
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      !isScheduled && deliveryDate === todayStr && !deliveryTime
                        ? 'bg-primary-sora text-white border-primary-sora shadow-xs'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    ⚡ Inmediata
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduled(true);
                      setDeliveryDate(todayStr);
                      setDeliveryTime('12:30');
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      isScheduled && deliveryDate === todayStr
                        ? 'bg-primary-sora text-white border-primary-sora shadow-xs'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    ⏰ Para Hoy a las...
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduled(true);
                      // Mañana
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setDeliveryDate(d.toISOString().split('T')[0]);
                      setDeliveryTime('13:00');
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      isScheduled && deliveryDate > todayStr
                        ? 'bg-primary-sora text-white border-primary-sora shadow-xs'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    📅 Días Futuros
                  </button>
                </div>

                {/* Campos de fecha y hora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-sora/70 mb-1">
                      Fecha de Entrega
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min={todayStr}
                        value={deliveryDate}
                        onChange={(e) => {
                          setDeliveryDate(e.target.value);
                          if (e.target.value > todayStr) setIsScheduled(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-xs focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-sora/70 mb-1">
                      Hora Prometida de Entrega
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        placeholder="Ej: 12:30"
                        className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-xs focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Botones rápidos de horas habituales de comida dominicana */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-text-sora/50 font-medium">Horas comunes:</span>
                  {['12:00', '12:30', '13:00', '13:30', '14:00', '19:30'].map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setDeliveryTime(th)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                        deliveryTime === th
                          ? 'bg-primary-sora text-white border-primary-sora'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>

                {/* Selector de Anticipación para Recordatorio de Producción */}
                <div className="pt-2 border-t border-border-sora/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-1.5 text-xs text-text-sora">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold text-[11px]">Recordatorio de Producción:</span>
                  </div>

                  <select
                    value={productionReminderTime}
                    onChange={(e) => setProductionReminderTime(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-border-sora bg-white text-text-sora text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary-sora"
                  >
                    <option value="30m">Avisar 30 min antes</option>
                    <option value="60m">Avisar 1 hora antes (Recomendado)</option>
                    <option value="120m">Avisar 2 horas antes</option>
                  </select>
                </div>
              </div>

              {/* 4. ITEMS Y PLATOS DEL PEDIDO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                    4. Platos del Menú *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Plato</span>
                  </button>
                </div>

                {/* Sugerencias Rápidas de Platos de Sora en DOP */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {MENU_ITEMS.slice(0, 4).map((dish) => (
                    <button
                      key={dish.name}
                      type="button"
                      onClick={() => handleAddItem(dish.name, dish.price)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-bg-sora hover:bg-border-sora/60 text-text-sora/80 border border-border-sora transition-colors"
                    >
                      + {dish.name} ({formatCurrency(dish.price)})
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-bg-sora/40 border border-border-sora grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-6 sm:col-span-7">
                        <input
                          type="text"
                          required
                          placeholder="Nombre del plato..."
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          list="sora-dishes"
                          className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora text-center focus:outline-none focus:ring-1 focus:ring-primary-sora font-bold"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          required
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora text-right focus:outline-none focus:ring-1 focus:ring-primary-sora font-mono"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end space-x-1">
                        <span className="text-xs font-bold text-text-sora font-mono">
                          {formatCurrency(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="text-text-sora/30 hover:text-red-500 disabled:opacity-20 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <datalist id="sora-dishes">
                  {MENU_ITEMS.map((m) => (
                    <option key={m.name} value={m.name} />
                  ))}
                </datalist>
              </div>

              {/* 5. TOTAL CALCULADO AUTOMÁTICAMENTE (DOP) */}
              <div className="p-4 rounded-2xl bg-primary-sora/10 border border-primary-sora/25 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-primary-sora uppercase tracking-wider">
                    Total a Cobrar
                  </span>
                  <p className="text-[11px] text-text-sora/60">
                    Calculado automáticamente ({items.reduce((acc, i) => acc + i.quantity, 0)} ítems)
                  </p>
                </div>
                <span className="font-serif text-2xl font-bold text-primary-sora">
                  {formatCurrency(totalCalculated)}
                </span>
              </div>

              {/* 6. MÉTODO Y ESTADO DE PAGO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-2 uppercase tracking-wider">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethod === 'efectivo'
                          ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethod === 'transferencia'
                          ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-2 uppercase tracking-wider">
                    Estado de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('pagado')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentStatus === 'pagado'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pagado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('cobrar_contra_entrega')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentStatus === 'cobrar_contra_entrega'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Contra Entrega</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 7. SELECTOR DE REPARTIDOR Y NOTAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                    Asignar Repartidor
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                      <Truck className="w-4 h-4" />
                    </div>
                    <select
                      value={deliveryUserId}
                      onChange={(e) => setDeliveryUserId(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                    >
                      <option value="">-- Sin asignar por ahora --</option>
                      {deliveryDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                    Notas de Cocina / Observaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Sin cebolla, extra salsa..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !currentClient}
                className="w-full py-3.5 rounded-2xl bg-primary-sora hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-md shadow-primary-sora/25 active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Bell className="w-4 h-4 animate-bounce" />
                <span>
                  {isSubmitting
                    ? 'Guardando pedido...'
                    : 'Guardar Pedido y Activar Timbre de Cocina 🔔'}
                </span>
              </button>
            </form>
          </div>

          {/* COLUMNA DERECHA: HISTORIAL DE PEDIDOS */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora">
              <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-text-sora">
                    Historial de Pedidos
                  </h3>
                  <p className="text-xs text-text-sora/60">
                    {orders.length} pedidos registrados (Autoguardado activo)
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Pendientes: {orders.filter((o) => (o.status || '').toLowerCase() === 'pendiente').length}
                </span>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
                  {orders.map((order) => {
                    const cleanPhone = cleanPhoneNumber(order.client_phone);
                    const whatsappMsg = encodeURIComponent(
                      `¡Hola ${order.client_name}! 🍲 Tu pedido #${order.order_number} en Sora Cocina Casera por un total de ${formatCurrency(order.total)} ha sido registrado exitosamente.${
                        order.delivery_time ? ` Entrega programada: ${order.delivery_time}.` : ''
                      }`
                    );

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-white border border-border-sora shadow-sm space-y-2.5 hover:border-primary-sora/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-primary-sora bg-bg-sora px-2 py-0.5 rounded-md border border-border-sora">
                              {order.order_number}
                            </span>
                            <span className="text-xs font-bold text-text-sora">
                              {order.client_name}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                              (order.status || '').toLowerCase() === 'entregado'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : (order.status || '').toLowerCase() === 'en preparacion'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Horario y Fecha Prometida */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-sora/80">
                          {order.delivery_time ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Entrega: {order.delivery_time}{' '}
                              {order.delivery_date && order.delivery_date !== todayStr
                                ? `(${order.delivery_date.split('-').slice(1).join('/')})`
                                : '(Hoy)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] text-text-sora/60">
                              <Clock className="w-3 h-3 mr-1" />
                              Entrega inmediata
                            </span>
                          )}

                          {order.delivery_user_name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-bg-sora text-text-sora/70 border border-border-sora text-[11px]">
                              <Truck className="w-3 h-3 mr-1" />
                              {order.delivery_user_name}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-text-sora/70 space-y-1">
                          <p className="flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-primary-sora flex-shrink-0" />
                            <span className="truncate">{order.address}</span>
                          </p>
                        </div>

                        {/* Total y Pago en DOP */}
                        <div className="flex items-center justify-between pt-1 border-t border-border-sora/60">
                          <div className="text-[11px]">
                            <span className="capitalize font-medium text-text-sora">
                              {order.payment_method} •{' '}
                            </span>
                            <span
                              className={
                                order.payment_status === 'pagado'
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-amber-600 font-semibold'
                              }
                            >
                              {order.payment_status === 'pagado' ? 'Pagado' : 'Contra entrega'}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-primary-sora font-mono">
                            {formatCurrency(parseFloat(order.total as any) || 0)}
                          </span>
                        </div>

                        <div className="pt-1">
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Notificar al Cliente (WhatsApp)</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-text-sora/50 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-text-sora/20" />
                  <p className="font-semibold text-text-sora/70">No hay pedidos registrados aún</p>
                  <p>Crea el primer pedido con el formulario de la izquierda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
