'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { getStoredOrders, getStoredExpenses } from '@/lib/storage';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  ShoppingBag,
  Calendar,
  ShieldAlert,
  PieChart,
  Percent,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

interface MonthlyData {
  sales: number;
  ordersCount: number;
  expenses: number;
  expensesByCategory: Record<string, number>;
}

export default function ReportesPage() {
  const { role, hasPermission } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(now.getMonth());

  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Clave en formato YYYY-MM para el mes seleccionado
  const selectedMonthKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  // Cargar datos reales desde Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Pedidos (excluyendo cancelados para finanzas)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*');

      if (!ordersError && ordersData && ordersData.length > 0) {
        setRawOrders(ordersData);
      } else {
        const stored = getStoredOrders();
        if (stored.length > 0) setRawOrders(stored);
      }

      // 2. Gastos
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (!expensesError && expensesData && expensesData.length > 0) {
        setRawExpenses(expensesData);
      } else {
        const stored = getStoredExpenses();
        if (stored.length > 0) setRawExpenses(stored);
      }
    } catch (err) {
      console.warn('Error al consultar reportes en Supabase, usando respaldo local', err);
      const storedOrders = getStoredOrders();
      const storedExpenses = getStoredExpenses();
      if (storedOrders.length > 0) setRawOrders(storedOrders);
      if (storedExpenses.length > 0) setRawExpenses(storedExpenses);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agrupar órdenes y gastos por mes (clave YYYY-MM)
  const aggregatedData = useMemo(() => {
    const map: Record<string, MonthlyData> = {};

    // Procesar pedidos
    rawOrders.forEach((o) => {
      const statusLower = (o.status || '').toLowerCase();
      if (statusLower === 'cancelado') return; // Omitir cancelados

      const dateStr = o.created_at || '';
      if (!dateStr) return;
      const key = dateStr.slice(0, 7); // 'YYYY-MM'

      if (!map[key]) {
        map[key] = {
          sales: 0,
          ordersCount: 0,
          expenses: 0,
          expensesByCategory: {},
        };
      }

      const totalVal = parseFloat(o.total) || 0;
      map[key].sales += totalVal;
      map[key].ordersCount += 1;
    });

    // Procesar gastos
    rawExpenses.forEach((e) => {
      const dateStr = e.date || e.created_at || '';
      if (!dateStr) return;
      const key = dateStr.slice(0, 7); // 'YYYY-MM'

      if (!map[key]) {
        map[key] = {
          sales: 0,
          ordersCount: 0,
          expenses: 0,
          expensesByCategory: {},
        };
      }

      const amountVal = parseFloat(e.amount) || 0;
      map[key].expenses += amountVal;

      const rawCat = (e.category || 'otros').toString().toLowerCase();
      const catCapitalized =
        rawCat.charAt(0).toUpperCase() + rawCat.slice(1);

      map[key].expensesByCategory[catCapitalized] =
        (map[key].expensesByCategory[catCapitalized] || 0) + amountVal;
    });

    return map;
  }, [rawOrders, rawExpenses]);

  // Datos del mes seleccionado
  const currentData: MonthlyData = useMemo(() => {
    return (
      aggregatedData[selectedMonthKey] || {
        sales: 0,
        ordersCount: 0,
        expenses: 0,
        expensesByCategory: {},
      }
    );
  }, [aggregatedData, selectedMonthKey]);

  // Cálculos métricos del mes
  const totalSales = currentData.sales;
  const totalExpenses = currentData.expenses;
  const netProfit = totalSales - totalExpenses; // Utilidad Neta (Ventas - Gastos)
  const averageTicket =
    currentData.ordersCount > 0
      ? Math.round(totalSales / currentData.ordersCount)
      : 0;
  const profitMargin =
    totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0';

  // Períodos para el gráfico semestral (últimos 6 meses hasta el seleccionado)
  const chartPeriods = useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      sales: number;
      expenses: number;
    }> = [];

    const selYearNum = parseInt(selectedYear, 10);
    const selMonthNum = selectedMonthIndex; // 0-indexed

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(selYearNum, selMonthNum - i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${MONTH_SHORT[m]} ${y !== selYearNum ? "'" + String(y).slice(-2) : ''}`.trim();

      const monthInfo = aggregatedData[key] || { sales: 0, expenses: 0 };
      list.push({
        key,
        label,
        sales: monthInfo.sales,
        expenses: monthInfo.expenses,
      });
    }

    return list;
  }, [selectedYear, selectedMonthIndex, aggregatedData]);

  // Máximo para escalar las barras del gráfico
  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(
      ...chartPeriods.map((p) => Math.max(p.sales, p.expenses)),
      1
    );
    return maxVal;
  }, [chartPeriods]);

  // Verificación de seguridad: Acceso según permisos de función
  if (role && !hasPermission('reportes')) {
    return (
      <AppNavigation>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-text-sora">
            Acceso Restringido
          </h2>
          <p className="text-sm text-text-sora/60 mt-1 max-w-md">
            No tienes permisos asignados para visualizar el módulo de Reportes Financieros. Contacta al Administrador del sistema para solicitar acceso.
          </p>
        </div>
      </AppNavigation>
    );
  }

  const hasDataThisMonth = currentData.sales > 0 || currentData.expenses > 0;

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* Encabezado y Selector de Fecha */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Finanzas y Métricas
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Exclusivo Administrador
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Reportes Financieros de Sora
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Rentabilidad neta, balance ingresos vs. egresos y ticket promedio en Pesos Dominicanos (DOP).
            </p>
          </div>

          {/* SELECTOR DE MES Y AÑO */}
          <div className="flex items-center space-x-2 bg-white/80 p-1.5 rounded-2xl border border-border-sora shadow-sm self-start sm:self-auto">
            <div className="flex items-center px-2 text-text-sora/50">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              value={selectedMonthIndex}
              onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value))}
              aria-label="Seleccionar mes del reporte"
              className="px-2.5 py-1.5 rounded-xl border border-border-sora bg-bg-sora/50 text-text-sora text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-sora"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Seleccionar año del reporte"
              className="px-2.5 py-1.5 rounded-xl border border-border-sora bg-bg-sora/50 text-text-sora text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-sora"
            >
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            <button
              onClick={fetchData}
              disabled={isLoading}
              title="Refrescar datos"
              className="p-1.5 text-text-sora/50 hover:text-primary-sora rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. TARJETAS DE RESUMEN MÉTRICO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* TOTAL DE VENTAS */}
          <div className="p-5 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total de Ventas
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-text-sora">
                {formatCurrency(totalSales)}
              </p>
              <p className="text-[11px] text-emerald-600 flex items-center mt-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                {currentData.ordersCount} pedidos en el mes
              </p>
            </div>
          </div>

          {/* TOTAL DE GASTOS */}
          <div className="p-5 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total de Gastos
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-primary-sora flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-primary-sora">
                {formatCurrency(totalExpenses)}
              </p>
              <p className="text-[11px] text-text-sora/60 flex items-center mt-1">
                Egresos registrados en el mes
              </p>
            </div>
          </div>

          {/* UTILIDAD NETA (VENTAS - GASTOS) */}
          <div className="p-5 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Utilidad Neta
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className={`text-2xl font-serif font-bold ${
                netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {netProfit >= 0 ? `+${formatCurrency(netProfit)}` : formatCurrency(netProfit)}
              </p>
              <p className="text-[11px] text-text-sora/60 flex items-center mt-1 font-medium">
                Margen neto: <strong className={`ml-1 ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{profitMargin}%</strong>
              </p>
            </div>
          </div>

          {/* TICKET PROMEDIO POR PEDIDO */}
          <div className="p-5 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Ticket Promedio
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-text-sora">
                {formatCurrency(averageTicket)}
              </p>
              <p className="text-[11px] text-text-sora/60 flex items-center mt-1">
                Por pedido registrado
              </p>
            </div>
          </div>
        </div>

        {/* 2. GRÁFICO COMPARATIVO DE BARRAS (INGRESOS VS. GASTOS) */}
        <div className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-border-sora shadow-sora">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border-sora gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary-sora" />
                <h2 className="font-serif text-lg font-bold text-text-sora">
                  Comparativa Semestral: Ingresos vs. Gastos
                </h2>
              </div>
              <p className="text-xs text-text-sora/60 mt-0.5">
                Evolución de ventas y egresos (últimos 6 meses en DOP)
              </p>
            </div>

            {/* Leyenda del gráfico */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 inline-block shadow-sm" />
                <span className="text-text-sora/80 font-medium">Ingresos (Ventas)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-primary-sora inline-block shadow-sm" />
                <span className="text-text-sora/80 font-medium">Gastos (Egresos)</span>
              </div>
            </div>
          </div>

          {/* Contenedor del Gráfico de Barras */}
          <div className="pt-8 pb-4 overflow-x-auto">
            <div className="min-w-[420px] h-64 sm:h-72 flex items-end justify-between gap-3 sm:gap-6 border-b border-border-sora/80 pb-4">
              {chartPeriods.map((period) => {
                const salesHeight =
                  maxChartValue > 0 ? (period.sales / maxChartValue) * 100 : 0;
                const expensesHeight =
                  maxChartValue > 0 ? (period.expenses / maxChartValue) * 100 : 0;
                const isSelected = period.key === selectedMonthKey;

                return (
                  <div
                    key={period.key}
                    className={`flex-1 flex flex-col items-center h-full justify-end group transition-all ${
                      isSelected ? 'scale-105' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      {/* Barra de Ventas */}
                      <div
                        style={{ height: `${Math.max(salesHeight, period.sales > 0 ? 5 : 2)}%` }}
                        className={`w-1/2 max-w-[32px] rounded-t-xl transition-all shadow-sm relative group/bar flex items-center justify-center ${
                          period.sales > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-emerald-200/50'
                        }`}
                      >
                        {period.sales > 0 && (
                          <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 bg-text-sora text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap transition-opacity shadow-md z-10 font-mono">
                            {formatCurrency(period.sales)}
                          </span>
                        )}
                      </div>

                      {/* Barra de Gastos */}
                      <div
                        style={{ height: `${Math.max(expensesHeight, period.expenses > 0 ? 5 : 2)}%` }}
                        className={`w-1/2 max-w-[32px] rounded-t-xl transition-all shadow-sm relative group/bar flex items-center justify-center ${
                          period.expenses > 0
                            ? 'bg-primary-sora hover:bg-primary-hover'
                            : 'bg-primary-sora/20'
                        }`}
                      >
                        {period.expenses > 0 && (
                          <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 bg-text-sora text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap transition-opacity shadow-md z-10 font-mono">
                            {formatCurrency(period.expenses)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Etiqueta del Mes */}
                    <div className="mt-3 text-center">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected
                            ? 'text-primary-sora font-bold underline decoration-2 underline-offset-4'
                            : 'text-text-sora/60'
                        }`}
                      >
                        {period.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. DESGLOSE DE GASTOS POR CATEGORÍA DEL MES SELECCIONADO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-5">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-primary-sora" />
                <h3 className="font-serif font-bold text-base text-text-sora">
                  Distribución de Gastos ({MONTH_NAMES[selectedMonthIndex]})
                </h3>
              </div>
              <span className="text-xs text-text-sora/60 font-semibold font-mono">
                {formatCurrency(totalExpenses)}
              </span>
            </div>

            {Object.keys(currentData.expensesByCategory).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(currentData.expensesByCategory).map(([cat, amount]) => {
                  const percentage =
                    totalExpenses > 0
                      ? ((amount / totalExpenses) * 100).toFixed(1)
                      : '0';
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-text-sora">{cat}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-text-sora/60">
                            {formatCurrency(amount)}
                          </span>
                          <span className="font-bold text-text-sora text-[11px] w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      {/* Barra de progreso visual */}
                      <div className="w-full h-2 rounded-full bg-bg-sora border border-border-sora/60 overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="h-full bg-primary-sora rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-text-sora/50">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No hay egresos registrados para este mes.</p>
              </div>
            )}
          </div>

          {/* Resumen Ejecutivo y Diagnóstico */}
          <div className="bg-white/80 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-4 border-b border-border-sora mb-4">
                <Percent className="w-4 h-4 text-primary-sora" />
                <h3 className="font-serif font-bold text-base text-text-sora">
                  Diagnóstico Financiero
                </h3>
              </div>

              {hasDataThisMonth ? (
                <div className="space-y-3.5 text-xs text-text-sora/80">
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      netProfit >= 0
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <p
                      className={`font-semibold ${
                        netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                    >
                      {netProfit >= 0
                        ? `✓ Balance Positivo (Margen Neto: ${profitMargin}%)`
                        : `⚠ Balance Negativo (${profitMargin}%)`}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {netProfit >= 0
                        ? 'Las ventas del período cubren la totalidad de los costos operativos y generan margen a favor.'
                        : 'Los costos superan los ingresos generados durante este período. Revisa las categorías de mayor gasto.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora">
                    <p className="font-semibold text-text-sora">
                      • Ticket Promedio: {formatCurrency(averageTicket)}
                    </p>
                    <p className="text-[11px] text-text-sora/60 mt-0.5">
                      Promedio de consumo generado por cada pedido registrado en Sora Cocina Casera.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora">
                    <p className="font-semibold text-text-sora">
                      • Actividad de Pedidos: {currentData.ordersCount} despachos
                    </p>
                    <p className="text-[11px] text-text-sora/60 mt-0.5">
                      Volumen de entregas registradas en el período seleccionado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-text-sora/50">
                  <p className="text-xs">
                    Selecciona un período con órdenes y gastos registrados para ver el diagnóstico automático de rentabilidad.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border-sora mt-4">
              <span className="text-[11px] text-text-sora/50 italic">
                * Todos los valores se calculan automáticamente en base a las ventas y gastos registrados en la base de datos de Sora.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
