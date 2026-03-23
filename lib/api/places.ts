const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

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
};

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  if (!query.trim() || query.length < 2) return [];
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(query)}` +
    `&types=restaurant|food|bar|cafe` +
    `&language=es` +
    `&key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      console.warn('Places autocomplete error:', json.status);
    }
    return json.predictions ?? [];
  } catch (e) {
    console.error('searchPlaces error', e);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = 'place_id,name,formatted_address,vicinity,geometry,price_level,types,photos';
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}` +
    `&fields=${fields}` +
    `&language=es` +
    `&key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK') {
      console.warn('Places details error:', json.status);
      return null;
    }
    return json.result;
  } catch (e) {
    console.error('getPlaceDetails error', e);
    return null;
  }
}

export function getPhotoUrl(photoReference: string, maxWidth = 600): string {
  return (
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${maxWidth}` +
    `&photo_reference=${photoReference}` +
    `&key=${API_KEY}`
  );
}

/** Extract a neighborhood or short city label from a place's secondary text */
export function extractNeighborhood(secondaryText: string): string {
  // "Calle X, Madrid, España" → "Madrid"
  const parts = secondaryText.split(',').map((s) => s.trim());
  return parts[parts.length - 2] ?? parts[0] ?? '';
}
