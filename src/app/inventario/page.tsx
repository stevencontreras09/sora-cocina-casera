'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { InventoryItem, InventoryUnit } from '@/types/database.types';
import {
  getStoredInventory,
  saveStoredInventory,
  DEFAULT_INVENTORY_ITEMS,
  generateUuid,
} from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Package,
  Scale,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  TrendingUp,
  X,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'todos', label: 'Todos los Artículos' },
  { id: 'insumos', label: 'Insumos de Cocina' },
  { id: 'empaques', label: 'Empaques y Despacho' },
  { id: 'otros', label: 'Otros Materiales' },
];

export default function InventarioPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Modal para crear o editar insumo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Formulario
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'insumos' | 'empaques' | 'otros'>('insumos');
  const [unit, setUnit] = useState<InventoryUnit>('lb');
  const [currentStock, setCurrentStock] = useState<string>('');
  const [minAlertStock, setMinAlertStock] = useState<string>('');
  const [costPerUnit, setCostPerUnit] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Cargar inventario desde Supabase store_settings o respaldo local
  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'inventory')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        setItems(data.value);
        saveStoredInventory(data.value);
      } else {
        const cached = getStoredInventory();
        setItems(cached);
      }
    } catch (err) {
      const cached = getStoredInventory();
      setItems(cached);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveInventoryList = async (updated: InventoryItem[]) => {
    setItems(updated);
    saveStoredInventory(updated);

    try {
      await supabase.from('store_settings').upsert({
        key: 'inventory',
        value: updated,
        updated_at: new Date().toISOString(),
      });
    } catch (_) {}
  };

  // Ajuste rápido de stock (+ / -)
  const handleQuickAdjust = (itemId: string, delta: number) => {
    const updated = items.map((it) => {
      if (it.id === itemId) {
        const newStock = Math.max(0, Math.round((it.current_stock + delta) * 10) / 10);
        return {
          ...it,
          current_stock: newStock,
          last_restocked_at: delta > 0 ? new Date().toISOString() : it.last_restocked_at,
        };
      }
      return it;
    });

    saveInventoryList(updated);
  };

  // Abrir modal para crear
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setName('');
    setCategory('insumos');
    setUnit('lb');
    setCurrentStock('');
    setMinAlertStock('10');
    setCostPerUnit('');
    setNotes('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setCurrentStock(String(item.current_stock));
    setMinAlertStock(String(item.min_alert_stock));
    setCostPerUnit(item.cost_per_unit ? String(item.cost_per_unit) : '');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  // Guardar insumo
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedStock = parseFloat(currentStock) || 0;
    const parsedMin = parseFloat(minAlertStock) || 5;
    const parsedCost = parseFloat(costPerUnit) || 0;

    let updated: InventoryItem[];

    if (editingItem) {
      updated = items.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              name: name.trim(),
              category,
              unit,
              current_stock: parsedStock,
              min_alert_stock: parsedMin,
              cost_per_unit: parsedCost > 0 ? parsedCost : undefined,
              notes: notes.trim() || undefined,
              updated_at: new Date().toISOString(),
            }
          : it
      );
      setSuccessBanner(`¡Artículo "${name.trim()}" actualizado con éxito!`);
    } else {
      const newItem: InventoryItem = {
        id: generateUuid(),
        name: name.trim(),
        category,
        unit,
        current_stock: parsedStock,
        min_alert_stock: parsedMin,
        cost_per_unit: parsedCost > 0 ? parsedCost : undefined,
        notes: notes.trim() || undefined,
        created_at: new Date().toISOString(),
      };
      updated = [newItem, ...items];
      setSuccessBanner(`¡Artículo "${name.trim()}" agregado al inventario!`);
    }

    saveInventoryList(updated);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  // Eliminar insumo
  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (!confirm(`¿Deseas eliminar "${itemName}" del inventario?`)) return;
    const updated = items.filter((it) => it.id !== itemId);
    saveInventoryList(updated);
    setSuccessBanner(`Artículo "${itemName}" eliminado.`);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  // Filtrado de inventario
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesCat = selectedCategory === 'todos' || it.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || it.name.toLowerCase().includes(q) || (it.notes && it.notes.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Métricas de inventario
  const totalItemsCount = items.length;
  const lowStockCount = items.filter((it) => it.current_stock <= it.min_alert_stock).length;
  const totalValueEstimated = items.reduce(
    (sum, it) => sum + it.current_stock * (it.cost_per_unit || 0),
    0
  );

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Cocina Sora • Control de Stock
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Insumos & Empaques
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Inventario de Cocina Casera
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Controla existencias de queso, carne, pastas y empaques en libras, kilos y unidades.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadInventory}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Refrescar inventario"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs sm:text-sm font-semibold transition-all shadow-md shadow-primary-sora/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuevo Artículo</span>
            </button>
          </div>
        </div>

        {/* NOTIFICACIÓN FLASH */}
        {successBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
        )}

        {/* TARJETAS DE RESUMEN GERENCIAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Total Artículos Registrados
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-sora/10 text-primary-sora flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-text-sora mt-2">
              {totalItemsCount}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              Insumos activos en despensa y refrigeradores
            </p>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Stock Bajo / Reorden
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-2xl font-serif font-bold mt-2 ${lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {lowStockCount} {lowStockCount === 1 ? 'insumo' : 'insumos'}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              {lowStockCount > 0 ? 'Requieren compra inmediata en compras/gastos' : 'Todos los insumos con stock suficiente'}
            </p>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Valoración Total de Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-primary-sora mt-2">
              {formatCurrency(totalValueEstimated)}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">
              Costo estimado de materia prima almacenada
            </p>
          </div>
        </div>

        {/* FILTROS & BÚSQUEDA */}
        <div className="bg-white/80 p-4 sm:p-5 rounded-2xl border border-border-sora shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre (ej. Queso, Carne, Envase)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
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

        {/* TABLA / TARJETAS DE INVENTARIO */}
        <div className="bg-white/80 rounded-3xl border border-border-sora shadow-sora overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-sora flex items-center justify-between">
            <h3 className="font-serif font-bold text-text-sora text-base">
              Listado de Existencias ({filteredItems.length})
            </h3>
            <span className="text-xs text-text-sora/60">
              Sora Cocina Casera • Santo Domingo
            </span>
          </div>

          <div className="divide-y divide-border-sora/60">
            {filteredItems.map((item) => {
              const isLow = item.current_stock <= item.min_alert_stock;
              const isWarning =
                !isLow && item.current_stock <= item.min_alert_stock * 1.5;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-bg-sora/30 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-sm font-bold text-text-sora">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-bg-sora border border-border-sora text-text-sora/70">
                        {item.category}
                      </span>
                      {isLow ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Stock Bajo (Mín: {item.min_alert_stock} {item.unit})
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Reorden cercano
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Stock Óptimo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-text-sora/60">
                      <span>
                        Mínimo de alerta: <strong>{item.min_alert_stock} {item.unit}</strong>
                      </span>
                      {item.cost_per_unit && (
                        <span>
                          Costo aprox: <strong>RD$ {item.cost_per_unit}/{item.unit}</strong>
                        </span>
                      )}
                      {item.notes && (
                        <span className="italic truncate max-w-xs">{item.notes}</span>
                      )}
                    </div>
                  </div>

                  {/* CONTROL DE STOCK Y BOTONES RÁPIDOS */}
                  <div className="flex items-center space-x-3 sm:space-x-5 justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-xs text-text-sora/50 font-semibold uppercase block">
                        Existencia Actual
                      </span>
                      <span className={`font-serif font-bold text-lg sm:text-xl ${isLow ? 'text-rose-600' : 'text-text-sora'}`}>
                        {item.current_stock} <span className="text-sm font-normal text-text-sora/60">{item.unit}</span>
                      </span>
                    </div>

                    {/* Botones de ajuste rápido +/- */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleQuickAdjust(item.id, -1)}
                        className="w-8 h-8 rounded-xl bg-bg-sora hover:bg-border-sora text-text-sora flex items-center justify-center font-bold text-sm transition-all active:scale-95"
                        title="Descontar 1 unidad/libra"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item.id, 1)}
                        className="w-8 h-8 rounded-xl bg-primary-sora text-white hover:bg-primary-hover flex items-center justify-center font-bold text-sm transition-all shadow-xs active:scale-95"
                        title="Sumar 1 unidad/libra"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Acciones de edición */}
                    <div className="flex items-center space-x-1 pl-2 border-l border-border-sora">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-2 rounded-xl text-text-sora/60 hover:text-primary-sora hover:bg-bg-sora transition-colors"
                        title="Editar artículo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-2 rounded-xl text-text-sora/40 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar artículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="p-12 text-center space-y-2 text-xs text-text-sora/50">
                <Boxes className="w-9 h-9 mx-auto text-text-sora/25" />
                <p className="font-semibold text-text-sora/70 text-sm">No se encontraron artículos en este filtro</p>
                <p>Usa el botón "Nuevo Artículo" para registrar materia prima o empaques.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR INSUMO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-border-sora shadow-sora overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-bg-sora/60 border-b border-border-sora flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Boxes className="w-5 h-5 text-primary-sora" />
                <h3 className="font-serif font-bold text-lg text-text-sora">
                  {editingItem ? 'Editar Artículo' : 'Nuevo Artículo en Inventario'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-text-sora/50 hover:bg-border-sora/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Nombre del Insumo / Empaque *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Queso Mozzarella, Carne Molida, Envases..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Categoría *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  >
                    <option value="insumos">Insumos de Cocina</option>
                    <option value="empaques">Empaques / Despacho</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Unidad de Medida *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as InventoryUnit)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  >
                    <option value="lb">Libras (lb)</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="ud">Unidades (ud)</option>
                    <option value="paq">Paquetes (paq)</option>
                    <option value="L">Litros (L)</option>
                    <option value="gal">Galones (gal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    placeholder="Ej: 25.0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Mínimo de Alerta *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    placeholder="Ej: 8.0"
                    value={minAlertStock}
                    onChange={(e) => setMinAlertStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Costo Promedio Unitario (RD$ DOP)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Ej: 195 por libra"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                  Notas / Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Ej: Comprar en mercado central, marca preferida..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border-sora">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-sora/70 hover:bg-border-sora/40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  {editingItem ? 'Guardar Cambios' : 'Agregar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppNavigation>
  );
}
