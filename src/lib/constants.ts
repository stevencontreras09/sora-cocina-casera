/**
 * Constantes y Datos Oficiales de Sora Cocina Casera
 */

export const SORA_CONFIG = {
  name: 'Sora Cocina Casera',
  phoneDisplay: '+1 (829) 381-6780',
  whatsappNumber: '18293816780',
  city: 'Santo Domingo, República Dominicana',
};

export const SORA_PAYMENT_ACCOUNTS = {
  holderName: 'Soribel Rodríguez López',
  holderId: '40229993619',
  email: 'soribel.rodriguezlopez@gmail.com',
  banks: [
    {
      name: 'Banreservas',
      type: 'Ahorro DOP',
      accountNumber: '9609883325',
    },
    {
      name: 'Banco Popular',
      type: 'Ahorro DOP',
      accountNumber: '860234590',
    },
    {
      name: 'Banco BHD',
      type: 'Ahorro DOP',
      accountNumber: '35313240012',
    },
  ],
  shippingNote: 'El costo del envío es adicional.',
  receiptNote: 'Por favor, envíame el comprobante una vez realices la transferencia. ¡Gracias! 🙌',
};

export const SORA_PAYMENT_MESSAGE_BLOCK = `Datos para realizar tu pago 💳

Nombre: Soribel Rodríguez López
Cédula: 40229993619
Correo: soribel.rodriguezlopez@gmail.com

Banreservas (Ahorro DOP): 9609883325

Banco Popular (Ahorro DOP): 860234590

Banco BHD (Ahorro DOP): 35313240012

📦 El costo del envío es adicional.

Por favor, envíame el comprobante una vez realices la transferencia. ¡Gracias! 🙌`;
