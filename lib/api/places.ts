import { Platform } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

// ─── New Places API v1 (supports CORS — works on web and native) ─────────────
const V1_BASE = 'https://places.googleapis.com/v1';

function v1Headers(fieldMask?: string): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
  };
  if (fieldMask) h['X-Goog-FieldMask'] = fieldMask;
  return h;
}

// ─── Price level mapping (v1 enum → legacy integer) ──────────────────────────
const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE:           0,
  PRICE_LEVEL_INEXPENSIVE:    1,
  PRICE_LEVEL_MODERATE:       2,
  PRICE_LEVEL_EXPENSIVE:      3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// ─── Cuisine mapping (Google Places types → Savry display label) ──────────────
const GOOGLE_TO_SAVRY_CUISINE: Record<string, string> = {
  spanish_restaurant:         'Española & Tapas',
  italian_restaurant:         'Italiana & Pizza',
  pizza_restaurant:           'Italiana & Pizza',
  japanese_restaurant:        'Asiática',
  sushi_restaurant:           'Asiática',
  chinese_restaurant:         'Asiática',
  thai_restaurant:            'Asiática',
  korean_restaurant:          'Asiática',
  vietnamese_restaurant:      'Asiática',
  ramen_restaurant:           'Asiática',
  indonesian_restaurant:      'Asiática',
  mexican_restaurant:         'Mexicana',
  brazilian_restaurant:       'Latinoamericana',
  lebanese_restaurant:        'Árabe & Turca',
  middle_eastern_restaurant:  'Árabe & Turca',
  turkish_restaurant:         'Árabe & Turca',
  greek_restaurant:           'Árabe & Turca',
  mediterranean_restaurant:   'Árabe & Turca',
  seafood_restaurant:         'Mariscos & Pescados',
  steak_house:                'Carne & Parrilla',
  barbecue_restaurant:        'Carne & Parrilla',
  american_restaurant:        'Americana & Burgers',
  hamburger_restaurant:       'Americana & Burgers',
  fast_food_restaurant:       'Americana & Burgers',
  breakfast_restaurant:       'Brunch & Desayunos',
  brunch_restaurant:          'Brunch & Desayunos',
  cafe:                       'Brunch & Desayunos',
  vegan_restaurant:           'Ensaladas & Saludable',
  vegetarian_restaurant:      'Ensaladas & Saludable',
};

/**
 * Maps a Google Places `types` array to a Savry cuisine label.
 * Returns null if no known type matches (≈60% of restaurants in Spain).
 */
export function extractCuisineType(types: string[]): string | null {
  for (const t of types) {
    if (GOOGLE_TO_SAVRY_CUISINE[t]) return GOOGLE_TO_SAVRY_CUISINE[t];
  }
  return null;
}

/**
 * Maps a Google Places price_level integer (1–4) to a € symbol string.
 * Returns null if level is falsy.
 */
export function extractPriceLabel(priceLevel: number | null | undefined): string | null {
  if (!priceLevel) return null;
  const map: Record<number, string> = { 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' };
  return map[priceLevel] ?? null;
}

// Approximate coordinates for common cities — used to bias Places results
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  madrid:     { lat: 40.4168, lng: -3.7038 },
  barcelona:  { lat: 41.3851, lng:  2.1734 },
  valencia:   { lat: 39.4699, lng: -0.3763 },
  sevilla:    { lat: 37.3891, lng: -5.9845 },
  bilbao:     { lat: 43.2630, lng: -2.9350 },
  málaga:     { lat: 36.7213, lng: -4.4217 },
  malaga:     { lat: 36.7213, lng: -4.4217 },
  zaragoza:   { lat: 41.6488, lng: -0.8891 },
  murcia:     { lat: 37.9922, lng: -1.1307 },
  palma:      { lat: 39.5696, lng:  2.6502 },
  alicante:   { lat: 38.3452, lng: -0.4815 },
  valladolid: { lat: 41.6523, lng: -4.7245 },
  vigo:       { lat: 42.2314, lng: -8.7124 },
  córdoba:    { lat: 37.8882, lng: -4.7794 },
  cordoba:    { lat: 37.8882, lng: -4.7794 },
  granada:    { lat: 37.1773, lng: -3.5986 },
  lisboa:     { lat: 38.7223, lng: -9.1393 },
  lisbon:     { lat: 38.7223, lng: -9.1393 },
  paris:      { lat: 48.8566, lng:  2.3522 },
  london:     { lat: 51.5074, lng: -0.1278 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  mexico:     { lat: 19.4326, lng: -99.1332 },
  'ciudad de mexico': { lat: 19.4326, lng: -99.1332 },
  miami:      { lat: 25.7617, lng: -80.1918 },
  amsterdam:  { lat: 52.3676, lng:  4.9041 },
  berlin:     { lat: 52.5200, lng: 13.4050 },
  rome:       { lat: 41.9028, lng: 12.4964 },
  roma:       { lat: 41.9028, lng: 12.4964 },
  milan:      { lat: 45.4642, lng:  9.1900 },
};

export function getCityCoords(city: string): { lat: number; lng: number } | null {
  // Strip accents for comparison
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const n = norm(city);

  // 1. Exact match (e.g. "madrid" → found immediately)
  if (CITY_COORDS[n]) return CITY_COORDS[n];

  // 2. First comma-token (e.g. "Madrid, España" → "madrid")
  const firstToken = n.split(/[,]+/)[0].trim();
  if (CITY_COORDS[firstToken]) return CITY_COORDS[firstToken];

  // 3. Substring scan — city string contains a known key (e.g. "Community of Madrid")
  for (const key of Object.keys(CITY_COORDS)) {
    if (n.includes(key)) return CITY_COORDS[key];
  }

  return null;
}

// ─── Types (kept identical to old API for compatibility) ─────────────────────

export type PlaceCandidate = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address: string;
  vicinity: string;
  geometry: { location: { lat: number; lng: number } };
  price_level?: number;
  types: string[];
  photos?: { photo_reference: string; width: number; height: number }[];
  // Extended info (populated by getPlaceExtendedInfo)
  formatted_phone_number?: string;
  website?: string;
  url?: string; // Google Maps URL
  opening_hours?: { weekday_text?: string[] };
};

export type PlaceExtendedInfo = {
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  hours?: string[];
};

// ─── Mappers from v1 response shapes ─────────────────────────────────────────

function mapSuggestion(s: any): PlaceCandidate {
  const pp = s.placePrediction ?? {};
  return {
    place_id: pp.placeId ?? '',
    description: pp.text?.text ?? '',
    structured_formatting: {
      main_text:      pp.structuredFormat?.mainText?.text      ?? pp.text?.text ?? '',
      secondary_text: pp.structuredFormat?.secondaryText?.text ?? '',
    },
  };
}

function mapPlaceDetails(json: any): PlaceDetails | null {
  if (!json?.id) return null;
  const priceLevelStr: string = json.priceLevel ?? '';
  const priceLevel = priceLevelStr ? PRICE_LEVEL_MAP[priceLevelStr] : undefined;
  return {
    place_id:          json.id,
    name:              json.displayName?.text      ?? '',
    formatted_address: json.formattedAddress        ?? '',
    vicinity:          json.shortFormattedAddress   ?? json.formattedAddress ?? '',
    geometry: {
      location: {
        lat: json.location?.latitude  ?? 0,
        lng: json.location?.longitude ?? 0,
      },
    },
    price_level: priceLevel,
    types: json.types ?? [],
    photos: (json.photos ?? []).map((p: any) => ({
      // v1 uses resource names like "places/ChIJ.../photos/Af..."
      photo_reference: p.name ?? '',
      width:  p.widthPx  ?? 600,
      height: p.heightPx ?? 400,
    })),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search cities/localities using Google Places API v1 Autocomplete.
 * Supports CORS — works on both web and native.
 */
export async function searchCities(query: string): Promise<PlaceCandidate[]> {
  if (!query.trim() || query.length < 2) return [];
  try {
    const res = await fetch(`${V1_BASE}/places:autocomplete`, {
      method: 'POST',
      headers: v1Headers(),
      body: JSON.stringify({
        input: query,
        includedPrimaryTypes: ['locality', 'administrative_area_level_3'],
        languageCode: 'es',
      }),
    });
    const json = await res.json();
    if (json.error) {
      console.warn('searchCities error:', json.error.message);
      return [];
    }
    return (json.suggestions ?? []).map(mapSuggestion);
  } catch (e) {
    console.error('searchCities fetch error', e);
    return [];
  }
}

/**
 * Search restaurants/establishments using Google Places API v1 Autocomplete.
 * Supports CORS — works on both web and native.
 */
export async function searchPlaces(query: string, city?: string | null): Promise<PlaceCandidate[]> {
  if (!query.trim() || query.length < 2) return [];
  const coords = city ? getCityCoords(city) : null;

  const body: Record<string, unknown> = {
    input:                query,
    includedPrimaryTypes: ['restaurant', 'food', 'cafe', 'bar'],
    languageCode:         'es',
  };

  if (coords) {
    body.locationBias = {
      circle: {
        center: { latitude: coords.lat, longitude: coords.lng },
        radius: 25000, // 25 km — tight enough to prioritise the city, loose enough for suburbs
      },
    };
  }

  try {
    const res = await fetch(`${V1_BASE}/places:autocomplete`, {
      method: 'POST',
      headers: v1Headers(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) {
      console.warn('searchPlaces error:', json.error.message);
      return [];
    }
    // Only include placePrediction suggestions (skip queryPrediction — they have no place_id)
    return (json.suggestions ?? [])
      .filter((s: any) => s.placePrediction?.placeId)
      .map(mapSuggestion);
  } catch (e) {
    console.error('searchPlaces error', e);
    return [];
  }
}

/**
 * Fetch full place details by placeId using Google Places API v1.
 * Checks local restaurants table first to avoid redundant API calls (~$0.017 each).
 * Supports CORS — works on both web and native.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  // Cache check: if we already have this restaurant, skip the Google API call
  try {
    const { supabase } = await import('../supabase');
    const { data: cached } = await supabase
      .from('restaurants')
      .select('google_place_id, name, address, neighborhood, city, lat, lng, cuisine, price_level, cover_image_url')
      .eq('google_place_id', placeId)
      .maybeSingle();

    if (cached) {
      return {
        place_id: cached.google_place_id ?? placeId,
        name: cached.name,
        formatted_address: cached.address ?? '',
        vicinity: [cached.neighborhood, cached.city].filter(Boolean).join(', '),
        geometry: { location: { lat: cached.lat ?? 0, lng: cached.lng ?? 0 } },
        price_level: cached.price_level ?? undefined,
        types: [],
        photos: cached.cover_image_url
          ? [{ photo_reference: cached.cover_image_url, width: 1200, height: 800 }]
          : [],
      };
    }
  } catch {
    // Cache miss or error — proceed to Google API
  }

  const fieldMask = [
    'id',
    'displayName',
    'formattedAddress',
    'shortFormattedAddress',
    'location',
    'priceLevel',
    'types',
    'photos',
  ].join(',');

  try {
    const res = await fetch(`${V1_BASE}/places/${placeId}`, {
      headers: v1Headers(fieldMask),
    });
    const json = await res.json();
    if (json.error) {
      console.warn('getPlaceDetails error:', json.error.message);
      return null;
    }
    return mapPlaceDetails(json);
  } catch (e) {
    console.error('getPlaceDetails error', e);
    return null;
  }
}

/**
 * Checks Google Places Text Search to confirm a brand has multiple locations.
 * Returns true if 3+ results start with the given prefix (case-insensitive).
 * Uses Google Places API v1 (CORS-safe).
 */
export async function checkIsChainViaGoogle(
  prefix: string,
  lat?: number | null,
  lng?: number | null
): Promise<boolean> {
  if (!prefix.trim()) return false;

  const body: Record<string, unknown> = {
    textQuery:    prefix,
    includedType: 'restaurant',
    languageCode: 'es',
    pageSize:     10,
  };

  if (lat != null && lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 100000,
      },
    };
  }

  try {
    const res = await fetch(`${V1_BASE}/places:searchText`, {
      method:  'POST',
      headers: v1Headers('places.id,places.displayName'),
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) return false;

    const prefixNorm = prefix.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matches = (json.places ?? []).filter((p: any) => {
      const name = (p.displayName?.text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.startsWith(prefixNorm);
    });
    return matches.length >= 3;
  } catch {
    return false;
  }
}

/**
 * Search for all locations of a franchise chain via Google Places Text Search.
 * Returns up to `maxResults` locations with name, address, placeId.
 */
export type ChainLocation = {
  placeId: string;
  name: string;
  address: string | null;
};

export async function searchChainLocations(
  chainName: string,
  maxResults = 20
): Promise<ChainLocation[]> {
  if (!chainName.trim()) return [];

  const body: Record<string, unknown> = {
    textQuery:    chainName,
    includedType: 'restaurant',
    languageCode: 'es',
    pageSize:     maxResults,
  };

  try {
    const res = await fetch(`${V1_BASE}/places:searchText`, {
      method:  'POST',
      headers: v1Headers('places.id,places.displayName,places.formattedAddress'),
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) return [];

    const chainNorm = chainName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (json.places ?? [])
      .filter((p: any) => {
        const name = (p.displayName?.text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return name.includes(chainNorm) || chainNorm.includes(name.split(' ')[0]);
      })
      .map((p: any) => ({
        placeId: p.id ?? (p.name ?? '').replace('places/', ''),
        name: p.displayName?.text ?? '',
        address: p.formattedAddress ?? null,
      }));
  } catch {
    return [];
  }
}

/**
 * Returns a photo URL for a given photo reference.
 * Supports both v1 resource names (places/x/photos/y) and legacy photo_reference strings.
 */
/**
 * Returns a direct image URL for a given photo reference.
 * For v1 resource names, fetches the JSON to resolve the actual photoUri.
 * For legacy references, returns the Maps API photo URL directly.
 */
export async function resolvePhotoUrl(photoReference: string, maxWidth = 600): Promise<string | null> {
  if (photoReference.startsWith('places/')) {
    try {
      const res = await fetch(
        `${V1_BASE}/${photoReference}/media?maxWidthPx=${maxWidth}&key=${API_KEY}&skipHttpRedirect=true`
      );
      const json = await res.json();
      return json.photoUri ?? null;
    } catch {
      return null;
    }
  }
  // Legacy photo_reference — direct URL works
  return (
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${maxWidth}` +
    `&photo_reference=${photoReference}` +
    `&key=${API_KEY}`
  );
}

/**
 * Synchronous fallback — returns an API URL that redirects to the image.
 * Use resolvePhotoUrl() instead when you can await.
 */
export function getPhotoUrl(photoReference: string, maxWidth = 600): string {
  if (photoReference.startsWith('places/')) {
    // Without skipHttpRedirect, Google returns a 302 redirect to the actual image
    return `${V1_BASE}/${photoReference}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
  }
  return (
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${maxWidth}` +
    `&photo_reference=${photoReference}` +
    `&key=${API_KEY}`
  );
}

/**
 * Fetch extended info (hours, phone, website, maps URL) from Google Places API v1.
 * This is a separate call from getPlaceDetails to avoid breaking the cached flow
 * and to only request these fields when needed (restaurant detail page).
 */
export async function getPlaceExtendedInfo(placeId: string): Promise<PlaceExtendedInfo | null> {
  const fieldMask = [
    'id',
    'formattedAddress',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'googleMapsUri',
    'currentOpeningHours',
    'regularOpeningHours',
  ].join(',');

  try {
    const res = await fetch(`${V1_BASE}/places/${placeId}`, {
      headers: v1Headers(fieldMask),
    });
    const json = await res.json();
    if (json.error) {
      console.warn('getPlaceExtendedInfo error:', json.error.message);
      return null;
    }

    const hours =
      json.currentOpeningHours?.weekdayDescriptions ??
      json.regularOpeningHours?.weekdayDescriptions ??
      [];

    return {
      address: json.formattedAddress || undefined,
      phone: json.internationalPhoneNumber || json.nationalPhoneNumber || undefined,
      website: json.websiteUri || undefined,
      mapsUrl: json.googleMapsUri || undefined,
      hours: hours.length > 0 ? hours : undefined,
    };
  } catch (e) {
    console.error('getPlaceExtendedInfo error', e);
    return null;
  }
}

/** Extract a neighborhood or short city label from a place's secondary text */
export function extractNeighborhood(secondaryText: string): string {
  // "Calle X, Madrid, España" → "Madrid"
  const parts = secondaryText.split(',').map((s) => s.trim());
  return parts[parts.length - 2] ?? parts[0] ?? '';
}
