'use client';

import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Store,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import { ExtractedWhatsAppClient, extractMultipleWhatsAppOrVcf } from '@/lib/storage';
import { Client } from '@/types/database.types';

interface ImportWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClients: Client[];
  onImportSuccess: (importedCount: number) => void;
  onImportContacts: (contacts: ExtractedWhatsAppClient[]) => Promise<void>;
}

export function ImportWhatsAppModal({
  isOpen,
  onClose,
  existingClients,
  onImportSuccess,
  onImportContacts,
}: ImportWhatsAppModalProps) {
  const [inputText, setInputText] = useState('');
  const [parsedContacts, setParsedContacts] = useState<
    (ExtractedWhatsAppClient & { selected: boolean; alreadyExists: boolean })[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = (contentToAnalyze: string) => {
    setErrorMsg(null);
    if (!contentToAnalyze.trim()) {
      setErrorMsg('Por favor escribe o pega el texto antes de analizar.');
      return;
    }

    const rawList = extractMultipleWhatsAppOrVcf(contentToAnalyze);
    if (rawList.length === 0) {
      setErrorMsg('No se detectaron datos válidos (nombre o teléfono). Revisa el formato pegado.');
      return;
    }

    // Identificar si el teléfono ya existe en el directorio de Sora
    const processed = rawList.map((item) => {
      const exists = existingClients.some((c) => {
        const cPhone = (c.phone || '').replace(/\D/g, '');
        const itemPhone = (item.phone || '').replace(/\D/g, '');
        return itemPhone.length > 7 && cPhone.includes(itemPhone.slice(-7));
      });

      return {
        ...item,
        selected: !exists, // Si no existe, pre-seleccionado
        alreadyExists: exists,
      };
    });

    setParsedContacts(processed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        handleAnalyze(content);
      }
    };
    reader.readAsText(file);
  };

  const toggleSelect = (index: number) => {
    setParsedContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleExecuteImport = async () => {
    const selected = parsedContacts.filter((c) => c.selected);
    if (selected.length === 0) {
      setErrorMsg('Selecciona al menos un contacto para importar.');
      return;
    }

    try {
      setIsProcessing(true);
      await onImportContacts(selected);
      onImportSuccess(selected.length);
      onClose();
    } catch (err: any) {
      setErrorMsg('Error al guardar los contactos: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-border-sora flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-border-sora/80 bg-bg-sora/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-whatsapp/15 text-whatsapp flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-text-sora">
                Importar Clientes desde WhatsApp o VCF
              </h3>
              <p className="text-xs text-text-sora/60">
                Pega el mensaje de un cliente, chat o sube una tarjeta de contactos (.vcf).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Área de Entrada de Texto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-sora/80">
                Pega el texto, dirección o mensaje de WhatsApp:
              </label>
              <label className="inline-flex items-center space-x-1.5 text-xs text-primary-sora hover:text-primary-hover font-semibold cursor-pointer py-1 px-2.5 rounded-lg hover:bg-primary-sora/10 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Cargar archivo .VCF</span>
                <input
                  type="file"
                  accept=".vcf,text/vcard"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ejemplo:&#10;Hola, soy María Fernández 829-555-1234, para entregar en la Calle El Sol #22, Apto 4A, cerca del supermercado..."
              className="w-full p-3 rounded-2xl border border-border-sora bg-bg-sora/20 text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora resize-none font-mono"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleAnalyze(inputText)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs font-semibold transition-all shadow-sm active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analizar y Detectar Contactos</span>
              </button>
            </div>
          </div>

          {/* Vista previa de Contactos Detectados */}
          {parsedContacts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-sora uppercase tracking-wider">
                  Contactos Detectados ({parsedContacts.length})
                </span>
                <span className="text-xs text-text-sora/60">
                  {parsedContacts.filter((c) => c.selected).length} seleccionados para guardar
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {parsedContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                      contact.selected
                        ? 'bg-primary-sora/5 border-primary-sora/40 ring-1 ring-primary-sora/20'
                        : 'bg-white border-border-sora opacity-75'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={contact.selected}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded border-border-sora text-primary-sora focus:ring-primary-sora"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-text-sora truncate">
                          {contact.name || 'Sin Nombre Identificado'}
                        </span>
                        {contact.alreadyExists && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            Ya existe en Sora
                          </span>
                        )}
                        {contact.isPickup && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium flex items-center">
                            <Store className="w-2.5 h-2.5 mr-1" />
                            Retiro en Local
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-sora/70 mt-1">
                        {contact.phone && (
                          <span className="flex items-center text-primary-sora font-medium">
                            <Phone className="w-3 h-3 mr-1" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.address && (
                          <span className="flex items-center truncate max-w-xs text-text-sora/60">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            {contact.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-4 border-t border-border-sora/80 bg-bg-sora/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border-sora text-xs font-semibold text-text-sora hover:bg-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isProcessing || parsedContacts.filter((c) => c.selected).length === 0}
            onClick={handleExecuteImport}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-md shadow-whatsapp/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Importando...'
                : `Guardar ${parsedContacts.filter((c) => c.selected).length} en Directorio`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
