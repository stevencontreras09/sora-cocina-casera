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
 * Formatea un número telefónico para WhatsApp asegurando el código de país dominicano si falta
 */
export function cleanPhoneNumber(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  // Si tiene 10 dígitos y empieza con códigos de área de RD (809, 829, 849), anteponer '1'
  if (digits.length === 10 && ['809', '829', '849'].some((prefix) => digits.startsWith(prefix))) {
    return `1${digits}`;
  }
  return digits;
}

/**
 * Obtiene la fecha local en formato 'YYYY-MM-DD' según la zona horaria del dispositivo,
 * evitando el desplazamiento a UTC de toISOString() que después de las 8:00 PM (hora RD / UTC-4)
 * adelantaba la fecha al día siguiente en el servidor o cliente.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Genera un enlace directo a WhatsApp (api.whatsapp.com) para evitar que el acortador wa.me
 * corrompa los emojis (convirtiéndolos en ) durante la redirección HTTP 302 hacia el navegador.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = cleanPhoneNumber(phone);
  return `https://api.whatsapp.com/send/?phone=${clean}&text=${encodeURIComponent(message)}`;
}
