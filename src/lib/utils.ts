/**
 * Utilidades generales para Sora Cocina Casera
 */

/**
 * Formatea un valor numérico a la moneda oficial de la aplicación (DOP - Peso Dominicano)
 * Ejemplo: formatCurrency(350) -> "RD$ 350"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'RD$ 0';
  }
  return `RD$ ${Math.round(amount).toLocaleString('es-DO')}`;
}

/**
 * Formatea un número telefónico para WhatsApp
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}
