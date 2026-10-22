'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { MenuItem, DishIngredient, InventoryItem } from '@/types/database.types';
import {
  getStoredMenuItems,
  saveStoredMenuItems,
  getStoredInventory,
  calculateDishFoodCost,
  generateUuid,
} from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import {
  UtensilsCrossed,
  PlusCircle,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Plus,
  Minus,
  X,
  ChefHat,
  Sparkles,
  DollarSign,
  Scale,
} from 'lucide-react';

export default function PlatosRecetasPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Modal para Crear o Editar Plato
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);

  // Campos del Plato
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCategory, setDishCategory] = useState('Lasañas');
  const [dishDescription, setDishDescription] = useState('');
  const [dishIsAvailable, setDishIsAvailable] = useState(true);

  // Lista de ingredientes en la receta del plato
  const [recipeIngredients, setRecipeIngredients] = useState<DishIngredient[]>([]);

  // Selector para agregar ingrediente
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('0.5');

  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Cargar platos e inventario
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Insumos de Inventario
      const inv = getStoredInventory();
      setInventoryItems(inv);

      // 2. Platos desde Supabase store_settings o localStorage
      try {
        const { data: menuSetting } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'menu')
          .single();

        if (menuSetting?.value && Array.isArray(menuSetting.value) && menuSetting.value.length > 0) {
          setMenuItems(menuSetting.value);
          saveStoredMenuItems(menuSetting.value);
        } else {
          setMenuItems(getStoredMenuItems());
        }
      } catch (_) {
        setMenuItems(getStoredMenuItems());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar lista completa en Supabase y local
  const persistMenuList = async (updated: MenuItem[]) => {
    setMenuItems(updated);
    saveStoredMenuItems(updated);

    try {
      await supabase.from('store_settings').upsert({
        key: 'menu',
        value: updated,
        updated_at: new Date().toISOString(),
      });
    } catch (_) {}
  };

  // Abrir Modal de Creación
  const handleOpenCreateModal = () => {
    setEditingDish(null);
    setDishName('');
    setDishPrice('350');
    setDishCategory('Lasañas');
    setDishDescription('');
    setDishIsAvailable(true);
    setRecipeIngredients([]);
    setSelectedInventoryId(inventoryItems[0]?.id || '');
    setIngredientQuantity('0.5');
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (dish: MenuItem) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(String(dish.price));
    setDishCategory(dish.category || 'Lasañas');
    setDishDescription(dish.description || '');
    setDishIsAvailable(dish.is_available !== false);
    setRecipeIngredients(dish.ingredients ? [...dish.ingredients] : []);
    setSelectedInventoryId(inventoryItems[0]?.id || '');
    setIngredientQuantity('0.5');
    setIsModalOpen(true);
  };

  // Agregar insumo a la receta en edición
  const handleAddIngredientToRecipe = () => {
    if (!selectedInventoryId) return;
    const invItem = inventoryItems.find((it) => it.id === selectedInventoryId);
    if (!invItem) return;

    const parsedQty = parseFloat(ingredientQuantity);
    if (isNaN(parsedQty) || parsedQty <= 0) return;

    // Verificar si ya está en la receta
    const existingIndex = recipeIngredients.findIndex((ing) => ing.inventory_item_id === invItem.id);
    if (existingIndex >= 0) {
      setRecipeIngredients((prev) =>
        prev.map((ing, idx) =>
          idx === existingIndex ? { ...ing, quantity_required: Math.round((ing.quantity_required + parsedQty) * 100) / 100 } : ing
        )
      );
    } else {
      const newIng: DishIngredient = {
        inventory_item_id: invItem.id,
        name: invItem.name,
        quantity_required: parsedQty,
        unit: invItem.unit,
      };
      setRecipeIngredients((prev) => [...prev, newIng]);
    }
  };

  // Quitar insumo de la receta
  const handleRemoveIngredientFromRecipe = (index: number) => {
    setRecipeIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Guardar Plato
  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;

    const parsedPrice = parseFloat(dishPrice) || 0;
    let updated: MenuItem[];

    if (editingDish) {
      updated = menuItems.map((dish) =>
        dish.id === editingDish.id
          ? {
              ...dish,
              name: dishName.trim(),
              price: parsedPrice,
              category: dishCategory.trim() || 'Lasañas',
              description: dishDescription.trim() || undefined,
              is_available: dishIsAvailable,
              ingredients: recipeIngredients,
            }
          : dish
      );
      setSuccessBanner(`¡Plato "${dishName.trim()}" actualizado con éxito!`);
    } else {
      const newDish: MenuItem = {
        id: generateUuid(),
        name: dishName.trim(),
        price: parsedPrice,
        category: dishCategory.trim() || 'Lasañas',
        description: dishDescription.trim() || undefined,
        is_available: dishIsAvailable,
        ingredients: recipeIngredients,
      };
      updated = [newDish, ...menuItems];
      setSuccessBanner(`¡Nuevo plato "${dishName.trim()}" agregado al catálogo!`);
    }

    persistMenuList(updated);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  // Eliminar Plato
  const handleDeleteDish = (dishId: string, dishName: string) => {
    if (!confirm(`¿Deseas eliminar el plato "${dishName}" del catálogo de venta?`)) return;
    const updated = menuItems.filter((d) => d.id !== dishId);
    persistMenuList(updated);
    setSuccessBanner(`Plato "${dishName}" eliminado.`);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  // Filtros
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return ['todos', ...Array.from(set)];
  }, [menuItems]);

  const filteredDishes = useMemo(() => {
    return menuItems.filter((d) => {
      const matchCat = selectedCategory === 'todos' || d.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cálculos de costo en tiempo real para el modal de edición
  const modalCalculations = useMemo(() => {
    const dummyDish: MenuItem = {
      id: 'preview',
      name: dishName,
      price: parseFloat(dishPrice) || 0,
      ingredients: recipeIngredients,
    };
    return calculateDishFoodCost(dummyDish, inventoryItems);
  }, [dishName, dishPrice, recipeIngredients, inventoryItems]);

  // Métricas Generales
  const totalDishes = menuItems.length;
  const dishesWithRecipe = menuItems.filter((d) => d.ingredients && d.ingredients.length > 0).length;

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Cocina Sora • Menú & Fichas Técnicas
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Recetas & Costo de Materia Prima
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Catálogo de Platos & Recetas
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Configura los platos a la venta, asocia los insumos que lleva cada uno y descuenta stock automáticamente.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Refrescar catálogo"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs sm:text-sm font-semibold transition-all shadow-md shadow-primary-sora/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuevo Plato</span>
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

        {/* TARJETAS RESUMEN DE PLATOS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Platos Registrados
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-sora/10 text-primary-sora flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-text-sora mt-2">{totalDishes}</p>
            <p className="text-[11px] text-text-sora/50 mt-1">Disponibles para venta en mostrador y delivery</p>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Recetas con Ficha Técnica
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-emerald-700 mt-2">
              {dishesWithRecipe} de {totalDishes}
            </p>
            <p className="text-[11px] text-text-sora/50 mt-1">Descuentan stock de queso, carne y empaques</p>
          </div>

          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white/80 border border-border-sora shadow-sora">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-sora/60 uppercase tracking-wider">
                Control de Insumos Activo
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-serif font-bold text-amber-700 mt-2">100%</p>
            <p className="text-[11px] text-text-sora/50 mt-1">Cálculo de rentabilidad y margen en tiempo real</p>
          </div>
        </div>

        {/* BUSCADOR Y FILTROS POR CATEGORÍA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-sora/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar plato por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl border border-border-sora bg-white text-xs sm:text-sm text-text-sora placeholder:text-text-sora/40 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora shadow-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                  selectedCategory === cat
                    ? 'bg-primary-sora text-white shadow-sm font-semibold'
                    : 'bg-white text-text-sora/70 hover:bg-bg-sora border border-border-sora'
                }`}
              >
                {cat === 'todos' ? 'Todos los platos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE PLATOS Y FICHAS TÉCNICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredDishes.map((dish) => {
            const costData = calculateDishFoodCost(dish, inventoryItems);
            const hasIngredients = dish.ingredients && dish.ingredients.length > 0;

            return (
              <div
                key={dish.id}
                className="bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora hover:shadow-sora-hover transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Encabezado del plato */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-border-sora/80 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-bg-sora border border-border-sora text-text-sora/70">
                          {dish.category || 'Lasañas'}
                        </span>
                        {dish.is_available === false && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            Agotado / No disponible
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-lg text-text-sora mt-1 truncate">
                        {dish.name}
                      </h3>
                      {dish.description && (
                        <p className="text-xs text-text-sora/60 mt-0.5 line-clamp-2">
                          {dish.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(dish)}
                        className="p-2 rounded-xl text-text-sora/60 hover:text-primary-sora hover:bg-bg-sora transition-colors"
                        title="Editar plato y receta"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDish(dish.id, dish.name)}
                        className="p-2 rounded-xl text-text-sora/40 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar plato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Resumen de Rentabilidad y Precios */}
                  <div className="grid grid-cols-3 gap-2 py-3 bg-bg-sora/50 rounded-2xl px-3 my-3 text-center border border-border-sora/60">
                    <div>
                      <span className="text-[10px] font-semibold text-text-sora/50 uppercase block">
                        Precio Venta
                      </span>
                      <span className="font-serif font-bold text-sm sm:text-base text-primary-sora">
                        {formatCurrency(dish.price)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-text-sora/50 uppercase block">
                        Costo Insumos
                      </span>
                      <span className="font-serif font-bold text-sm sm:text-base text-text-sora/80">
                        {hasIngredients ? formatCurrency(costData.totalCost) : 'Sin calcular'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-text-sora/50 uppercase block">
                        Margen Bruto
                      </span>
                      <span className={`font-serif font-bold text-sm sm:text-base ${costData.profitMarginPercent >= 50 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {hasIngredients ? `${costData.profitMarginPercent}%` : '---'}
                      </span>
                    </div>
                  </div>

                  {/* Insumos de la Receta */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-text-sora/70 uppercase tracking-wider flex items-center">
                      <Boxes className="w-3.5 h-3.5 mr-1 text-primary-sora" />
                      Insumos por Porción ({dish.ingredients?.length || 0})
                    </span>

                    {hasIngredients ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {dish.ingredients!.map((ing, idx) => {
                          const invItem = inventoryItems.find((it) => it.id === ing.inventory_item_id);
                          const subCost = invItem?.cost_per_unit ? ing.quantity_required * invItem.cost_per_unit : null;

                          return (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-white border border-border-sora/70 flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-text-sora truncate max-w-xs">
                                {ing.name}
                              </span>
                              <div className="flex items-center space-x-2 text-text-sora/60 flex-shrink-0">
                                <span className="font-mono font-bold text-primary-sora bg-primary-sora/5 px-2 py-0.5 rounded">
                                  {ing.quantity_required} {ing.unit}
                                </span>
                                {subCost !== null && (
                                  <span className="text-[10px] text-text-sora/40">
                                    ({formatCurrency(subCost)})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-center justify-between">
                        <span>Aún no has configurado los insumos de este plato.</span>
                        <button
                          onClick={() => handleOpenEditModal(dish)}
                          className="font-bold underline ml-2 hover:text-amber-950"
                        >
                          Configurar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border-sora/60 flex items-center justify-between text-[11px] text-text-sora/50">
                  <span>Descuenta stock al cocinar</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Sincronizado
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDishes.length === 0 && (
          <div className="p-12 text-center bg-white/80 rounded-3xl border border-border-sora shadow-sm space-y-3">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-text-sora/30" />
            <h3 className="text-base font-bold text-text-sora">No se encontraron platos</h3>
            <p className="text-xs text-text-sora/60 max-w-sm mx-auto">
              Crea tu primer plato o receta para gestionar precios e insumos de cocina.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear Primer Plato</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PLATO Y FICHA TÉCNICA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-border-sora flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border-sora/80 bg-bg-sora/40">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary-sora/10 text-primary-sora flex items-center justify-center">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-text-sora">
                    {editingDish ? `Editar Plato: ${editingDish.name}` : 'Crear Nuevo Plato'}
                  </h3>
                  <p className="text-xs text-text-sora/60">
                    Define precio de venta y las porciones de insumos a descontar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <form onSubmit={handleSaveDish} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Nombre del Plato *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Lasaña Casera Especial"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Precio de Venta (RD$ DOP) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="Ej: 350"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs font-bold text-primary-sora focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lasañas, Guarniciones, Postres"
                    value={dishCategory}
                    onChange={(e) => setDishCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Descripción del Plato
                  </label>
                  <input
                    type="text"
                    placeholder="Breve descripción artesanal que verá el equipo"
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/30 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20"
                  />
                </div>
              </div>

              {/* SECCIÓN DE FICHA TÉCNICA (INSUMOS) */}
              <div className="pt-3 border-t border-border-sora space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Boxes className="w-4 h-4 text-primary-sora" />
                    <span className="text-xs font-bold text-text-sora uppercase tracking-wider">
                      Ficha Técnica: Insumos de la Receta
                    </span>
                  </div>
                  <span className="text-[11px] text-text-sora/60">
                    Se restan del inventario al cocinar
                  </span>
                </div>

                {/* Selector rápido para añadir insumo a la receta */}
                <div className="p-3.5 rounded-2xl bg-bg-sora/50 border border-border-sora space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-text-sora/70 mb-1">
                        Insumo de Cocina o Empaque:
                      </label>
                      <select
                        value={selectedInventoryId}
                        onChange={(e) => setSelectedInventoryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-sora"
                      >
                        {inventoryItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.unit}) {it.cost_per_unit ? `- RD$ ${it.cost_per_unit}/${it.unit}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-text-sora/70 mb-1">
                        Cantidad por plato:
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        value={ingredientQuantity}
                        onChange={(e) => setIngredientQuantity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-sora"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddIngredientToRecipe}
                        className="w-full py-2 px-3 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover transition-all flex items-center justify-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sumar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de insumos actuales en la receta */}
                <div className="space-y-1.5">
                  {recipeIngredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-border-sora flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-text-sora">{ing.name}</span>
                        <span className="text-primary-sora font-mono font-bold bg-primary-sora/5 px-2 py-0.5 rounded">
                          {ing.quantity_required} {ing.unit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientFromRecipe(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Quitar de la receta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {recipeIngredients.length === 0 && (
                    <p className="text-xs text-text-sora/50 text-center py-3 italic">
                      No has agregado insumos a esta receta aún.
                    </p>
                  )}
                </div>

                {/* Resumen de costos en tiempo real */}
                {recipeIngredients.length > 0 && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-emerald-950 font-bold block">
                        Costo Insumos (Food Cost): {formatCurrency(modalCalculations.totalCost)}
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        Ganancia estimada: <strong>{formatCurrency(modalCalculations.profitMarginDop)}</strong> por porción
                      </span>
                    </div>
                    <span className="font-serif font-bold text-emerald-800 text-base">
                      {modalCalculations.profitMarginPercent}% Margen
                    </span>
                  </div>
                )}
              </div>

              {/* Pie del modal */}
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
                  {editingDish ? 'Guardar Cambios' : 'Registrar Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppNavigation>
  );
}
