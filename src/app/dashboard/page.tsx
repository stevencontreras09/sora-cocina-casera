'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  Receipt,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ChefHat,
  DollarSign,
  Calendar,
  Users,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  dailySales: number;
  ordersCount: number;
  activeDeliveries: number;
  todayExpenses: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<DashboardStats>({
    dailySales: 0,
    ordersCount: 0,
    activeDeliveries: 0,
    todayExpenses: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos reales de Supabase
  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Consultar pedidos
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (ordersData && ordersData.length > 0) {
          setRecentOrders(ordersData);
          const totalSales = ordersData.reduce(
            (sum, o) => sum + (parseFloat(o.total) || 0),
            0
          );
          const activeCount = ordersData.filter((o) => {
            const st = (o.status || '').toLowerCase();
            return st === 'en camino' || st === 'pendiente';
          }).length;

          setStats((prev) => ({
            ...prev,
            dailySales: totalSales,
            ordersCount: ordersData.length,
            activeDeliveries: activeCount,
          }));
        }

        // 2. Consultar gastos del día
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('*')
          .gte('date', todayStr);

        if (expensesData && expensesData.length > 0) {
          const totalExp = expensesData.reduce(
            (sum, e) => sum + (parseFloat(e.amount) || 0),
            0
          );
          setStats((prev) => ({
            ...prev,
            todayExpenses: totalExp,
          }));
        }
      } catch (err) {
        console.warn('Cargando dashboard limpio');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [supabase]);

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
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
                Moneda: DOP (RD$)
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
              href="/ventas"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs font-semibold transition-all shadow-sm shadow-primary-sora/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Pedido</span>
            </Link>
            <Link
              href="/gastos"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm"
            >
              <Receipt className="w-4 h-4 text-primary-sora" />
              <span>Ver Gastos</span>
            </Link>
          </div>
        </div>

        {/* Tarjetas de Métricas Clave (DOP / RD$) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Ventas Registradas</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-text-sora">
                {formatCurrency(stats.dailySales)}
              </p>
              <p className="text-[11px] text-text-sora/50 mt-1">
                Moneda oficial en Pesos Dominicanos
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Pedidos Realizados</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-text-sora">{stats.ordersCount}</p>
              <p className="text-[11px] text-text-sora/50 mt-1">
                Total acumulado en el sistema
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Deliveries en Ruta</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-text-sora">{stats.activeDeliveries}</p>
              <p className="text-[11px] text-blue-600 flex items-center mt-1 font-medium">
                <Clock className="w-3 h-3 mr-1" />
                Despachos pendientes o en ruta
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-sora/60">Gastos Registrados</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-primary-sora flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-primary-sora">
                {formatCurrency(stats.todayExpenses)}
              </p>
              <p className="text-[11px] text-text-sora/50 mt-1">
                Egresos operativos en DOP
              </p>
            </div>
          </div>
        </div>

        {/* Sección Principal: Pedidos Recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between pb-4 border-b border-border-sora">
              <div>
                <h2 className="font-serif text-lg font-bold text-text-sora">
                  Flujo de Cocina y Pedidos
                </h2>
                <p className="text-xs text-text-sora/60">Últimos pedidos registrados</p>
              </div>
              <Link
                href="/ventas"
                className="text-xs font-semibold text-primary-sora hover:text-primary-hover flex items-center"
              >
                <span>Ir a Ventas</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            {recentOrders.length > 0 ? (
              <div className="divide-y divide-border-sora/60">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-semibold text-primary-sora bg-bg-sora px-2 py-0.5 rounded-md border border-border-sora">
                          {order.order_number || `#${order.id.slice(0, 6)}`}
                        </span>
                        <span className="text-xs font-bold text-text-sora">
                          {order.client_name}
                        </span>
                        <span className="text-[11px] text-text-sora/40">{order.created_at}</span>
                      </div>
                      <p className="text-xs text-text-sora/70">{order.address}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                      <span className="font-serif font-bold text-text-sora text-sm">
                        {formatCurrency(parseFloat(order.total) || 0)}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                        {order.status || 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-text-sora/30 mx-auto" />
                <p className="text-sm font-semibold text-text-sora">
                  No hay pedidos registrados todavía
                </p>
                <p className="text-xs text-text-sora/60 max-w-sm mx-auto">
                  El sistema está limpio y listo para empezar a registrar ventas en pesos dominicanos (DOP).
                </p>
                <Link
                  href="/ventas"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Primer Pedido</span>
                </Link>
              </div>
            )}
          </div>

          {/* Panel Lateral: Accesos Directos */}
          <div className="space-y-5">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/80 border border-border-sora shadow-sora space-y-3">
              <h3 className="font-serif text-base font-bold text-text-sora">
                Accesos Directos
              </h3>
              <p className="text-xs text-text-sora/70">
                Navegación adaptada para iPad, PC y teléfonos móviles:
              </p>

              <div className="space-y-2 pt-1">
                <Link
                  href="/ventas"
                  className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora hover:bg-bg-sora flex items-center justify-between text-xs font-semibold text-text-sora transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <ShoppingBag className="w-4 h-4 text-primary-sora" />
                    <span>Crear y Despachar Pedidos</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-sora/40" />
                </Link>

                <Link
                  href="/clientes"
                  className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora hover:bg-bg-sora flex items-center justify-between text-xs font-semibold text-text-sora transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <Users className="w-4 h-4 text-primary-sora" />
                    <span>Clientes y Google Maps</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-sora/40" />
                </Link>

                <Link
                  href="/gastos"
                  className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora hover:bg-bg-sora flex items-center justify-between text-xs font-semibold text-text-sora transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <Receipt className="w-4 h-4 text-primary-sora" />
                    <span>Control de Gastos y Egresos</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-sora/40" />
                </Link>

                <Link
                  href="/delivery"
                  className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora hover:bg-bg-sora flex items-center justify-between text-xs font-semibold text-text-sora transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <Truck className="w-4 h-4 text-primary-sora" />
                    <span>Vista Móvil de Reparto</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-sora/40" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
