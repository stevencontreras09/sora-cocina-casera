'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MenuItem, OrderItem } from '@/types/database.types';
import { formatCurrency } from '@/lib/utils';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Search,
  Check,
  LayoutGrid,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

export interface ParsedVariant {
  id: string;
  dish: MenuItem;
  sizeLabel: string;
  fullName: string;
  price: number;
}

export interface DishGroup {
  key: string;
  name: string;
  iconEmoji: string;
  variants: ParsedVariant[];
  minPrice: number;
  maxPrice: number;
}

export function parseDishVariant(dish: MenuItem): { baseName: string; sizeLabel: string } {
  const name = (dish.name || '').trim();

  // 1. Coincidencia con paréntesis o corchetes: "Lasaña (1 lb personal)" -> base: "Lasaña", size: "1 lb personal"
  const parenMatch = name.match(/^(.*?)\s*[\(\[](.*?)[\)\]]$/);
  if (parenMatch) {
    let base = parenMatch[1].trim();
    const variant = parenMatch[2].trim();
    // Normalizar singular/plural común como "Pastel en Hoja" vs "Pasteles en Hoja"
    if (base.toLowerCase() === 'pastel en hoja' || base.toLowerCase() === 'pasteles en hoja') {
      base = 'Pasteles en Hoja';
    }
    return { baseName: base, sizeLabel: variant };
  }

  // 2. Coincidencia con guión si especifica tamaño: "Pastelón - 1 lb"
  const dashMatch = name.match(
    /^(.*?)\s*-\s*(1\s*lb.*|2\s*lb.*|bandeja.*|docena.*|unidad.*|familiar|individual|personal)$/i
  );
  if (dashMatch) {
    let base = dashMatch[1].trim();
    const variant = dashMatch[2].trim();
    return { baseName: base, sizeLabel: variant };
  }

  // 3. Fallback: plato sin especificación explícita de tamaño
  return { baseName: name, sizeLabel: 'Porción Regular' };
}

export function groupDishes(menuItems: MenuItem[]): DishGroup[] {
  const groupMap = new Map<string, DishGroup>();

  menuItems.forEach((dish) => {
    const { baseName, sizeLabel } = parseDishVariant(dish);
    const key = baseName.toLowerCase();

    let group = groupMap.get(key);
    if (!group) {
      let iconEmoji = '🍽️';
      const lower = baseName.toLowerCase();
      if (lower.includes('lasa')) iconEmoji = '🍲';
      else if (lower.includes('papa')) iconEmoji = '🥔';
      else if (lower.includes('berenjena')) iconEmoji = '🍆';
      else if (lower.includes('plátano') || lower.includes('platano')) iconEmoji = '🍌';
      else if (lower.includes('hoja')) iconEmoji = '🍃';
      else if (lower.includes('chivo') || lower.includes('carne') || lower.includes('pollo')) iconEmoji = '🍖';
      else if (lower.includes('ensalada')) iconEmoji = '🥗';
      else if (lower.includes('postre') || lower.includes('flan') || lower.includes('dulce')) iconEmoji = '🍰';

      group = {
        key,
        name: baseName,
        iconEmoji,
        variants: [],
        minPrice: dish.price,
        maxPrice: dish.price,
      };
      groupMap.set(key, group);
    }

    group.variants.push({
      id: dish.id || dish.name,
      dish,
      sizeLabel,
      fullName: dish.name,
      price: dish.price,
    });

    if (dish.price < group.minPrice) group.minPrice = dish.price;
    if (dish.price > group.maxPrice) group.maxPrice = dish.price;
  });

  return Array.from(groupMap.values());
}

interface DynamicDishSelectorProps {
  menuItems: MenuItem[];
  orderItems: OrderItem[];
  onSelectDish: (dishName: string, price: number) => void;
  onUpdateQuantity?: (dishName: string, price: number, delta: number) => void;
  onOpenMenuManager: () => void;
  onAddNewLine: () => void;
}

export function DynamicDishSelector({
  menuItems,
  orderItems,
  onSelectDish,
  onUpdateQuantity,
  onOpenMenuManager,
  onAddNewLine,
}: DynamicDishSelectorProps) {
  const [activeGroupKey, setActiveGroupKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'all'>('grouped');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Agrupamiento dinámico de los platos
  const dishGroups = useMemo(() => groupDishes(menuItems), [menuItems]);

  // Si no hay grupo activo o el grupo ya no existe, seleccionar el primero
  useEffect(() => {
    if (dishGroups.length > 0) {
      const exists = dishGroups.some((g) => g.key === activeGroupKey);
      if (!exists) {
        setActiveGroupKey(dishGroups[0].key);
      }
    } else {
      setActiveGroupKey('');
    }
  }, [dishGroups, activeGroupKey]);

  // Grupo actualmente seleccionado
  const currentGroup = useMemo(() => {
    return dishGroups.find((g) => g.key === activeGroupKey) || dishGroups[0] || null;
  }, [dishGroups, activeGroupKey]);

  // Helper para saber cuántos de una variante están actualmente en el pedido
  const getVariantQuantity = (fullName: string, price: number): number => {
    const item = orderItems.find(
      (it) => it.name.trim().toLowerCase() === fullName.trim().toLowerCase() && it.price === price
    );
    return item ? item.quantity : 0;
  };

  // Helper para calcular total de unidades de un grupo en el pedido
  const getGroupTotalQuantity = (group: DishGroup): number => {
    let total = 0;
    group.variants.forEach((v) => {
      total += getVariantQuantity(v.fullName, v.price);
    });
    return total;
  };

  // Disparar feedback temporal
  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  const handleVariantClick = (variant: ParsedVariant) => {
    onSelectDish(variant.fullName, variant.price);
    triggerFeedback(`+1 ${variant.fullName}`);
  };

  const handleQuantityAdjust = (variant: ParsedVariant, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateQuantity) {
      onUpdateQuantity(variant.fullName, variant.price, delta);
      triggerFeedback(`${delta > 0 ? '+1' : '-1'} ${variant.fullName}`);
    } else {
      if (delta > 0) {
        onSelectDish(variant.fullName, variant.price);
      }
    }
  };

  // Filtro de búsqueda rápido
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;

    const results: { group: DishGroup; variant: ParsedVariant }[] = [];
    dishGroups.forEach((group) => {
      group.variants.forEach((variant) => {
        if (
          variant.fullName.toLowerCase().includes(q) ||
          variant.sizeLabel.toLowerCase().includes(q) ||
          group.name.toLowerCase().includes(q)
        ) {
          results.push({ group, variant });
        }
      });
    });
    return results;
  }, [searchQuery, dishGroups]);

  return (
    <div className="space-y-2.5">
      {/* Barra superior: Título, Gestión y Agregar Línea */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <label className="block text-xs font-bold text-text-sora/90 uppercase tracking-wider">
            4. Platos del Menú *
          </label>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-sora/10 text-primary-sora font-semibold">
            {dishGroups.length} variedades · {menuItems.length} tamaños
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Alternar modo de vista (Agrupado vs Todos) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grouped' ? 'all' : 'grouped')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all ${
              viewMode === 'grouped'
                ? 'bg-white border-border-sora text-text-sora hover:bg-bg-sora'
                : 'bg-primary-sora/10 border-primary-sora/30 text-primary-sora'
            }`}
            title={viewMode === 'grouped' ? 'Ver todos desplegados' : 'Ver agrupado por plato'}
          >
            {viewMode === 'grouped' ? (
              <>
                <Layers className="w-3.5 h-3.5 text-primary-sora" />
                <span className="hidden sm:inline">Agrupado</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-primary-sora" />
                <span className="hidden sm:inline">Ver Todos</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenMenuManager}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-bg-sora hover:bg-border-sora/60 border border-border-sora text-text-sora/80 text-xs font-semibold transition-colors"
            title="Agregar, editar o eliminar platos del catálogo"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-primary-sora" />
            <span>Gestionar Menú ({menuItems.length})</span>
          </button>

          <button
            type="button"
            onClick={onAddNewLine}
            className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:underline px-1 py-1"
            title="Agregar una línea personalizada vacía al pedido"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Línea</span>
          </button>
        </div>
      </div>

      {/* Buscador Rápido de Platos o Tamaños */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-text-sora/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar plato o tamaño (ej. 2 lb, bandeja de 4, berenjena, docena)..."
            className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-border-sora bg-white text-xs text-text-sora placeholder:text-text-sora/40 focus:outline-none focus:ring-1 focus:ring-primary-sora transition-shadow"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-text-sora/40 hover:text-text-sora transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Feedback flotante cuando se agrega un plato */}
        {feedback && (
          <div className="absolute right-2 -bottom-7 z-10 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md flex items-center space-x-1 animate-in fade-in slide-in-from-top-1">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* RESULTADOS DE BÚSQUEDA (Si hay texto en el buscador) */}
      {searchResults !== null ? (
        <div className="p-3 rounded-2xl bg-white border border-border-sora space-y-2">
          <div className="flex items-center justify-between text-xs text-text-sora/70 pb-1 border-b border-border-sora/60">
            <span>
              Resultados para &quot;<strong className="text-text-sora">{searchQuery}</strong>&quot; ({searchResults.length})
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-primary-sora hover:underline font-semibold"
            >
              Limpiar búsqueda
            </button>
          </div>

          {searchResults.length === 0 ? (
            <p className="text-xs text-text-sora/50 py-3 text-center italic">
              No se encontraron platos o tamaños que coincidan con &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {searchResults.map(({ group, variant }) => {
                const qty = getVariantQuantity(variant.fullName, variant.price);
                const isInOrder = qty > 0;

                return (
                  <div
                    key={`search-${variant.id}`}
                    onClick={() => handleVariantClick(variant)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isInOrder
                        ? 'bg-primary-sora/10 border-primary-sora/50 shadow-2xs'
                        : 'bg-bg-sora/40 hover:bg-primary-sora/5 hover:border-primary-sora/30 border-border-sora'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1 text-xs font-bold text-text-sora">
                        <span>{group.iconEmoji}</span>
                        <span className="truncate">{variant.fullName}</span>
                      </div>
                      <div className="text-[11px] text-primary-sora font-mono font-bold mt-0.5">
                        {formatCurrency(variant.price)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {isInOrder ? (
                        <div className="flex items-center space-x-1 bg-white rounded-lg border border-primary-sora/30 px-1 py-0.5 shadow-2xs">
                          {onUpdateQuantity && (
                            <button
                              type="button"
                              onClick={(e) => handleQuantityAdjust(variant, -1, e)}
                              className="p-1 rounded hover:bg-red-50 text-text-sora hover:text-red-600 transition-colors"
                              title="Restar 1"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                          <span className="px-1 text-xs font-extrabold text-primary-sora font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleQuantityAdjust(variant, 1, e)}
                            className="p-1 rounded hover:bg-emerald-50 text-text-sora hover:text-emerald-600 transition-colors"
                            title="Sumar 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-white border border-border-sora text-primary-sora text-[11px] font-bold shadow-2xs">
                          <Plus className="w-3 h-3" />
                          <span>Agregar</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : viewMode === 'all' ? (
        /* VISTA DESPLEGADA TRADICIONAL / COMPLETA */
        <div className="flex flex-wrap gap-1.5 pb-1 max-h-60 overflow-y-auto p-1 rounded-xl bg-bg-sora/30 border border-border-sora">
          {menuItems.map((dish) => {
            const qty = getVariantQuantity(dish.name, dish.price);
            const isInOrder = qty > 0;
            return (
              <button
                key={dish.id || dish.name}
                type="button"
                onClick={() => onSelectDish(dish.name, dish.price)}
                className={`text-[11px] px-2.5 py-1.5 rounded-xl font-semibold border transition-all shadow-2xs flex items-center space-x-1.5 ${
                  isInOrder
                    ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                    : 'bg-white hover:bg-primary-sora/10 hover:border-primary-sora/40 text-text-sora border-border-sora'
                }`}
              >
                <Plus className={`w-3 h-3 ${isInOrder ? 'text-white' : 'text-primary-sora'}`} />
                <span>{dish.name}</span>
                <span className={`font-mono font-bold ${isInOrder ? 'text-white' : 'text-primary-sora'}`}>
                  ({formatCurrency(dish.price)})
                </span>
                {isInOrder && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-extrabold font-mono">
                    x{qty}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* VISTA AGRUPADA DINÁMICA (PRINCIPAL) */
        <div className="space-y-2">
          {/* 1. Selector de Platos Base (Tabs / Botones Principales) */}
          <div className="flex flex-wrap gap-1.5">
            {dishGroups.map((group) => {
              const isSelected = currentGroup?.key === group.key;
              const totalInOrder = getGroupTotalQuantity(group);

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroupKey(group.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-primary-sora text-white shadow-sm ring-2 ring-primary-sora/25'
                      : 'bg-white hover:bg-bg-sora border border-border-sora text-text-sora hover:border-primary-sora/40'
                  }`}
                >
                  <span className="text-sm">{group.iconEmoji}</span>
                  <span>{group.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-bg-sora text-text-sora/60 border border-border-sora/60'
                    }`}
                  >
                    {group.variants.length}
                  </span>

                  {/* Badge si tiene unidades en el pedido */}
                  {totalInOrder > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold font-mono ${
                        isSelected
                          ? 'bg-white text-primary-sora'
                          : 'bg-primary-sora text-white'
                      }`}
                      title={`${totalInOrder} en el pedido actual`}
                    >
                      • {totalInOrder}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 2. Sub-Panel Dinámico de Tamaños y Porciones del Plato Activo */}
          {currentGroup && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-white to-bg-sora/60 border border-border-sora shadow-2xs space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-border-sora/50">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base">{currentGroup.iconEmoji}</span>
                  <span className="text-xs font-bold text-text-sora uppercase tracking-wider">
                    {currentGroup.name}
                  </span>
                  <span className="text-[11px] text-text-sora/50 font-normal">
                    — Selecciona el tamaño o porción para agregar:
                  </span>
                </div>

                <span className="text-[11px] font-mono font-semibold text-primary-sora hidden sm:inline">
                  {formatCurrency(currentGroup.minPrice)} ~ {formatCurrency(currentGroup.maxPrice)}
                </span>
              </div>

              {/* Botones de Selección de Porción / Tamaño */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {currentGroup.variants.map((variant) => {
                  const qty = getVariantQuantity(variant.fullName, variant.price);
                  const isInOrder = qty > 0;

                  return (
                    <div
                      key={variant.id}
                      onClick={() => handleVariantClick(variant)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between select-none relative group ${
                        isInOrder
                          ? 'bg-primary-sora/10 border-primary-sora shadow-2xs ring-1 ring-primary-sora/30'
                          : 'bg-white hover:bg-primary-sora/5 hover:border-primary-sora/40 border-border-sora'
                      }`}
                    >
                      {/* Nombre del tamaño */}
                      <div className="text-[11px] font-bold text-text-sora leading-snug">
                        {variant.sizeLabel}
                      </div>

                      {/* Precio y Controles */}
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-border-sora/40">
                        <span className="text-xs font-mono font-bold text-primary-sora">
                          {formatCurrency(variant.price)}
                        </span>

                        {isInOrder ? (
                          <div className="flex items-center space-x-0.5 bg-white rounded-md border border-primary-sora/30 px-0.5 py-0.5 shadow-2xs">
                            {onUpdateQuantity && (
                              <button
                                type="button"
                                onClick={(e) => handleQuantityAdjust(variant, -1, e)}
                                className="p-0.5 rounded hover:bg-red-50 text-text-sora/70 hover:text-red-600 transition-colors"
                                title="Restar 1"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                            )}
                            <span className="px-1 text-[11px] font-extrabold text-primary-sora font-mono">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuantityAdjust(variant, 1, e)}
                              className="p-0.5 rounded hover:bg-emerald-50 text-text-sora/70 hover:text-emerald-600 transition-colors"
                              title="Sumar 1"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-primary-sora group-hover:scale-110 transition-transform p-0.5 rounded bg-primary-sora/10">
                            <Plus className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
