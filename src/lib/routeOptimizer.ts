import { Order } from '@/types/database.types';

// Ubicación de la Cocina Central de Sora (Santo Domingo, República Dominicana)
export const SORA_KITCHEN_COORDS = {
  lat: 18.4861,
  lng: -69.9312,
  name: 'Cocina Central Sora',
  address: 'Santo Domingo, Distrito Nacional',
};

export interface RouteStop {
  order: Order;
  stopIndex: number;
  distanceFromPreviousKm: number;
  estimatedMinutesFromPrevious: number;
  cumulativeDistanceKm: number;
  cumulativeMinutes: number;
}

export interface OptimizedRouteResult {
  origin: { lat: number; lng: number; name: string };
  stops: RouteStop[];
  totalDistanceKm: number;
  totalEstimatedMinutes: number;
  unmappedOrders: Order[]; // Pedidos sin coordenadas GPS que se muestran al final
  googleMapsUrl: string;
}

/**
 * Fórmula de Haversine para calcular distancia esférica en kilómetros entre dos coordenadas
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estima los minutos de traslado en moto/vehículo en ciudad
 * Velocidad promedio estimada en Santo Domingo: 22 km/h + 4 minutos por parada (estacionar y entrega)
 */
export function estimateDrivingMinutes(distanceKm: number): number {
  const averageSpeedKmH = 22; // velocidad realista en tráfico urbano
  const travelTimeMinutes = (distanceKm / averageSpeedKmH) * 60;
  const stopHandlingMinutes = 4; // tiempo estimado por entrega
  return Math.max(3, Math.round(travelTimeMinutes + stopHandlingMinutes));
}

export interface DeliveryFeeEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  suggestedFee: number;
  breakdown: string;
}

/**
 * Calcula un costo de envío estimado desde la Cocina de Sora hasta la ubicación del cliente
 * - Origen: Cocina Central Sora (18.4861, -69.9312)
 * - Factor de ruta urbana en Santo Domingo: ~1.3x distancia en línea recta
 * - Base: RD$ 100 hasta 2.5 km
 * - Adicional: RD$ 25 por cada km extra
 * - Redondeado a múltiplos de 25 pesos (adecuado para pagos en efectivo en RD)
 */
export function calculateEstimatedDeliveryFee(
  destLat: number | null | undefined,
  destLng: number | null | undefined,
  originCoords: { lat: number; lng: number } = SORA_KITCHEN_COORDS
): DeliveryFeeEstimate | null {
  if (
    typeof destLat !== 'number' ||
    isNaN(destLat) ||
    typeof destLng !== 'number' ||
    isNaN(destLng)
  ) {
    return null;
  }

  const rawDistKm = calculateHaversineDistanceKm(
    originCoords.lat,
    originCoords.lng,
    destLat,
    destLng
  );

  // Estimación de distancia vial en Santo Domingo (+30% por trazado de calles)
  const roadDistKm = Math.round(rawDistKm * 1.3 * 10) / 10;

  let fee = 100;
  if (roadDistKm > 2.5) {
    const extraKm = roadDistKm - 2.5;
    fee = 100 + Math.ceil(extraKm) * 25;
  }
  fee = Math.max(100, Math.ceil(fee / 25) * 25);

  const estimatedMinutes = estimateDrivingMinutes(roadDistKm);

  return {
    distanceKm: roadDistKm,
    estimatedMinutes,
    suggestedFee: fee,
    breakdown: `Base RD$ 100 (hasta 2.5 km) + RD$ 25/km adicional`,
  };
}

/**
 * Algoritmo del Vecino Más Cercano (Nearest Neighbor) con optimización de 2-opt
 * para secuenciar la ruta de pedidos minimizando la distancia y tiempo total de recorrido.
 */
export function optimizeDeliveryRoute(
  orders: Order[],
  startCoords: { lat: number; lng: number; name?: string } = SORA_KITCHEN_COORDS
): OptimizedRouteResult {
  const mappedOrders = orders.filter(
    (o) =>
      typeof o.latitude === 'number' &&
      !isNaN(o.latitude) &&
      typeof o.longitude === 'number' &&
      !isNaN(o.longitude)
  );

  const unmappedOrders = orders.filter(
    (o) =>
      typeof o.latitude !== 'number' ||
      isNaN(o.latitude) ||
      typeof o.longitude !== 'number' ||
      isNaN(o.longitude)
  );

  if (mappedOrders.length === 0) {
    return {
      origin: { ...startCoords, name: startCoords.name || 'Punto de Partida' },
      stops: [],
      totalDistanceKm: 0,
      totalEstimatedMinutes: 0,
      unmappedOrders,
      googleMapsUrl: '',
    };
  }

  // Si solo hay 1 pedido mapeado
  if (mappedOrders.length === 1) {
    const single = mappedOrders[0];
    const dist = calculateHaversineDistanceKm(
      startCoords.lat,
      startCoords.lng,
      single.latitude!,
      single.longitude!
    );
    const mins = estimateDrivingMinutes(dist);

    const singleStop: RouteStop = {
      order: single,
      stopIndex: 1,
      distanceFromPreviousKm: Math.round(dist * 10) / 10,
      estimatedMinutesFromPrevious: mins,
      cumulativeDistanceKm: Math.round(dist * 10) / 10,
      cumulativeMinutes: mins,
    };

    return {
      origin: { ...startCoords, name: startCoords.name || 'Punto de Partida' },
      stops: [singleStop],
      totalDistanceKm: Math.round(dist * 10) / 10,
      totalEstimatedMinutes: mins,
      unmappedOrders,
      googleMapsUrl: buildGoogleMapsMultiStopUrl(startCoords, [single]),
    };
  }

  // 1. Algoritmo Nearest Neighbor partiendo del origen
  const remaining = [...mappedOrders];
  const orderedList: Order[] = [];

  let currentLat = startCoords.lat;
  let currentLng = startCoords.lng;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const dist = calculateHaversineDistanceKm(
        currentLat,
        currentLng,
        candidate.latitude!,
        candidate.longitude!
      );

      // Si tiene horario programado muy cercano, damos ligera prioridad
      const priorityBonus = candidate.is_scheduled ? 0.85 : 1;
      const effectiveDist = dist * priorityBonus;

      if (effectiveDist < shortestDist) {
        shortestDist = effectiveDist;
        nearestIndex = i;
      }
    }

    const nextOrder = remaining.splice(nearestIndex, 1)[0];
    orderedList.push(nextOrder);
    currentLat = nextOrder.latitude!;
    currentLng = nextOrder.longitude!;
  }

  // 2. Refinamiento 2-Opt para evitar cruces en la ruta
  if (orderedList.length >= 4) {
    let improved = true;
    let iterations = 0;
    const maxIterations = 20;

    const calcRouteTotalDist = (list: Order[]): number => {
      let sum = calculateHaversineDistanceKm(
        startCoords.lat,
        startCoords.lng,
        list[0].latitude!,
        list[0].longitude!
      );
      for (let i = 0; i < list.length - 1; i++) {
        sum += calculateHaversineDistanceKm(
          list[i].latitude!,
          list[i].longitude!,
          list[i + 1].latitude!,
          list[i + 1].longitude!
        );
      }
      return sum;
    };

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      let bestDist = calcRouteTotalDist(orderedList);

      for (let i = 0; i < orderedList.length - 1; i++) {
        for (let k = i + 1; k < orderedList.length; k++) {
          // Invertir segmento entre i y k
          const newRoute = [
            ...orderedList.slice(0, i),
            ...orderedList.slice(i, k + 1).reverse(),
            ...orderedList.slice(k + 1),
          ];
          const newDist = calcRouteTotalDist(newRoute);

          if (newDist < bestDist - 0.05) {
            orderedList.splice(0, orderedList.length, ...newRoute);
            bestDist = newDist;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
  }

  // 3. Construir paradas con distancias y tiempos acumulados
  const stops: RouteStop[] = [];
  let prevLat = startCoords.lat;
  let prevLng = startCoords.lng;
  let totalKm = 0;
  let totalMins = 0;

  orderedList.forEach((order, idx) => {
    const legDist = calculateHaversineDistanceKm(
      prevLat,
      prevLng,
      order.latitude!,
      order.longitude!
    );
    const legMins = estimateDrivingMinutes(legDist);

    totalKm += legDist;
    totalMins += legMins;

    stops.push({
      order,
      stopIndex: idx + 1,
      distanceFromPreviousKm: Math.round(legDist * 10) / 10,
      estimatedMinutesFromPrevious: legMins,
      cumulativeDistanceKm: Math.round(totalKm * 10) / 10,
      cumulativeMinutes: totalMins,
    });

    prevLat = order.latitude!;
    prevLng = order.longitude!;
  });

  return {
    origin: { ...startCoords, name: startCoords.name || 'Punto de Partida' },
    stops,
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    totalEstimatedMinutes: totalMins,
    unmappedOrders,
    googleMapsUrl: buildGoogleMapsMultiStopUrl(startCoords, orderedList),
  };
}

/**
 * Genera la URL nativa oficial de Google Maps con múltiples paradas secuenciadas
 */
export function buildGoogleMapsMultiStopUrl(
  origin: { lat: number; lng: number },
  ordersInSequence: Order[]
): string {
  if (ordersInSequence.length === 0) return '';

  const originStr = `${origin.lat},${origin.lng}`;

  if (ordersInSequence.length === 1) {
    const o = ordersInSequence[0];
    const dest =
      o.latitude && o.longitude
        ? `${o.latitude},${o.longitude}`
        : encodeURIComponent(o.address);
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${dest}&travelmode=driving`;
  }

  // La última parada es el destino final
  const lastOrder = ordersInSequence[ordersInSequence.length - 1];
  const destStr =
    lastOrder.latitude && lastOrder.longitude
      ? `${lastOrder.latitude},${lastOrder.longitude}`
      : encodeURIComponent(lastOrder.address);

  // Las paradas intermedias son los waypoints (Google Maps soporta hasta 9 waypoints)
  const waypoints = ordersInSequence
    .slice(0, ordersInSequence.length - 1)
    .map((o) =>
      o.latitude && o.longitude
        ? `${o.latitude},${o.longitude}`
        : encodeURIComponent(o.address)
    )
    .slice(0, 9); // Límite de waypoints en URL de Maps

  const waypointsParam =
    waypoints.length > 0 ? `&waypoints=${waypoints.join('|')}` : '';

  return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}${waypointsParam}&travelmode=driving`;
}
