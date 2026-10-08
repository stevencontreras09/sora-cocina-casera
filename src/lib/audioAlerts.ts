'use client';

// ==============================================================================
// SISTEMA DE ALERTAS SONORAS Y VIBRACIÓN EN TIEMPO REAL PARA COCINA Y DESPACHO
// Utiliza la Web Audio API nativa para sintetizar el timbre metálico de cocina
// ==============================================================================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Comprobar preferencia de sonido
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('sora_kitchen_sound_enabled');
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sora_kitchen_sound_enabled', enabled ? 'true' : 'false');
  window.dispatchEvent(
    new CustomEvent('sora-sound-pref-changed', { detail: { enabled } })
  );
}

// Sintetizador de campana de restaurante (Doble Ding-Dong armónico)
export function playKitchenChime() {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frecuencias para el doble timbre de campana de cocina (Campana de servicio)
    // Nota 1 (Aguda brillante): ~987 Hz (B5) con armónico 1974 Hz
    // Nota 2 (Cuerpo resonante): ~1318 Hz (E6) con armónico 2636 Hz
    const playChimeNote = (freq1: number, freq2: number, startTime: number, duration: number) => {
      // Oscilador 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, startTime);

      gain1.gain.setValueAtTime(0.35, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + duration);

      // Oscilador 2 (Armónico metálico de campana)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq2, startTime);

      gain2.gain.setValueAtTime(0.2, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(startTime);
      osc2.stop(startTime + duration * 0.7);
    };

    // Primer toque de campana
    playChimeNote(1046.5, 2093.0, now, 0.85); // Do6
    // Segundo toque resonante (0.15s después)
    playChimeNote(1318.5, 2637.0, now + 0.16, 1.1); // Mi6
  } catch (e) {
    console.warn('Error al reproducir audio de campana:', e);
  }
}

// Vibración táctil para teléfonos y iPads/tablets
export function triggerVibration(pattern: number[] = [200, 100, 200, 100, 300]) {
  if (typeof window === 'undefined') return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Algunos navegadores requieren gesto del usuario
  }
}

export interface KitchenAlertPayload {
  title: string;
  message: string;
  type: 'new_order' | 'delivery_assigned' | 'production_reminder';
  orderNumber?: string;
  timestamp: string;
}

// Disparador principal de alerta de cocina
export function triggerKitchenAlert(
  title: string,
  message: string,
  type: 'new_order' | 'delivery_assigned' | 'production_reminder' = 'new_order',
  orderNumber?: string
) {
  // 1. Sonido
  playKitchenChime();

  // 2. Vibración
  triggerVibration([250, 100, 250, 100, 400]);

  // 3. Notificación visual / Evento de interfaz
  if (typeof window !== 'undefined') {
    const payload: KitchenAlertPayload = {
      title,
      message,
      type,
      orderNumber,
      timestamp: new Date().toISOString(),
    };
    window.dispatchEvent(
      new CustomEvent('sora-kitchen-alert', { detail: payload })
    );
  }
}
