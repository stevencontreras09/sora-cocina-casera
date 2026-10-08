'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, cleanPhoneNumber } from '@/lib/utils';
import {
  Client,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
} from '@/types/database.types';
import {
  ShoppingBag,
  Plus,
  Trash2,
  User,
  MapPin,
  DollarSign,
  CreditCard,
  Banknote,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  Search,
  MessageCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// Carta sugerida con precios estándar en Pesos Dominicanos (DOP / RD$)
const MENU_ITEMS = [
  { name: 'Plato Casero del Día', price: 350 },
  { name: 'Pollo Guisado con Arroz y Habichuelas', price: 325 },
  { name: 'Mofongo con Chicharrón Casero', price: 450 },
  { name: 'Sancocho Tradicional con Arroz', price: 475 },
  { name: 'Chivo Liniero al Caldero', price: 550 },
  { name: 'Pescado con Coco Tradicional', price: 525 },
  { name: 'Lasaña Casera Horneada', price: 390 },
  { name: 'Porción Tostones / Ensalada', price: 150 },
  { name: 'Jugo Natural de Chinola / Frutas', price: 120 },
  { name: 'Postre Majarete / Dulce Casero', price: 150 },
];

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), []);

  // Clientes y Repartidores reales
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Lista limpia de pedidos reales
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Cargar datos reales desde Supabase
  const loadData = async () => {
    setIsLoadingOrders(true);
    try {
      // 1. Clientes y Direcciones
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsData) {
        const { data: addressesData } = await supabase
          .from('client_addresses')
          .select('*');

        const merged = clientsData.map((c) => ({
          ...c,
          addresses: (addressesData || []).filter((a) => a.client_id === c.id),
        }));
        setClients(merged);
      }

      // 2. Repartidores activos
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

      // 3. Pedidos creados en Supabase
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData as Order[]);
      }
    } catch (err) {
      console.warn('Carga inicial de ventas');
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) {
      alert('Por favor selecciona un cliente para el pedido.');
      return;
    }

    setIsSubmitting(true);
    const orderNumber = `SORA-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverObj = deliveryDrivers.find((d) => d.id === deliveryUserId);

    let createdId = `ord-${Date.now()}`;
    try {
      const { data } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            client_id: currentClient.id,
            client_name: currentClient.name,
            client_phone: currentClient.phone,
            address_id: currentAddress?.id || null,
            address_label: currentAddress?.label || null,
            address: currentAddress?.address || 'Retiro en local',
            address_reference: currentAddress?.reference || null,
            latitude: currentAddress?.latitude || null,
            longitude: currentAddress?.longitude || null,
            items: items,
            total: totalCalculated,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            delivery_user_id: deliveryUserId || null,
            delivery_user_name: driverObj?.name || null,
            status: 'Pendiente',
            notes: notes || null,
          },
        ])
        .select()
        .single();

      if (data) {
        createdId = data.id;
      }
    } catch (err) {
      console.warn('Pedido guardado localmente');
    }

    const newOrder: Order = {
      id: createdId,
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
      status: 'pendiente',
      notes: notes,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders([newOrder, ...orders]);
    setIsSubmitting(false);
    setSuccessNotice(`¡Pedido #${orderNumber} creado exitosamente en DOP!`);

    // Resetear formulario
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

    setTimeout(() => {
      setSuccessNotice(null);
    }, 4000);
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
              Registra pedidos, asigna repartidores y visualiza totales en pesos dominicanos.
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
                    Completar datos de despacho y platos solicitados
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
                        [{addr.label}] {addr.address} {addr.reference ? `(Ref: ${addr.reference})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {currentAddress && (
                  <div className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 font-medium text-text-sora">
                      <MapPin className="w-3.5 h-3.5 text-primary-sora flex-shrink-0" />
                      <span>{currentAddress.address}</span>
                    </div>
                    {currentAddress.reference && (
                      <p className="text-[11px] text-text-sora/60 pl-5">
                        <strong>Referencia:</strong> {currentAddress.reference}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. PLATOS Y PRECIOS EN DOP */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                    3. Platos y Cantidades (Precios en DOP) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-primary-sora hover:text-primary-hover py-1 px-2 rounded-lg hover:bg-primary-sora/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                {/* Carta rápida con precios en DOP */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] text-text-sora/50 uppercase font-semibold whitespace-nowrap">
                    Carta Rápida:
                  </span>
                  {MENU_ITEMS.slice(0, 5).map((dish) => (
                    <button
                      type="button"
                      key={dish.name}
                      onClick={() => handleAddItem(dish.name, dish.price)}
                      className="px-2.5 py-1.5 rounded-xl bg-bg-sora hover:bg-border-sora/50 border border-border-sora text-[11px] text-text-sora whitespace-nowrap transition-all font-medium"
                    >
                      + {dish.name.split(' ')[0]} {formatCurrency(dish.price)}
                    </button>
                  ))}
                </div>

                {/* Filas de Ítems */}
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl bg-bg-sora/40 border border-border-sora"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          list="sora-dishes"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Nombre del plato..."
                          className="w-full px-2.5 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora focus:outline-none focus:ring-1 focus:ring-primary-sora"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora text-center focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                        />
                      </div>

                      <div className="col-span-2">
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

              {/* 4. TOTAL CALCULADO AUTOMÁTICAMENTE (DOP) */}
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

              {/* 5. MÉTODO Y ESTADO DE PAGO */}
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

              {/* 6. SELECTOR DE REPARTIDOR */}
              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                  Asignar Repartidor Activo
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

              <button
                type="submit"
                disabled={isSubmitting || !currentClient}
                className="w-full py-3.5 rounded-2xl bg-primary-sora hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-md shadow-primary-sora/25 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando pedido...' : 'Crear Pedido en DOP (Estado: Pendiente)'}
              </button>
            </form>
          </div>

          {/* COLUMNA DERECHA: PEDIDOS REGISTRADOS */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora">
              <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-text-sora">
                    Historial de Pedidos
                  </h3>
                  <p className="text-xs text-text-sora/60">
                    {orders.length} pedidos registrados
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Pendientes: {orders.filter((o) => (o.status || '').toLowerCase() === 'pendiente').length}
                </span>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
                  {orders.map((order) => {
                    const cleanPhone = cleanPhoneNumber(order.client_phone);
                    const whatsappMsg = encodeURIComponent(
                      `¡Hola ${order.client_name}! 🍲 Tu pedido #${order.order_number} en Sora Cocina Casera por un total de ${formatCurrency(order.total)} ha sido ingresado exitosamente.`
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
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                            {order.status}
                          </span>
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
