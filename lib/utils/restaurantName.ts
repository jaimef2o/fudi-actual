import { matchChain, getChainName } from '../chains';

/**
 * Context-aware display name for restaurants.
 *
 * Rules from CHAIN_CATALOG v2:
 * - 'post' / 'detail' → show full local name ("Grosso Napoletano Malasaña")
 * - 'ranking' / 'search' → show chain brand name ("Grosso Napoletano")
 * - Independent restaurants → always show restaurant.name as-is
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
  // For posts and detail views, always show the full local name
  if (context === 'post' || context === 'detail') {
    return restaurant.name;
  }

  // For ranking and search, show the chain brand name if it's a chain
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
