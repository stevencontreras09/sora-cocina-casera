import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const placeId = searchParams.get('placeId')?.trim();

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'Falta configurar Google Maps API Key' },
      { status: 500 }
    );
  }

  // 1. Si se envía placeId, devolver los detalles con latitud, longitud y dirección formateada
  if (placeId) {
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,formattedAddress,location`,
        {
          headers: {
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          address: data.formattedAddress || data.displayName?.text || '',
          name: data.displayName?.text || '',
          latitude: data.location?.latitude || null,
          longitude: data.location?.longitude || null,
        });
      }
    } catch (e) {
      console.error('Error obteniendo detalles de lugar:', e);
    }
  }

  // 2. Si se envía q, buscar sugerencias con Places API (New)
  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ['do'],
        locationBias: {
          circle: {
            center: {
              latitude: 18.4861,
              longitude: -69.9312,
            },
            radius: 50000.0, // 50 km alrededor de Gran Santo Domingo
          },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const suggestions = (data.suggestions || [])
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          primaryText:
            s.placePrediction.structuredFormat?.mainText?.text ||
            s.placePrediction.text?.text,
          secondaryText:
            s.placePrediction.structuredFormat?.secondaryText?.text || '',
          fullText: s.placePrediction.text?.text || '',
        }));

      if (suggestions.length > 0) {
        return NextResponse.json({ suggestions });
      }
    }
  } catch (err) {
    console.warn('Error en Places API (New), usando Geocoding como fallback:', err);
  }

  // 3. Fallback: Geocoding API
  try {
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query + ', República Dominicana'
      )}&components=country:DO&key=${GOOGLE_API_KEY}`
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        const suggestions = geoData.results.slice(0, 5).map((r: any) => ({
          placeId: r.place_id,
          primaryText:
            r.address_components?.[0]?.long_name || r.formatted_address,
          secondaryText: r.formatted_address,
          fullText: r.formatted_address,
          latitude: r.geometry?.location?.lat,
          longitude: r.geometry?.location?.lng,
        }));
        return NextResponse.json({ suggestions });
      }
    }
  } catch (geoErr) {
    console.error('Error en fallback de Geocoding:', geoErr);
  }

  return NextResponse.json({ suggestions: [] });
}
