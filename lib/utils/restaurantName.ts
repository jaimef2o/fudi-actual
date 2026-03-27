import { extractBrandPrefixPublic } from '../chains';

/**
 * Returns the best display name for a restaurant.
 *
 * Priority:
 * 1. brand_name (Google-verified chain, stored in DB) → use as-is
 * 2. Name has a detectable location suffix (e.g. "SUMO Juan Bravo") → return prefix ("SUMO")
 * 3. Plain name → return as-is
 *
 * Used in Descubrir, Listas, Profile ranking, and anywhere outside the
 * restaurant detail page (where the full location name makes sense).
 */
export function getDisplayName(restaurant: {
  name: string;
  brand_name?: string | null;
}): string {
  if (restaurant.brand_name) return restaurant.brand_name;

  const detected = extractBrandPrefixPublic(restaurant.name);
  if (detected?.hasLocationSuffix) {
    const prefixWordCount = detected.prefix.split(' ').length;
    // Preserve original casing ("SUMO" not "Sumo", "La Tagliatella" not "la tagliatella")
    return restaurant.name.trim().split(/\s+/).slice(0, prefixWordCount).join(' ');
  }

  return restaurant.name;
}
