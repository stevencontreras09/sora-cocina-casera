'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  Client,
  ClientAddress,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
  Profile,
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
  ChefHat,
  Receipt,
  AlertCircle,
  FileText,
} from 'lucide-react';

// Platos tradicionales de la carta de Sora Cocina Casera para selección rápida
const MENU_ITEMS = [
  { name: 'Pastel de Choclo Casero', price: 9500 },
  { name: 'Cazuela de Vacuno con Choclo y Zapallo', price: 8900 },
  { name: 'Plateada al Horno con Puré Rústico', price: 10900 },
  { name: 'Porotos Granados con Mazamorra', price: 7900 },
  { name: 'Lasaña Bolognesa Casera Familiar', price: 8900 },
  { name: 'Merluza Austral Frita con Ensalada a la Chilena', price: 9200 },
  { name: 'Ensalada a la Chilena Tradicional', price: 3500 },
  { name: 'Pan Amasado Casero (Bolsa 4 unid.)', price: 2500 },
  { name: 'Mote con Huesillo Tradicional (500cc)', price: 2900 },
  { name: 'Leche Asada de Campo', price: 2900 },
];

const INITIAL_DEMO_CLIENTS: Client[] = [
  {
    id: 'cli-001',
    name: 'Camila Valenzuela',
    phone: '+56987654321',
    addresses: [
      {
        id: 'addr-001',
        client_id: 'cli-001',
        label: 'Casa',
        address: 'Av. Andrés Bello 2457, Depto 604, Providencia',
        reference: 'Edificio ladrillo, timbre 604',
        latitude: -33.4215,
        longitude: -70.6128,
      },
      {
        id: 'addr-002',
        client_id: 'cli-001',
        label: 'Oficina',
        address: 'Av. El Bosque Norte 0123, Oficina 401, Las Condes',
        reference: 'Torre Costanera, piso 4',
        latitude: -33.4172,
        longitude: -70.5985,
      },
    ],
  },
  {
    id: 'cli-002',
    name: 'Felipe Contreras',
    phone: '+56976543210',
    addresses: [
      {
        id: 'addr-003',
        client_id: 'cli-002',
        label: 'Casa',
        address: 'Calle Rancagua 0180, Providencia',
        reference: 'Casa blanca, rejas negras',
        latitude: -33.4411,
        longitude: -70.6318,
      },
    ],
  },
  {
    id: 'cli-003',
    name: 'Mariana Henríquez',
    phone: '+56965432109',
    addresses: [
      {
        id: 'addr-004',
        client_id: 'cli-003',
        label: 'Negocio',
        address: 'Av. Italia 1580, Local 3, Ñuñoa',
        reference: 'Local de cerámica artesanal',
        latitude: -33.4485,
        longitude: -70.6247,
      },
    ],
  },
];

const INITIAL_DEMO_DRIVERS: { id: string; name: string }[] = [
  { id: 'drv-01', name: 'Pedro Valdés (Repartidor Móvil #1)' },
  { id: 'drv-02', name: 'Matías Osorio (Repartidor Móvil #2)' },
  { id: 'drv-03', name: 'Cristóbal Silva (Repartidor Moto)' },
];

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), []);

  // Clientes y Repartidores
  const [clients, setClients] = useState<Client[]>(INITIAL_DEMO_CLIENTS);
  const [deliveryDrivers, setDeliveryDrivers] = useState(INITIAL_DEMO_DRIVERS);

  // Estados del Formulario de Pedido
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'item-1',
      name: 'Pastel de Choclo Casero',
      quantity: 1,
      price: 9500,
      subtotal: 9500,
    },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pagado');
  const [deliveryUserId, setDeliveryUserId] = useState<string>('drv-01');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Historial de Pedidos Creados
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ord-1043',
      order_number: 'SORA-1043',
      client_id: 'cli-001',
      client_name: 'Camila Valenzuela',
      client_phone: '+56987654321',
      address_label: 'Casa',
      address: 'Av. Andrés Bello 2457, Depto 604, Providencia',
      address_reference: 'Edificio ladrillo, timbre 604',
      items: [
        {
          id: '1',
          name: 'Pastel de Choclo Casero',
          quantity: 2,
          price: 9500,
          subtotal: 19000,
        },
        {
          id: '2',
          name: 'Mote con Huesillo Tradicional (500cc)',
          quantity: 2,
          price: 2900,
          subtotal: 5800,
        },
      ],
      total: 24800,
      payment_method: 'transferencia',
      payment_status: 'pagado',
      delivery_user_name: 'Pedro Valdés (Repartidor Móvil #1)',
      status: 'pendiente',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Cargar clientes y usuarios delivery de Supabase
  useEffect(() => {
    async function loadData() {
      try {
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
        }

        const { data: driversData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'delivery');

        if (driversData && driversData.length > 0) {
          setDeliveryDrivers(
            driversData.map((d) => ({
              id: d.id,
              name: d.full_name || 'Repartidor',
            }))
          );
        }
      } catch (err) {
        console.warn('Usando catálogo local');
      }
    }
    loadData();
  }, [supabase]);

  // Cliente seleccionado actual
  const currentClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  // Direcciones disponibles para el cliente seleccionado
  const availableAddresses = useMemo(
    () => currentClient?.addresses || [],
    [currentClient]
  );

  // Auto-seleccionar la dirección predeterminada cuando cambia de cliente
  useEffect(() => {
    if (availableAddresses.length > 0) {
      const defaultAddr =
        availableAddresses.find((a) => a.is_default) || availableAddresses[0];
      setSelectedAddressId(defaultAddr.id);
    } else {
      setSelectedAddressId('');
    }
  }, [availableAddresses]);

  // Dirección seleccionada
  const currentAddress = useMemo(
    () => availableAddresses.find((a) => a.id === selectedAddressId) || null,
    [availableAddresses, selectedAddressId]
  );

  // Cálculos dinámicos de ítems
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
        price: price || 7500,
        subtotal: price || 7500,
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

  // Clientes filtrados para el buscador
  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [clients, clientSearchQuery]);

  // Manejo de Creación de Pedido
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) {
      alert('Por favor selecciona un cliente para el pedido.');
      return;
    }
    if (!currentAddress && availableAddresses.length > 0) {
      alert('Por favor selecciona la dirección de entrega del cliente.');
      return;
    }

    setIsSubmitting(true);

    const orderNumber = `SORA-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverObj = deliveryDrivers.find((d) => d.id === deliveryUserId);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      client_id: currentClient.id,
      client_name: currentClient.name,
      client_phone: currentClient.phone,
      address_id: currentAddress?.id,
      address_label: currentAddress?.label || 'Dirección',
      address: currentAddress?.address || 'Retiro en local / Sin dirección',
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

    try {
      await supabase.from('orders').insert([
        {
          order_number: orderNumber,
          client_id: currentClient.id,
          client_name: currentClient.name,
          client_phone: currentClient.phone,
          address_id: currentAddress?.id || null,
          address_label: currentAddress?.label || null,
          address: currentAddress?.address || 'Local',
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
      ]);
    } catch (err) {
      console.warn('Pedido registrado en memoria');
    }

    setOrders([newOrder, ...orders]);
    setIsSubmitting(false);
    setSuccessNotice(`¡Pedido #${orderNumber} creado con estado "Pendiente"!`);

    // Resetear formulario
    setItems([
      {
        id: `item-${Date.now()}`,
        name: 'Pastel de Choclo Casero',
        quantity: 1,
        price: 9500,
        subtotal: 9500,
      },
    ]);
    setNotes('');

    setTimeout(() => {
      setSuccessNotice(null);
    }, 4000);
  };

  return (
    <AppNavigation>
      <div className="space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Módulo de Ventas
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Acceso exclusivo Administrador
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Creación y Despacho de Pedidos
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Registra pedidos rápidos, asigna repartidores y coordina métodos de pago.
            </p>
          </div>
        </div>

        {/* Notificación de Éxito */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-sm">{successNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUMNA IZQUIERDA: FORMULARIO DE NUEVO PEDIDO (7 COLS) */}
          <div className="lg:col-span-7 bg-white/80 rounded-3xl p-6 border border-border-sora shadow-sora">
            <div className="pb-4 border-b border-border-sora flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-sm">
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

            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* 1. SELECCIÓN DE CLIENTE CON BUSCADOR */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                  1. Seleccionar Cliente *
                </label>
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

                {currentClient && (
                  <div className="p-3 rounded-xl bg-bg-sora/80 border border-border-sora flex items-center justify-between text-xs">
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

              {/* 2. SELECTOR DE DIRECCIÓN DEL CLIENTE */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                  2. Dirección de Entrega *
                </label>
                {availableAddresses.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      Este cliente no tiene direcciones registradas. Se despachará como retiro o ingresa al módulo Clientes.
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                  >
                    {availableAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        [{addr.label}] {addr.address} {addr.reference ? `(Ref: ${addr.reference})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {currentAddress && (
                  <div className="p-3 rounded-xl bg-bg-sora/80 border border-border-sora space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 font-medium text-text-sora">
                      <MapPin className="w-3.5 h-3.5 text-primary-sora" />
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

              {/* 3. LISTA DINÁMICA DE PLATOS / ÍTEMS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                    3. Platos y Cantidades *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-primary-sora hover:text-primary-hover"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                {/* Botones de sugerencias rápidas de la carta */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] text-text-sora/50 uppercase font-semibold whitespace-nowrap">
                    Carta rápida:
                  </span>
                  {MENU_ITEMS.slice(0, 5).map((dish) => (
                    <button
                      type="button"
                      key={dish.name}
                      onClick={() => handleAddItem(dish.name, dish.price)}
                      className="px-2.5 py-1 rounded-lg bg-bg-sora hover:bg-border-sora/50 border border-border-sora text-[11px] text-text-sora whitespace-nowrap transition-all"
                    >
                      + {dish.name.split(' ')[0]} ${dish.price.toLocaleString('es-CL')}
                    </button>
                  ))}
                </div>

                {/* Filas de Ítems */}
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-bg-sora/40 border border-border-sora"
                    >
                      {/* Nombre del plato */}
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          list="sora-dishes"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Nombre del plato..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border-sora bg-white text-xs text-text-sora focus:outline-none focus:ring-1 focus:ring-primary-sora"
                        />
                      </div>

                      {/* Cantidad */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-border-sora bg-white text-xs text-text-sora text-center focus:outline-none focus:ring-1 focus:ring-primary-sora"
                        />
                      </div>

                      {/* Precio Unitario */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          required
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-border-sora bg-white text-xs text-text-sora text-right focus:outline-none focus:ring-1 focus:ring-primary-sora"
                        />
                      </div>

                      {/* Subtotal y Eliminar */}
                      <div className="col-span-2 flex items-center justify-end space-x-1.5">
                        <span className="text-xs font-bold text-text-sora">
                          ${item.subtotal.toLocaleString('es-CL')}
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

              {/* 4. TOTAL CALCULADO AUTOMÁTICAMENTE */}
              <div className="p-4 rounded-2xl bg-primary-sora/10 border border-primary-sora/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-primary-sora uppercase tracking-wider">
                    Total a Cobrar
                  </span>
                  <p className="text-[11px] text-text-sora/60">
                    Calculado automáticamente ({items.reduce((acc, i) => acc + i.quantity, 0)} ítems)
                  </p>
                </div>
                <span className="font-serif text-2xl font-bold text-primary-sora">
                  ${totalCalculated.toLocaleString('es-CL')}
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

              {/* 6. SELECTOR DE REPARTIDOR (ROL 'DELIVERY') */}
              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                  Asignar Repartidor Activo (Rol 'delivery')
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

              {/* Botón de Guardar Pedido */}
              <button
                type="submit"
                disabled={isSubmitting || !currentClient}
                className="w-full py-3.5 rounded-2xl bg-primary-sora hover:bg-primary-hover text-white font-semibold text-sm transition-all shadow-md shadow-primary-sora/25 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando pedido...' : 'Crear Pedido (Estado: Pendiente)'}
              </button>
            </form>
          </div>

          {/* COLUMNA DERECHA: PEDIDOS RECIENTES Y MONITOREO (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/80 rounded-3xl p-6 border border-border-sora shadow-sora">
              <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-text-sora">
                    Pedidos Registrados
                  </h3>
                  <p className="text-xs text-text-sora/60">
                    {orders.length} pedidos en el sistema
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Pendientes: {orders.filter((o) => o.status === 'pendiente').length}
                </span>
              </div>

              <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
                {orders.map((order) => {
                  const cleanPhone = order.client_phone.replace(/[^0-9]/g, '');
                  const whatsappMsg = encodeURIComponent(
                    `¡Hola ${order.client_name}! 🍲 Tu pedido #${order.order_number} en Sora Cocina Casera por un total de $${order.total.toLocaleString('es-CL')} ha sido ingresado exitosamente.`
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
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                          {order.status}
                        </span>
                      </div>

                      <div className="text-xs text-text-sora/70 space-y-1">
                        <p className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-primary-sora flex-shrink-0" />
                          <span className="truncate">{order.address}</span>
                        </p>
                        <p className="flex items-center">
                          <Truck className="w-3.5 h-3.5 mr-1 text-text-sora/40 flex-shrink-0" />
                          <span>Repartidor: {order.delivery_user_name || 'Sin asignar'}</span>
                        </p>
                      </div>

                      {/* Lista resumida de platos */}
                      <div className="p-2.5 rounded-xl bg-bg-sora/50 border border-border-sora/60 text-[11px] space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {it.quantity}x {it.name}
                            </span>
                            <span className="font-mono text-text-sora/60">
                              ${it.subtotal.toLocaleString('es-CL')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Total y Pago */}
                      <div className="flex items-center justify-between pt-1 border-t border-border-sora/60">
                        <div className="text-[11px]">
                          <span className="text-text-sora/60">Pago: </span>
                          <span className="font-medium capitalize text-text-sora">
                            {order.payment_method} •{' '}
                          </span>
                          <span
                            className={
                              order.payment_status === 'pagado'
                                ? 'text-emerald-600 font-semibold'
                                : 'text-amber-600 font-semibold'
                            }
                          >
                            {order.payment_status === 'pagado'
                              ? 'Pagado'
                              : 'Contra entrega'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-primary-sora font-mono">
                          ${order.total.toLocaleString('es-CL')}
                        </span>
                      </div>

                      {/* Botón WhatsApp de Notificación */}
                      <div className="pt-1">
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-semibold transition-all shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Notificar al Cliente por WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
