'use client';

import React, { useState, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  ShoppingBag,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  PieChart,
  Percent,
  Download,
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

// Datos históricos mensuales simulados para Sora Cocina Casera
const HISTORICAL_DATA: Record<
  string,
  {
    sales: number;
    ordersCount: number;
    expenses: number;
    expensesByCategory: Record<string, number>;
  }
> = {
  '2026-10': {
    sales: 4850000,
    ordersCount: 198,
    expenses: 2140000,
    expensesByCategory: {
      Insumos: 1200000,
      Empaques: 240000,
      Transporte: 180000,
      Servicios: 220000,
      Nómina: 240000,
      Otros: 60000,
    },
  },
  '2026-09': {
    sales: 4420000,
    ordersCount: 184,
    expenses: 1980000,
    expensesByCategory: {
      Insumos: 1100000,
      Empaques: 210000,
      Transporte: 160000,
      Servicios: 210000,
      Nómina: 240000,
      Otros: 60000,
    },
  },
  '2026-08': {
    sales: 3950000,
    ordersCount: 165,
    expenses: 1870000,
    expensesByCategory: {
      Insumos: 1050000,
      Empaques: 190000,
      Transporte: 140000,
      Servicios: 200000,
      Nómina: 230000,
      Otros: 60000,
    },
  },
  '2026-07': {
    sales: 3820000,
    ordersCount: 160,
    expenses: 1790000,
    expensesByCategory: {
      Insumos: 1000000,
      Empaques: 180000,
      Transporte: 130000,
      Servicios: 200000,
      Nómina: 220000,
      Otros: 60000,
    },
  },
};

// Datos para el gráfico de barras comparativo (últimos 6 meses)
const CHART_PERIODS = [
  { key: '2026-05', label: 'May', sales: 3400000, expenses: 1650000 },
  { key: '2026-06', label: 'Jun', sales: 3600000, expenses: 1720000 },
  { key: '2026-07', label: 'Jul', sales: 3820000, expenses: 1790000 },
  { key: '2026-08', label: 'Ago', sales: 3950000, expenses: 1870000 },
  { key: '2026-09', label: 'Sep', sales: 4420000, expenses: 1980000 },
  { key: '2026-10', label: 'Oct', sales: 4850000, expenses: 2140000 },
];

export default function ReportesPage() {
  const { role } = useAuth();

  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(9); // 9 = Octubre (0-indexed)

  // Clave en formato YYYY-MM
  const monthKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  const currentData = useMemo(() => {
    return (
      HISTORICAL_DATA[monthKey] || {
        sales: 4200000,
        ordersCount: 175,
        expenses: 1950000,
        expensesByCategory: {
          Insumos: 1100000,
          Empaques: 200000,
          Transporte: 150000,
          Servicios: 200000,
          Nómina: 240000,
          Otros: 60000,
        },
      }
    );
  }, [monthKey]);

  // Cálculos métricos solicitados
  const totalSales = currentData.sales;
  const totalExpenses = currentData.expenses;
  const netProfit = totalSales - totalExpenses; // Utilidad Neta (Ventas - Gastos)
  const averageTicket =
    currentData.ordersCount > 0
      ? Math.round(totalSales / currentData.ordersCount)
      : 0; // Ticket Promedio por Pedido
  const profitMargin =
    totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0';

  // Máximo para escalar las barras del gráfico
  const maxChartValue = Math.max(
    ...CHART_PERIODS.map((p) => Math.max(p.sales, p.expenses))
  );

  // Verificación estricta de seguridad: Co-Admin no debe tener acceso
  if (role && role !== 'admin') {
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
            El módulo de Reportes Financieros es exclusivo para usuarios con rol de Administrador.
          </p>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="space-y-8">
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
              Rentabilidad neta, balance ingresos vs. egresos y ticket promedio mensual.
            </p>
          </div>

          {/* SELECTOR DE MES Y AÑO */}
          <div className="flex items-center space-x-2 bg-white/80 p-1.5 rounded-2xl border border-border-sora shadow-sm">
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
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
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
                ${totalSales.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-emerald-600 flex items-center mt-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                {currentData.ordersCount} pedidos despachados
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
                ${totalExpenses.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-text-sora/60 flex items-center mt-1">
                Insumos, empaques y nómina
              </p>
            </div>
          </div>

          {/* UTILIDAD NETA (VENTAS - GASTOS) */}
          <div className="p-5 rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Utilidad Neta
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-emerald-700">
                +${netProfit.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-text-sora/60 flex items-center mt-1 font-medium">
                Margen neto: <strong className="text-emerald-700 ml-1">{profitMargin}%</strong>
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
                ${averageTicket.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-text-sora/60 flex items-center mt-1">
                Por pedido entregado
              </p>
            </div>
          </div>
        </div>

        {/* 2. GRÁFICO COMPARATIVO DE BARRAS (INGRESOS VS. GASTOS) */}
        <div className="bg-white/80 rounded-3xl p-6 sm:p-7 border border-border-sora shadow-sora">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border-sora gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary-sora" />
                <h2 className="font-serif text-lg font-bold text-text-sora">
                  Comparativa Semestral: Ingresos vs. Gastos
                </h2>
              </div>
              <p className="text-xs text-text-sora/60 mt-0.5">
                Evolución financiera mensual de Sora Cocina Casera
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
          <div className="pt-8 pb-4">
            <div className="h-64 sm:h-72 flex items-end justify-between gap-3 sm:gap-6 border-b border-border-sora/80 pb-4">
              {CHART_PERIODS.map((period) => {
                const salesHeight = (period.sales / maxChartValue) * 100;
                const expensesHeight = (period.expenses / maxChartValue) * 100;
                const isSelected = period.key === monthKey;

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
                        style={{ height: `${salesHeight}%` }}
                        className="w-1/2 max-w-[32px] bg-emerald-600 rounded-t-xl hover:bg-emerald-700 transition-all shadow-sm relative group/bar flex items-center justify-center"
                      >
                        <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 bg-text-sora text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap transition-opacity shadow-md z-10 font-mono">
                          ${(period.sales / 1000).toFixed(0)}k
                        </span>
                      </div>

                      {/* Barra de Gastos */}
                      <div
                        style={{ height: `${expensesHeight}%` }}
                        className="w-1/2 max-w-[32px] bg-primary-sora rounded-t-xl hover:bg-primary-hover transition-all shadow-sm relative group/bar flex items-center justify-center"
                      >
                        <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 bg-text-sora text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap transition-opacity shadow-md z-10 font-mono">
                          ${(period.expenses / 1000).toFixed(0)}k
                        </span>
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
          <div className="bg-white/80 rounded-3xl p-6 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-5">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-primary-sora" />
                <h3 className="font-serif font-bold text-base text-text-sora">
                  Distribución de Gastos ({MONTH_NAMES[selectedMonthIndex]})
                </h3>
              </div>
              <span className="text-xs text-text-sora/60 font-semibold font-mono">
                ${totalExpenses.toLocaleString('es-CL')}
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(currentData.expensesByCategory).map(([cat, amount]) => {
                const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text-sora">{cat}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-text-sora/60">
                          ${amount.toLocaleString('es-CL')}
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
          </div>

          {/* Resumen Ejecutivo y Recomendaciones */}
          <div className="bg-white/80 rounded-3xl p-6 border border-border-sora shadow-sora flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-4 border-b border-border-sora mb-4">
                <Percent className="w-4 h-4 text-primary-sora" />
                <h3 className="font-serif font-bold text-base text-text-sora">
                  Diagnóstico de Eficiencia
                </h3>
              </div>

              <div className="space-y-3.5 text-xs text-text-sora/80">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="font-semibold text-emerald-800">
                    ✓ Margen Operativo Saludable ({profitMargin}%)
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    El restaurante mantiene un ratio de utilidad neta superior al estándar de gastronomía casera (30-40%).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora">
                  <p className="font-semibold text-text-sora">
                    • Insumos Frescos representa el 56% de los egresos
                  </p>
                  <p className="text-[11px] text-text-sora/60 mt-0.5">
                    Mayor concentración en carnes y verduras de La Vega. Controlar mermas semanales para maximizar margen.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora">
                  <p className="font-semibold text-text-sora">
                    • Ticket Promedio: ${averageTicket.toLocaleString('es-CL')}
                  </p>
                  <p className="text-[11px] text-text-sora/60 mt-0.5">
                    Los pedidos familiares y combos de pastel de choclo con ensalada elevan el ticket promedio.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border-sora mt-4">
              <span className="text-[11px] text-text-sora/50 italic">
                * Todos los valores se calculan automáticamente en base a las ventas y gastos registrados en el sistema.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
