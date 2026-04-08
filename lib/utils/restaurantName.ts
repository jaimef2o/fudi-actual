import { matchChain, getChainName } from '../chains';

/**
 * Context-aware display name for restaurants.
 *
 * All contexts now use the chain brand name when available.
 * For chains, shows the canonical brand name ("Hundred Burgers") instead of
 * the raw Google Places name ("Hundreds Juan Bravo").
 * Independent restaurants always show restaurant.name as-is.
 *
 * Priority for chain detection:
 * 1. chain_name column (pre-resolved slug from catalog, stored in DB)
 * 2. Live regex match against CHAIN_CATALOG
 * 3. Fallback: restaurant.name as-is
 */
export type DisplayContext = 'post' | 'ranking' | 'search' | 'detail';

export function getDisplayName(
  restaurant: {
    name: string;
    chain_name?: string | null;
    brand_name?: string | null;
  },
  context: DisplayContext = 'post'
): string {
  // For 'post' and 'detail': show full location name (e.g. "Grosso Napoletano Malasaña")
  // For 'ranking' and 'search': show brand name only (e.g. "Grosso Napoletano")
  const useFullName = context === 'post' || context === 'detail';

  if (useFullName) {
    // In post/detail, always return the Google Places name as-is
    return restaurant.name;
  }

  // ranking/search: resolve to canonical brand name
  // 1. Try chain_name column (pre-resolved)
  if (restaurant.chain_name) {
    const brandName = getChainName(restaurant.chain_name);
    if (brandName) return brandName;
  }

  // 2. Legacy: try brand_name column (old system)
  if (restaurant.brand_name) {
    return restaurant.brand_name;
  }

  // 3. Try live regex match
  const match = matchChain(restaurant.name);
  if (match) return match.name;

  // 4. Independent restaurant — return as-is
  return restaurant.name;
}
