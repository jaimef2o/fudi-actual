import { supabase } from './supabase';

// Articles that may legitimately start a chain name ("La Tagliatella", "El Rincón").
// When the first word is an article, we try a two-word prefix (article + brand noun).
const ARTICLE_WORDS = new Set([
  'la', 'el', 'los', 'las', 'the', 'a', 'an', 'le', 'les', 'un', 'una', 'di',
]);

// Prepositions and generic venue nouns that NEVER start a chain brand name.
// If the name starts with any of these words, it's an independent restaurant — stop immediately.
const ABORT_WORDS = new Set([
  'en', 'con', 'sin', 'por', 'al', 'del', 'de', 'para', 'tras', 'ante',
  'bar', 'cafe', 'cafeteria', 'restaurante', 'restaurant',
  'casa', 'taberna', 'meson', 'bodega', 'bodegas', 'tasca',
  'cerveceria', 'marisqueria', 'churreria', 'pizzeria', 'trattoria',
]);

// Conjunctions that signal a compound name, not a "brand + location" pattern.
// e.g. "Sur y Norte", "Sal y Pimienta", "Pan & Co" — these are NOT chains.
const CONJUNCTION_WORDS = new Set(['y', 'e', 'o', 'u', '&', 'and', 'or', 'i']);

/**
 * Extracts the brand prefix from a restaurant name.
 * "SUMO Juan Bravo"        → "sumo"
 * "McDonald's Gran Vía"    → "mcdonald's"
 * "La Tagliatella Goya"    → "la tagliatella"  (first word is article → take 2)
 * "Bar El Graduado"        → null              (bar + article → not a chain marker)
 *
 * Exported as extractBrandPrefixPublic for use in upsertRestaurant.
 */
export function extractBrandPrefixPublic(name: string): { prefix: string; hasLocationSuffix: boolean } | null {
  const prefix = extractBrandPrefix(name);
  if (!prefix) return null;
  const prefixWordCount = prefix.split(' ').length;
  const nameWordCount = name.trim().split(/\s+/).length;
  return { prefix, hasLocationSuffix: nameWordCount >= prefixWordCount + 2 };
}

function extractBrandPrefix(name: string): string | null {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const words = normalized.split(/\s+/);
  if (words.length === 0) return null;

  const first = words[0];

  // Prepositions / generic venue nouns → this is NOT a chain name, stop immediately.
  // e.g. "En Copa de Balón", "Bar El Graduado", "Casa Lucio"
  if (ABORT_WORDS.has(first)) return null;

  // Article as first word → try two-word prefix (e.g. "La Tagliatella", "El Corte Inglés")
  if (ARTICLE_WORDS.has(first)) {
    if (words.length >= 2) {
      const second = words[1];
      // Two consecutive articles/aborts → not a chain (e.g. "La De Manolo")
      if (ARTICLE_WORDS.has(second) || ABORT_WORDS.has(second)) return null;
      // Conjunction after article+brand → compound name, not a chain (e.g. "La Mar y Tierra")
      if (words.length >= 3 && CONJUNCTION_WORDS.has(words[2])) return null;
      return `${first} ${second}`;
    }
    return null;
  }

  // First word is a meaningful brand token (e.g. "SUMO", "McDonald's", "Grosso")
  // BUT: if the next word is a conjunction, this is a compound name — not a chain brand.
  // e.g. "Sur y Norte", "Sal y Pimienta", "Pan & Compañía" → independent.
  if (words.length >= 2 && CONJUNCTION_WORDS.has(words[1])) return null;

  return first;
}

export type ChainResult = {
  ids: string[];
  /** Brand name to display (e.g. "SUMO"). Null for independent restaurants. */
  brandName: string | null;
};

/**
 * Returns all restaurant_ids that should be queried together for dishes/visits,
 * plus the brand name to display when it's a chain.
 *
 * Priority:
 *   1. chain_id (manual override) → use siblings by chain_id
 *   2. Auto-detect by name prefix: if 2+ restaurants share the same brand
 *      prefix → treat as chain and return all matching IDs
 *   3. Independent restaurant → { ids: [restaurantId], brandName: null }
 */
export async function getRelevantRestaurantIds(restaurantId: string): Promise<ChainResult> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, chain_id, brand_name, lat, lng')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { ids: [restaurantId], brandName: null };

  // 0. brand_name stored in DB (Google-verified) — fastest path
  if ((restaurant as any).brand_name) {
    // Also try to group siblings by chain_id if available
    if (restaurant.chain_id) {
      const { data: siblings } = await supabase
        .from('restaurants')
        .select('id')
        .eq('chain_id', restaurant.chain_id);
      return {
        ids: siblings?.map((r) => r.id) ?? [restaurantId],
        brandName: (restaurant as any).brand_name,
      };
    }
    // Single location with verified brand name
    return { ids: [restaurantId], brandName: (restaurant as any).brand_name };
  }

  // 1. Manual chain_id override
  if (restaurant.chain_id) {
    const { data: siblings } = await supabase
      .from('restaurants')
      .select('id')
      .eq('chain_id', restaurant.chain_id);
    const prefix = extractBrandPrefix(restaurant.name);
    const brandName = prefix ? capitalize(prefix) : restaurant.name;
    return { ids: siblings?.map((r) => r.id) ?? [restaurantId], brandName };
  }

  // 2. Auto-detect by name prefix
  const prefix = extractBrandPrefix(restaurant.name);
  if (prefix) {
    // Require a SPACE after the brand prefix (word boundary).
    // This prevents "sur" from matching "Sur.y Norte" — after "sur" comes "." not " ".
    // We always include the current restaurant itself, then add any siblings found.
    const { data: matches } = await supabase
      .from('restaurants')
      .select('id')
      .ilike('name', `${prefix} %`);

    const siblingIds = matches?.map((r) => r.id) ?? [];
    // Deduplicate: current restaurant + siblings
    const ids = [...new Set([restaurantId, ...siblingIds])];

    // Multiple locations confirmed → full chain grouping
    if (ids.length > 1) {
      const prefixWordCount = prefix.split(' ').length;
      const originalPrefix = restaurant.name.trim().split(/\s+/).slice(0, prefixWordCount).join(' ');
      return { ids, brandName: originalPrefix };
    }

    // Single location but name has a location suffix (2+ words after the brand prefix)
    // e.g. "SUMO Juan Bravo" → prefix "sumo" + suffix "Juan Bravo" (2 words) → brandName = "SUMO"
    // We require 2+ extra words to avoid shortening "Honest Greens" → "Honest"
    const prefixWordCount = prefix.split(' ').length;
    const nameWordCount = restaurant.name.trim().split(/\s+/).length;
    if (nameWordCount >= prefixWordCount + 2) {
      // Use original casing from the restaurant name (e.g. "SUMO" not "Sumo")
      const originalPrefix = restaurant.name.trim().split(/\s+/).slice(0, prefixWordCount).join(' ');
      return { ids: [restaurantId], brandName: originalPrefix };
    }
  }

  // 3. Independent
  return { ids: [restaurantId], brandName: null };
}

function capitalize(text: string): string {
  return text
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Legacy: resolve chain_id from a restaurant name against the chains catalog.
 * Used by upsertRestaurant. Returns null if no chains table exists yet.
 */
export async function resolveChainId(restaurantName: string): Promise<string | null> {
  try {
    const normalized = restaurantName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const { data: chains } = await supabase.from('chains').select('id, name');
    for (const chain of chains ?? []) {
      const chainNorm = chain.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      if (normalized.startsWith(chainNorm) || normalized.includes(chainNorm)) {
        return chain.id;
      }
    }
    return null;
  } catch {
    return null;
  }
}
