'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types/database.types';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_MENU_ITEMS, generateUuid } from '@/lib/storage';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  RotateCcw,
  Sparkles,
  DollarSign,
  Tag,
} from 'lucide-react';

interface MenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onSaveMenuItems: (items: MenuItem[]) => void;
}

export function MenuManagerModal({
  isOpen,
  onClose,
  menuItems,
  onSaveMenuItems,
}: MenuManagerModalProps) {
  const [items, setItems] = useState<MenuItem[]>(menuItems);

  // Estados para nuevo plato
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newCategory, setNewCategory] = useState('Lasañas');

  // Estado para editar un plato existente
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editCategory, setEditCategory] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);

  // Sincronizar items al abrir
  React.useEffect(() => {
    setItems(menuItems);
  }, [menuItems, isOpen]);

  if (!isOpen) return null;

  const showMsg = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPrice === '' || Number(newPrice) <= 0) {
      alert('Por favor ingresa un nombre y un precio válido mayor a 0.');
      return;
    }

    const newItem: MenuItem = {
      id: generateUuid(),
      name: newName.trim(),
      price: Number(newPrice),
      category: newCategory.trim() || 'Platos',
      is_available: true,
    };

    const updated = [...items, newItem];
    setItems(updated);
    onSaveMenuItems(updated);

    setNewName('');
    setNewPrice('');
    showMsg(`¡"${newItem.name}" agregado al menú con éxito!`);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditCategory(item.category || 'Lasañas');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
    setEditCategory('');
  };

  const saveEdit = () => {
    if (!editName.trim() || editPrice === '' || Number(editPrice) <= 0) {
      alert('Por favor especifica un nombre y un precio válido.');
      return;
    }

    const updated = items.map((it) =>
      it.id === editingId
        ? {
            ...it,
            name: editName.trim(),
            price: Number(editPrice),
            category: editCategory.trim() || 'Lasañas',
          }
        : it
    );

    setItems(updated);
    onSaveMenuItems(updated);
    cancelEdit();
    showMsg('Plato actualizado correctamente.');
  };

  const handleDeleteDish = (id: string, name: string) => {
    if (items.length <= 1) {
      alert('Debe haber al menos un plato registrado en el menú.');
      return;
    }
    if (!confirm(`¿Deseas eliminar "${name}" del menú?`)) {
      return;
    }

    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    onSaveMenuItems(updated);
    showMsg(`"${name}" eliminado del menú.`);
  };

  const handleResetDefaults = () => {
    if (
      confirm(
        '¿Deseas restaurar el menú al catálogo oficial completo de Sora (Lasañas, Pastelones y Pasteles en Hoja)?'
      )
    ) {
      setItems(DEFAULT_MENU_ITEMS);
      onSaveMenuItems(DEFAULT_MENU_ITEMS);
      showMsg('Menú restaurado al catálogo oficial de Sora.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-border-sora shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border-sora flex items-center justify-between bg-bg-sora/50 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-sora text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-text-sora leading-tight">
                Gestión del Menú de Platos
              </h3>
              <p className="text-xs text-text-sora/60 mt-0.5">
                Configura los platos disponibles y sus precios oficiales en RD$
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de feedback */}
        {feedback && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Formulario para agregar nuevo plato */}
          <form
            onSubmit={handleAddDish}
            className="p-4 rounded-2xl bg-bg-sora/60 border border-border-sora space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-sora uppercase tracking-wider flex items-center">
                <Plus className="w-3.5 h-3.5 mr-1 text-primary-sora" />
                Agregar Nuevo Plato al Menú
              </span>
              <span className="text-[10px] text-text-sora/50">Moneda: DOP (RD$)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  required
                  placeholder="Nombre (ej. Lasaña de Pollo, Postre...)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-text-sora/40">
                    RD$
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="25"
                    required
                    placeholder="Precio"
                    value={newPrice}
                    onChange={(e) =>
                      setNewPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full pl-9 pr-2 py-2 rounded-xl border border-border-sora bg-white text-xs font-bold text-text-sora text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary-sora"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-primary-sora hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear</span>
                </button>
              </div>
            </div>
          </form>

          {/* Lista de platos existentes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-text-sora/80 uppercase tracking-wider">
                Platos Registrados ({items.length})
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center space-x-1 text-[11px] text-text-sora/60 hover:text-primary-sora transition-colors"
                title="Restaurar a las 2 Lasañas por defecto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer oficiales (350 y 700)</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in"
                    >
                      <span className="text-[10px] font-bold text-amber-800 uppercase">
                        Editando Plato
                      </span>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border border-border-sora bg-white text-xs font-medium"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-text-sora/40">
                              RD$
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="25"
                              value={editPrice}
                              onChange={(e) =>
                                setEditPrice(
                                  e.target.value === '' ? '' : parseFloat(e.target.value)
                                )
                              }
                              className="w-full pl-9 pr-2 py-1.5 rounded-xl border border-border-sora bg-white text-xs font-bold text-right font-mono"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="p-2 rounded-xl bg-primary-sora text-white hover:bg-primary-hover shadow-xs"
                            title="Guardar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-2 rounded-xl bg-white border border-border-sora text-text-sora/70 hover:bg-bg-sora"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white border border-border-sora hover:border-primary-sora/40 transition-colors flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-text-sora truncate">
                          {item.name}
                        </span>
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-md bg-bg-sora text-[10px] font-semibold text-text-sora/60 border border-border-sora">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-text-sora/50 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span className="font-serif font-bold text-sm text-primary-sora font-mono">
                        {formatCurrency(item.price)}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-xl border border-border-sora text-text-sora/70 hover:text-primary-sora hover:bg-primary-sora/10 transition-colors"
                          title="Editar nombre y precio"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDish(item.id, item.name)}
                          className="p-1.5 rounded-xl border border-border-sora text-text-sora/70 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar plato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="px-6 py-4 border-t border-border-sora bg-bg-sora/40 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-text-sora/50 font-medium">
            Los cambios se reflejan inmediatamente en Ventas.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs font-semibold transition-all shadow-xs"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
