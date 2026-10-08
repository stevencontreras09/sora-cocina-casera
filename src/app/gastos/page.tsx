'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { Expense, ExpenseCategory } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  saveStoredExpenses,
  getStoredExpenses,
  isValidUuid,
  generateUuid,
} from '@/lib/storage';
import {
  Receipt,
  PlusCircle,
  TrendingDown,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  User as UserIcon,
  Trash2,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES: { id: ExpenseCategory | 'todos'; label: string; color: string }[] = [
  { id: 'todos', label: 'Todas las categorías', color: 'bg-primary-sora text-white' },
  { id: 'insumos', label: 'Insumos', color: 'bg-amber-100 text-amber-800' },
  { id: 'empaques', label: 'Empaques', color: 'bg-blue-100 text-blue-800' },
  { id: 'transporte', label: 'Transporte', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'servicios', label: 'Servicios', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'nomina', label: 'Nómina', color: 'bg-purple-100 text-purple-800' },
  { id: 'otros', label: 'Otros', color: 'bg-gray-100 text-gray-800' },
];

export default function GastosPage() {
  const { user, profile, role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Lista con respaldo de autoguardado persistente
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'todos'>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // Mes actual en formato YYYY-MM
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados del formulario
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('insumos');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar gastos reales de Supabase con respaldo local
  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        setExpenses(data as Expense[]);
        saveStoredExpenses(data as Expense[]);
      } else {
        const cached = getStoredExpenses();
        if (cached.length > 0) setExpenses(cached);
      }
    } catch (err) {
      const cached = getStoredExpenses();
      if (cached.length > 0) setExpenses(cached);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Manejar creación de gasto con autoguardado y validación de UUID
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsSubmitting(true);
    const newId = generateUuid();
    const parsedAmount = parseFloat(amount);

    const newExpense: Expense = {
      id: newId,
      description: description.trim(),
      amount: parsedAmount,
      category: category,
      date: date,
      created_by: user?.id,
      created_by_name: profile?.full_name || user?.email?.split('@')[0] || 'Personal Sora',
    };

    // 1. Guardar de inmediato en almacenamiento local (cero pérdida de datos)
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveStoredExpenses(updated);

    // 2. Guardar en Supabase
    try {
      const payload: any = {
        id: newId,
        description: description.trim(),
        amount: parsedAmount,
        category: category,
        date: date,
        created_by_name: profile?.full_name || 'Personal Sora',
      };
      if (isValidUuid(user?.id)) {
        payload.created_by = user?.id;
      }

      await supabase.from('expenses').insert([payload]);
    } catch (err) {
      console.warn('Gasto guardado en respaldo local');
    }

    setDescription('');
    setAmount('');
    setIsSubmitting(false);
    setFormSuccess(true);

    setTimeout(() => {
      setFormSuccess(false);
      setShowAddForm(false);
    }, 1500);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de gasto?')) return;

    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveStoredExpenses(updated);

    try {
      if (isValidUuid(id)) {
        await supabase.from('expenses').delete().eq('id', id);
      }
    } catch (err) {
      console.warn('Eliminado local');
    }
  };

  // Filtrado interactivo por Mes y Categoría
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchMonth = selectedMonth === 'todos' || exp.date.startsWith(selectedMonth);
      const matchCategory = selectedCategory === 'todos' || exp.category === selectedCategory;
      return matchMonth && matchCategory;
    });
  }, [expenses, selectedMonth, selectedCategory]);

  // Sumatoria de gastos del mes seleccionado en DOP
  const monthTotal = useMemo(() => {
    return expenses
      .filter((exp) => selectedMonth === 'todos' || exp.date.startsWith(selectedMonth))
      .reduce((sum, exp) => sum + (parseFloat(exp.amount as any) || 0), 0);
  }, [expenses, selectedMonth]);

  // Sumatoria del filtro activo en DOP
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, exp) => sum + (parseFloat(exp.amount as any) || 0),
      0
    );
  }, [filteredExpenses]);

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                Control de Gastos
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Moneda: DOP (RD$)
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Gestor de Control de Egresos
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Registra compras de insumos, empaques, servicios y nómina en pesos dominicanos.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadExpenses}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Refrescar gastos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs sm:text-sm font-semibold transition-all shadow-md shadow-primary-sora/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showAddForm ? 'Cerrar Formulario' : 'Registrar Nuevo Gasto'}</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Resumen del Mes Actual (DOP) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total Gastos {selectedMonth}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-primary-sora flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-primary-sora mt-2">
              {formatCurrency(monthTotal)}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              Sumatoria de egresos registrados en el mes
            </p>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total con Filtro Activo
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-text-sora mt-2">
              {formatCurrency(filteredTotal)}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              {filteredExpenses.length} movimientos en este filtro
            </p>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Usuario Registrador
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-sora/10 text-primary-sora flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base font-bold text-text-sora mt-2 truncate">
              {profile?.full_name || user?.email}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1 capitalize">
              Rol: {role === 'admin' ? 'Administrador' : 'Co-Administrador'}
            </p>
          </div>
        </div>

        {/* FORMULARIO PARA REGISTRAR EGRESOS */}
        {showAddForm && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-border-sora shadow-sora">
            <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-5">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-primary-sora" />
                <h2 className="font-serif font-bold text-lg text-text-sora">
                  Registrar Egreso
                </h2>
              </div>
              <span className="text-xs text-text-sora/50">
                Se vinculará a: <strong>{profile?.full_name || 'Tú'}</strong>
              </span>
            </div>

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Gasto registrado exitosamente en DOP!</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Fecha *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                >
                  <option value="insumos">Insumos</option>
                  <option value="empaques">Empaques</option>
                  <option value="transporte">Transporte</option>
                  <option value="servicios">Servicios</option>
                  <option value="nomina">Nómina</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Monto (RD$ DOP) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    step="5"
                    required
                    placeholder="Ej: 850"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Creado Por (created_by)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
                  <input
                    type="text"
                    disabled
                    value={profile?.full_name || 'Usuario Activo'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/20 text-text-sora/60 text-xs font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Descripción del Egreso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Detalla el producto, insumo o servicio adquirido..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-sora/70 hover:bg-border-sora/40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Egreso'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FILTROS: POR MES Y POR CATEGORÍA */}
        <div className="bg-white/80 p-4 sm:p-5 rounded-2xl border border-border-sora shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-text-sora/70 uppercase tracking-wider whitespace-nowrap">
              Filtrar por Mes:
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary-sora text-white shadow-sm font-semibold'
                    : 'bg-white text-text-sora/70 hover:bg-bg-sora border border-border-sora'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLA INTERACTIVA DE GASTOS */}
        <div className="bg-white/80 rounded-3xl border border-border-sora shadow-sora overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-sora flex items-center justify-between">
            <h3 className="font-serif font-bold text-text-sora text-base">
              Movimientos Registrados ({filteredExpenses.length})
            </h3>
            <span className="text-xs text-text-sora/60">
              Subtotal listado: <strong className="text-primary-sora font-mono">{formatCurrency(filteredTotal)}</strong>
            </span>
          </div>

          <div className="divide-y divide-border-sora/60">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-bg-sora/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-text-sora/50 font-mono">
                      {exp.date}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-bg-sora text-primary-sora border border-border-sora uppercase">
                      {exp.category}
                    </span>
                    {exp.created_by_name && (
                      <span className="text-[11px] text-text-sora/50 flex items-center">
                        <UserIcon className="w-3 h-3 mr-0.5" />
                        {exp.created_by_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text-sora">
                    {exp.description}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <span className="text-base font-bold text-primary-sora font-mono">
                    {formatCurrency(parseFloat(exp.amount as any) || 0)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1 rounded-lg text-text-sora/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar gasto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredExpenses.length === 0 && (
              <div className="p-10 text-center space-y-2 text-xs text-text-sora/50">
                <Receipt className="w-8 h-8 mx-auto text-text-sora/20" />
                <p className="font-semibold text-text-sora/70">No hay gastos registrados en este periodo</p>
                <p>Usa el botón "Registrar Nuevo Gasto" para registrar egresos operativos en DOP.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
