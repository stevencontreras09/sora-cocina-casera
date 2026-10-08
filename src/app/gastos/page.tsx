'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { Expense, ExpenseCategory } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import {
  Receipt,
  PlusCircle,
  TrendingDown,
  Filter,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  User as UserIcon,
  Trash2,
  FileText,
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

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'gst-01',
    description: 'Compra semanal de carnes (tapapecho y carne molida 15kg)',
    amount: 85000,
    category: 'insumos',
    date: '2026-10-08',
    created_by_name: 'Administrador Sora',
  },
  {
    id: 'gst-02',
    description: 'Verduras frescas La Vega (choclos, cebollas, papas, cilantro)',
    amount: 42000,
    category: 'insumos',
    date: '2026-10-07',
    created_by_name: 'Co-Administrador Turno',
  },
  {
    id: 'gst-03',
    description: '500 recipientes térmicos biodegradables y bolsas kraft',
    amount: 38500,
    category: 'empaques',
    date: '2026-10-06',
    created_by_name: 'Administrador Sora',
  },
  {
    id: 'gst-04',
    description: 'Bencina y recarga tarjeta de transporte para móviles',
    amount: 25000,
    category: 'transporte',
    date: '2026-10-05',
    created_by_name: 'Co-Administrador Turno',
  },
  {
    id: 'gst-05',
    description: 'Recarga balón de gas cocina 45kg y agua purificada',
    amount: 54000,
    category: 'servicios',
    date: '2026-10-04',
    created_by_name: 'Administrador Sora',
  },
  {
    id: 'gst-06',
    description: 'Anticipo nómina ayudante de cocina turno fin de semana',
    amount: 60000,
    category: 'nomina',
    date: '2026-10-03',
    created_by_name: 'Administrador Sora',
  },
  {
    id: 'gst-07',
    description: 'Insumos de limpieza y sanitización cocina',
    amount: 18900,
    category: 'otros',
    date: '2026-10-02',
    created_by_name: 'Co-Administrador Turno',
  },
  {
    id: 'gst-08',
    description: 'Compra harina y manteca para pan amasado',
    amount: 28000,
    category: 'insumos',
    date: '2026-09-28',
    created_by_name: 'Administrador Sora',
  },
  {
    id: 'gst-09',
    description: 'Cajas de reparto térmico adicionales',
    amount: 22000,
    category: 'empaques',
    date: '2026-09-20',
    created_by_name: 'Administrador Sora',
  },
];

export default function GastosPage() {
  const { user, profile, role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'todos'>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10'); // YYYY-MM
  const [showAddForm, setShowAddForm] = useState(false);

  // Estados del formulario
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('insumos');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar de Supabase
  useEffect(() => {
    async function loadExpenses() {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data && data.length > 0) {
          setExpenses(data as Expense[]);
        }
      } catch (err) {
        console.warn('Gastos en modo local');
      }
    }
    loadExpenses();
  }, [supabase]);

  // Manejar creación de gasto vinculando created_by
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsSubmitting(true);
    const newExpense: Expense = {
      id: `gst-${Date.now().toString().slice(-4)}`,
      description: description.trim(),
      amount: parseFloat(amount),
      category: category,
      date: date,
      created_by: user?.id,
      created_by_name: profile?.full_name || user?.email?.split('@')[0] || 'Personal Sora',
    };

    try {
      await supabase.from('expenses').insert([
        {
          description: description.trim(),
          amount: parseFloat(amount),
          category: category,
          date: date,
          created_by: user?.id || null,
          created_by_name: profile?.full_name || 'Personal Sora',
        },
      ]);
    } catch (err) {
      console.warn('Guardado local de gasto');
    }

    setExpenses([newExpense, ...expenses]);
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
    try {
      await supabase.from('expenses').delete().eq('id', id);
    } catch (err) {
      console.warn('Eliminado local');
    }
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // Filtrado interactivo por Mes y Categoría
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchMonth = selectedMonth === 'todos' || exp.date.startsWith(selectedMonth);
      const matchCategory = selectedCategory === 'todos' || exp.category === selectedCategory;
      return matchMonth && matchCategory;
    });
  }, [expenses, selectedMonth, selectedCategory]);

  // Sumatoria de gastos del mes seleccionado
  const monthTotal = useMemo(() => {
    return expenses
      .filter((exp) => selectedMonth === 'todos' || exp.date.startsWith(selectedMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses, selectedMonth]);

  // Sumatoria del filtro activo
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  return (
    <AppNavigation>
      <div className="space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                Control de Gastos
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Acceso autorizado: Admin y Coadmin
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Gestor de Control de Egresos
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Registra compras de insumos, empaques, transporte, nómina y servicios de Sora.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs sm:text-sm font-semibold transition-all shadow-md shadow-primary-sora/20 active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showAddForm ? 'Cerrar Formulario' : 'Registrar Nuevo Gasto'}</span>
          </button>
        </div>

        {/* Tarjetas de Resumen del Mes Actual */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* SUMATORIA DE GASTOS DEL MES ACTUAL */}
          <div className="p-5 rounded-2xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total Gastos {selectedMonth}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-primary-sora flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-primary-sora mt-2">
              ${monthTotal.toLocaleString('es-CL')}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              Sumatoria de egresos registrados en el mes
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total con Filtro Activo
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-text-sora mt-2">
              ${filteredTotal.toLocaleString('es-CL')}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              {filteredExpenses.length} movimientos en este filtro
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Usuario Activo
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
          <div className="p-6 rounded-3xl bg-white border border-border-sora shadow-sora">
            <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-5">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-primary-sora" />
                <h2 className="font-serif text-lg font-bold text-text-sora">
                  Registrar Egreso
                </h2>
              </div>
              <span className="text-xs text-text-sora/50">
                Se vinculará a tu usuario: <strong>{profile?.full_name || 'Tú'}</strong>
              </span>
            </div>

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Gasto registrado exitosamente con created_by vinculado!</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Fecha */}
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

              {/* Categoría requerida */}
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

              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Monto ($ CLP) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej: 35000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                  />
                </div>
              </div>

              {/* Usuario creador (read-only informativo) */}
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

              {/* Descripción */}
              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Descripción del Egreso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Detalla la compra, insumo o servicio adquirido..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                />
              </div>

              {/* Botones */}
              <div className="sm:col-span-2 md:col-span-4 flex justify-end space-x-2 pt-2">
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
          {/* Selector de Mes */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-text-sora/70 uppercase tracking-wider whitespace-nowrap">
              Filtrar por Mes:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
            >
              <option value="2026-10">Octubre 2026</option>
              <option value="2026-09">Septiembre 2026</option>
              <option value="2026-08">Agosto 2026</option>
              <option value="todos">Todos los meses</option>
            </select>
          </div>

          {/* Selector de Categorías (Pastillas) */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
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
              Subtotal listado: <strong className="text-primary-sora">${filteredTotal.toLocaleString('es-CL')}</strong>
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
                    ${exp.amount.toLocaleString('es-CL')}
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
              <div className="p-8 text-center text-xs text-text-sora/50">
                No se encontraron gastos en el mes o categoría seleccionada.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
