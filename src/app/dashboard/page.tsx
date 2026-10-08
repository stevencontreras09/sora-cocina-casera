'use client';

import React, { useState } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  Receipt,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ChefHat,
  DollarSign,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useAuth();

  // Datos simulados iniciales representativos de la operación de Sora Cocina Casera
  const [stats] = useState({
    dailySales: 845000,
    ordersCount: 38,
    activeDeliveries: 5,
    todayExpenses: 142000,
  });

  const [recentOrders] = useState([
    {
      id: 'PED-1042',
      customer: 'Carolina Soto',
      dish: 'Pastel de Choclo Artesanal x2 + Ensalada Chilena',
      total: 24900,
      status: 'en_camino',
      time: 'Hace 12 min',
      address: 'Av. Providencia 1245, Apt 402',
    },
    {
      id: 'PED-1041',
      customer: 'Gonzalo Silva',
      dish: 'Cazuela de Vacuno Casera + Pan Amasado',
      total: 13500,
      status: 'cocinando',
      time: 'Hace 22 min',
      address: 'Calle Los Leones 890',
    },
    {
      id: 'PED-1040',
      customer: 'Valentina Rojas',
      dish: 'Lasaña Boloñesa Familiar + Postre de Leche Asada',
      total: 32000,
      status: 'entregado',
      time: 'Hace 45 min',
      address: 'Manuel Montt 450, Depto 10B',
    },
    {
      id: 'PED-1039',
      customer: 'Andrés Morales',
      dish: 'Porotos Granados con Mazamorra x2',
      total: 18000,
      status: 'entregado',
      time: 'Hace 1 hora',
      address: 'Pedro de Valdivia 1920',
    },
  ]);

  return (
    <AppNavigation>
      <div className="space-y-8">
        {/* Encabezado del Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Panel de Administración
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60 flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Hoy, Operación en vivo
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Bienvenido, {profile?.full_name || 'Administrador'}
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Resumen ejecutivo de cocina, finanzas y entregas de Sora Cocina Casera.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/gastos"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-border-sora bg-white/70 text-text-sora hover:bg-white text-xs font-semibold transition-all shadow-sm"
            >
              <Receipt className="w-3.5 h-3.5 text-primary-sora" />
              <span>Ver Gastos</span>
            </Link>
            <Link
              href="/delivery"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs font-semibold transition-all shadow-sm shadow-primary-sora/20"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Despacho Delivery</span>
            </Link>
          </div>
        </div>

        {/* Tarjetas de Métricas Clave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 rounded-2xl bg-white/70 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Ventas Hoy</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-text-sora">
                ${stats.dailySales.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-emerald-600 flex items-center mt-1 font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +14% respecto a ayer
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Pedidos Procesados</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-text-sora">{stats.ordersCount}</p>
              <p className="text-[11px] text-text-sora/60 mt-1">
                32 completados, 6 en proceso
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Deliveries en Ruta</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-text-sora">{stats.activeDeliveries}</p>
              <p className="text-[11px] text-blue-600 flex items-center mt-1 font-medium">
                <Clock className="w-3 h-3 mr-1" />
                Tiempo prom: 28 min
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/70 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Gastos Registrados</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-primary-sora flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-text-sora">
                ${stats.todayExpenses.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-text-sora/60 mt-1">
                Insumos frescos y compras
              </p>
            </div>
          </div>
        </div>

        {/* Sección Principal: Pedidos Recientes & Estado del Restaurante */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado de Pedidos Recientes */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between pb-4 border-b border-border-sora">
              <div>
                <h2 className="font-serif text-lg font-bold text-text-sora">
                  Flujo de Cocina y Pedidos
                </h2>
                <p className="text-xs text-text-sora/60">Últimos pedidos despachados hoy</p>
              </div>
              <Link
                href="/delivery"
                className="text-xs font-semibold text-primary-sora hover:text-primary-hover flex items-center"
              >
                <span>Ver todos</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="divide-y divide-border-sora/60">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-text-sora">
                        {order.id}
                      </span>
                      <span className="text-xs font-medium text-text-sora/80">
                        • {order.customer}
                      </span>
                      <span className="text-[11px] text-text-sora/40">{order.time}</span>
                    </div>
                    <p className="text-xs text-text-sora/80">{order.dish}</p>
                    <p className="text-[11px] text-text-sora/50">{order.address}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                    <span className="font-semibold text-text-sora text-sm">
                      ${order.total.toLocaleString('es-CL')}
                    </span>
                    {order.status === 'en_camino' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <Truck className="w-3 h-3 mr-1" />
                        En camino
                      </span>
                    )}
                    {order.status === 'cocinando' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <ChefHat className="w-3 h-3 mr-1" />
                        En cocina
                      </span>
                    )}
                    {order.status === 'entregado' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Entregado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel Lateral Informativo: Roles y Acceso Rápido */}
          <div className="space-y-5">
            <div className="p-6 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
              <h3 className="font-serif text-base font-bold text-text-sora mb-3">
                Gestión de Roles Sora
              </h3>
              <p className="text-xs text-text-sora/70 mb-4">
                El sistema asigna vistas basadas en el rol registrado en la tabla{' '}
                <code className="bg-bg-sora px-1.5 py-0.5 rounded text-[11px] font-mono text-primary-sora">
                  profiles
                </code>
                :
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-bg-sora/80 border border-border-sora">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-sora">Admin</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-sora/15 text-primary-sora font-semibold">
                      Acceso Total
                    </span>
                  </div>
                  <p className="text-[11px] text-text-sora/60 mt-1">
                    Controla métricas generales, gastos e itinerario de repartos.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-bg-sora/80 border border-border-sora">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-sora">Co-Admin</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      Gastos + Delivery
                    </span>
                  </div>
                  <p className="text-[11px] text-text-sora/60 mt-1">
                    Registro de insumos de cocina y coordinación de pedidos.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-bg-sora/80 border border-border-sora">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-sora">Delivery</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Entregas Móviles
                    </span>
                  </div>
                  <p className="text-[11px] text-text-sora/60 mt-1">
                    Interfaz optimizada para celular con botón a WhatsApp y mapas.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-primary-sora/10 border border-primary-sora/20">
              <div className="flex items-center space-x-2 text-primary-sora font-semibold text-xs mb-1">
                <ChefHat className="w-4 h-4" />
                <span>Sora Cocina Casera</span>
              </div>
              <p className="text-[11px] text-text-sora/80">
                Todos los datos están sincronizados en tiempo real mediante Supabase y optimizados para despliegue en Vercel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
