import { supabase } from './supabase';

// ══════════════════════════════════════════════════════════════════════════════
// CHAIN_CATALOG v2 — 127 cadenas verificadas (Alimarket 2025, webs corporativas)
// Cada entrada: regex pattern, slug id, display name
// ══════════════════════════════════════════════════════════════════════════════

export type ChainEntry = { pattern: RegExp; chainId: string; name: string };

export const CHAIN_CATALOG: ChainEntry[] = [
  // ── FAST FOOD — HAMBURGUESAS INTERNACIONALES ──
  { pattern: /mcdonald/i,                    chainId: 'mcdonalds',            name: "McDonald's" },
  { pattern: /burger\s*king/i,               chainId: 'burger-king',          name: "Burger King" },
  { pattern: /\bkfc\b/i,                     chainId: 'kfc',                  name: "KFC" },
  { pattern: /five\s*guys/i,                 chainId: 'five-guys',            name: "Five Guys" },
  { pattern: /carl.s\s*jr/i,                 chainId: 'carls-jr',             name: "Carl's Jr." },
  { pattern: /popeyes/i,                     chainId: 'popeyes',              name: "Popeyes" },
  { pattern: /wendy.s/i,                     chainId: 'wendys',               name: "Wendy's" },
  { pattern: /wingstop/i,                    chainId: 'wingstop',             name: "Wingstop" },
  { pattern: /pollo\s*campero/i,             chainId: 'pollo-campero',        name: "Pollo Campero" },

  // ── FAST FOOD — HAMBURGUESAS ESPAÑOLAS / GOURMET ──
  { pattern: /\bgoiko\b/i,                   chainId: 'goiko',                name: "Goiko" },
  { pattern: /\btgb\b|the\s*good\s*burger/i, chainId: 'tgb',                  name: "TGB – The Good Burger" },
  { pattern: /\bbacoa\b/i,                   chainId: 'bacoa',                name: "Bacoa" },
  { pattern: /la\s*pepita/i,                 chainId: 'la-pepita',            name: "La Pepita Burger Bar" },
  { pattern: /frankie\s*burger/i,            chainId: 'frankie-burgers',      name: "Frankie Burgers" },
  { pattern: /\bvicio\b/i,                   chainId: 'vicio',                name: "Vicio" },
  { pattern: /hamburguesa\s*nostra/i,        chainId: 'hamburguesa-nostra',   name: "Hamburguesa Nostra" },
  { pattern: /new\s*york\s*burger/i,         chainId: 'new-york-burger',      name: "New York Burger" },
  { pattern: /timesburg/i,                   chainId: 'timesburg',            name: "Timesburg" },
  { pattern: /toro\s*burger/i,               chainId: 'toro-burger',          name: "TORO Burger Lounge" },
  { pattern: /\bberty.s\b/i,                 chainId: 'bertys',               name: "Berty's" },
  { pattern: /\bhundreds\b/i,                chainId: 'hundreds',             name: "Hundreds" },

  // ── FAST FOOD — PIZZA ──
  { pattern: /telepizza/i,                   chainId: 'telepizza',            name: "Telepizza" },
  { pattern: /domino.s/i,                    chainId: 'dominos',              name: "Domino's Pizza" },
  { pattern: /pizza\s*hut/i,                 chainId: 'pizza-hut',            name: "Pizza Hut" },
  { pattern: /papa\s*john/i,                 chainId: 'papa-johns',           name: "Papa John's" },
  { pattern: /grosso\s*napoleon/i,           chainId: 'grosso-napoletano',    name: "Grosso Napoletano" },
  { pattern: /fratelli\s*figurato/i,         chainId: 'fratelli-figurato',    name: "Fratelli Figurato" },
  { pattern: /papizza/i,                     chainId: 'papizza',              name: "Papizza" },

  // ── FAST FOOD — OTROS ──
  { pattern: /\bsubway\b/i,                  chainId: 'subway',               name: "Subway" },
  { pattern: /taco\s*bell/i,                 chainId: 'taco-bell',            name: "Taco Bell" },
  { pattern: /dunkin/i,                      chainId: 'dunkin',               name: "Dunkin'" },
  { pattern: /pans\s*[&y]?\s*company/i,      chainId: 'pans-company',         name: "Pans & Company" },
  { pattern: /\brodilla\b/i,                 chainId: 'rodilla',              name: "Rodilla" },
  { pattern: /\bbocatta\b/i,                 chainId: 'bocatta',              name: "Bocatta" },

  // ── CASUAL DINING — AMERICANO / DINER ──
  { pattern: /\bvips\b/i,                    chainId: 'vips',                 name: "VIPS" },
  { pattern: /foster.s\s*hollywood/i,        chainId: 'fosters-hollywood',    name: "Foster's Hollywood" },
  { pattern: /100\s*montaditos/i,            chainId: '100-montaditos',       name: "100 Montaditos" },
  { pattern: /la\s*sure[ñn]a/i,             chainId: 'la-surena',            name: "La Sureña" },
  { pattern: /tony\s*roma/i,                 chainId: 'tony-romas',           name: "Tony Roma's" },
  { pattern: /tgi\s*friday|friday.s/i,       chainId: 'tgi-fridays',          name: "TGI Friday's" },
  { pattern: /hard\s*rock\s*caf[eé]/i,       chainId: 'hard-rock-cafe',       name: "Hard Rock Cafe" },
  { pattern: /tommy\s*mel/i,                 chainId: 'tommy-mels',           name: "Tommy Mel's" },
  { pattern: /peggy\s*sue/i,                 chainId: 'peggy-sues',           name: "Peggy Sue's" },

  // ── CASUAL DINING — ITALIANO ──
  { pattern: /la\s*tagliatella/i,            chainId: 'la-tagliatella',       name: "La Tagliatella" },
  { pattern: /\bginos\b/i,                   chainId: 'ginos',                name: "Ginos" },
  { pattern: /\bpomodoro\b/i,                chainId: 'pomodoro',             name: "Pomodoro" },
  { pattern: /\bvezzo\b/i,                   chainId: 'vezzo',                name: "Vezzo" },
  { pattern: /muerde\s*la\s*pasta/i,         chainId: 'muerde-la-pasta',      name: "Muerde la Pasta" },
  { pattern: /la\s*mafia/i,                  chainId: 'la-mafia',             name: "La Mafia se sienta a la mesa" },

  // ── CASUAL DINING — TAPAS Y ESPAÑOL TRADICIONAL ──
  { pattern: /\blateral\b/i,                 chainId: 'lateral',              name: "Lateral" },
  { pattern: /la\s*maruca/i,                 chainId: 'la-maruca',            name: "La Maruca" },
  { pattern: /volapi[eé]/i,                  chainId: 'taberna-volapie',      name: "Taberna del Volapié" },
  { pattern: /lizarran/i,                    chainId: 'lizarran',             name: "Lizarran" },
  { pattern: /ca[ñn]as\s*y\s*tapas/i,        chainId: 'canas-y-tapas',        name: "Cañas y Tapas" },
  { pattern: /barra\s*de\s*pintxos/i,        chainId: 'barra-de-pintxos',     name: "BaRRa de Pintxos" },
  { pattern: /celso\s*y\s*manolo/i,          chainId: 'celso-y-manolo',       name: "Celso y Manolo" },
  { pattern: /arz[aá]bal/i,                  chainId: 'arzabal',              name: "Arzábal" },
  { pattern: /mercado\s*de\s*la\s*reina/i,   chainId: 'mercado-reina',        name: "Mercado de la Reina" },
  { pattern: /m[aá]sqmenos|m[aá]s\s*que?\s*menos/i, chainId: 'masqmenos',    name: "MásQMenos" },
  { pattern: /cantina\s*mariachi/i,          chainId: 'cantina-mariachi',     name: "Cantina Mariachi" },
  { pattern: /taberna\s*la\s*daniela/i,      chainId: 'taberna-la-daniela',   name: "Taberna La Daniela" },
  { pattern: /asador\s*de\s*aranda/i,        chainId: 'asador-aranda',        name: "Asador de Aranda" },
  { pattern: /\bojal[aá]\b/i,               chainId: 'ojala',                name: "Ojalá" },
  { pattern: /dehesa\s*santa\s*mar[ií]a/i,   chainId: 'dehesa-santa-maria',   name: "Dehesa Santa María" },
  { pattern: /\bel\s*kiosko\b/i,             chainId: 'el-kiosko',            name: "El Kiosko" },
  { pattern: /museo\s*del\s*jam[oó]n/i,      chainId: 'museo-del-jamon',      name: "Museo del Jamón" },
  { pattern: /cinco\s*jotas|5\s*j\b/i,       chainId: 'cinco-jotas',          name: "Mesón Cinco Jotas" },
  { pattern: /taller\s*de\s*tapas/i,         chainId: 'taller-de-tapas',      name: "Taller de Tapas" },
  { pattern: /tapas\s*24/i,                  chainId: 'tapas-24',             name: "Tapas 24" },
  { pattern: /\blamucca\b/i,                 chainId: 'lamucca',              name: "Lamucca" },
  { pattern: /la\s*mordida/i,                chainId: 'la-mordida',           name: "La Mordida" },
  { pattern: /pura\s*brasa/i,                chainId: 'pura-brasa',           name: "Pura Brasa" },

  // ── COCINA SALUDABLE ──
  { pattern: /honest\s*green/i,              chainId: 'honest-greens',        name: "Honest Greens" },
  { pattern: /flax\s*[&y]\s*kale/i,          chainId: 'flax-kale',            name: "Flax & Kale" },
  { pattern: /teresa\s*carles/i,             chainId: 'teresa-carles',        name: "Teresa Carles" },
  { pattern: /\bfresc\s*co\b/i,              chainId: 'fresco',               name: "FrescCo" },

  // ── POKE BOWLS ──
  { pattern: /aloha\s*poke/i,                chainId: 'aloha-poke',           name: "Aloha Poke" },
  { pattern: /poke\s*house/i,                chainId: 'poke-house',           name: "Poke House" },
  { pattern: /tasty\s*poke/i,                chainId: 'tasty-poke',           name: "Tasty Poke Bar" },
  { pattern: /ohana\s*poke/i,                chainId: 'ohana-poke',           name: "Ohana Poke House" },
  { pattern: /healthy\s*poke/i,              chainId: 'healthy-poke',         name: "Healthy Poke" },
  { pattern: /mahalo\s*pok[eé]/i,            chainId: 'mahalo-poke',          name: "Mahalo Poké" },

  // ── COCINA ASIÁTICA ──
  { pattern: /\budon\b/i,                    chainId: 'udon',                 name: "UDON" },
  { pattern: /wagamama/i,                    chainId: 'wagamama',             name: "Wagamama" },
  { pattern: /miss\s*sushi/i,                chainId: 'miss-sushi',           name: "Miss Sushi" },
  { pattern: /sushisom/i,                    chainId: 'sushisom',             name: "Sushisom" },
  { pattern: /sushi\s*shop/i,                chainId: 'sushi-shop',           name: "Sushi Shop" },
  { pattern: /kanbun/i,                      chainId: 'kanbun',               name: "Kanbun" },
  { pattern: /\bsibuya\b/i,                  chainId: 'sibuya',               name: "Sibuya Urban Sushi Bar" },
  { pattern: /ramen\s*shifu/i,               chainId: 'ramen-shifu',          name: "Ramen Shifu" },
  { pattern: /ramen\s*kagura/i,              chainId: 'ramen-kagura',         name: "Ramen Kagura" },
  { pattern: /wok\s*to\s*walk/i,             chainId: 'wok-to-walk',          name: "Wok to Walk" },
  { pattern: /tuk\s*tuk/i,                   chainId: 'tuk-tuk',              name: "Tuk Tuk Asian Street Food" },
  { pattern: /makitake/i,                    chainId: 'makitake',             name: "Makitake" },
  { pattern: /sushita/i,                     chainId: 'sushita',              name: "Sushita" },
  { pattern: /\bsumo\b/i,                    chainId: 'sumo',                 name: "Sumo" },
  { pattern: /ikibana/i,                     chainId: 'ikibana',              name: "Ikibana" },
  { pattern: /padthaiwok|pad\s*thai\s*wok/i, chainId: 'padthaiwok',           name: "Padthaiwok" },
  { pattern: /boa[\s-]*bao/i,                chainId: 'boa-bao',              name: "Boa-Bao" },

  // ── CAFÉ, BAKERY Y DESAYUNOS ──
  { pattern: /starbucks/i,                   chainId: 'starbucks',            name: "Starbucks" },
  { pattern: /tim\s*horton/i,                chainId: 'tim-hortons',          name: "Tim Hortons" },
  { pattern: /santagloria/i,                 chainId: 'santagloria',          name: "Santagloria" },
  { pattern: /\bgranier\b/i,                 chainId: 'granier',              name: "Granier" },
  { pattern: /\bpanaria\b/i,                 chainId: 'panaria',              name: "Panaria" },
  { pattern: /caf[eé]\s*[&y]\s*t[eé]/i,      chainId: 'cafe-y-te',            name: "Café & Té" },
  { pattern: /manolo\s*bakes/i,              chainId: 'manolo-bakes',         name: "Manolo Bakes" },
  { pattern: /levaduramadre/i,               chainId: 'levaduramadre',        name: "Levaduramadre" },
  { pattern: /le\s*pain\s*quotidien/i,       chainId: 'le-pain-quotidien',    name: "Le Pain Quotidien" },
  { pattern: /l['']obrador/i,                chainId: 'lobrador',             name: "L'Obrador" },
  { pattern: /\bviena\b/i,                   chainId: 'viena',                name: "Viena" },
  { pattern: /brunch\s*[&y]\s*cake/i,        chainId: 'brunch-and-cake',      name: "Brunch & Cake" },
  { pattern: /celicioso/i,                   chainId: 'celicioso',            name: "Celicioso" },
  { pattern: /alsur\s*caf[eé]/i,             chainId: 'alsur-cafe',           name: "Alsur Café" },
  { pattern: /krispy\s*kreme/i,              chainId: 'krispy-kreme',         name: "Krispy Kreme" },
  { pattern: /wowble/i,                      chainId: 'wowble',              name: "Wowble!" },

  // ── HELADOS Y POSTRES ──
  { pattern: /llaollao/i,                    chainId: 'llaollao',             name: "Llaollao" },
  { pattern: /sm[oö]+y/i,                    chainId: 'smooy',                name: "Smöoy" },
  { pattern: /h[aä]agen.dazs/i,              chainId: 'haagen-dazs',          name: "Häagen-Dazs" },
  { pattern: /\bamorino\b/i,                 chainId: 'amorino',              name: "Amorino" },

  // ── OTROS ──
  { pattern: /la\s*chelinda/i,               chainId: 'la-chelinda',          name: "La Chelinda" },
  { pattern: /kurz/i,                        chainId: 'kurz-und-gut',         name: "Kurz & Gut" },
  { pattern: /taco\s*alto/i,                 chainId: 'taco-alto',            name: "Taco Alto" },
  { pattern: /\bsagardi\b/i,                 chainId: 'sagardi',              name: "Sagardi" },
  { pattern: /\birati\b/i,                   chainId: 'irati',                name: "Irati" },
  { pattern: /blue\s*frog/i,                 chainId: 'blue-frog',            name: "Blue Frog" },
];

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/** Match a restaurant name against the catalog. Returns chain info or null. */
export function matchChain(restaurantName: string): ChainEntry | null {
  for (const entry of CHAIN_CATALOG) {
    if (entry.pattern.test(restaurantName)) return entry;
  }
  return null;
}

/** Get chain display name from a chainId slug. */
export function getChainName(chainId: string): string | null {
  const entry = CHAIN_CATALOG.find(c => c.chainId === chainId);
  return entry?.name ?? null;
}

/** Check if a restaurant name belongs to a known chain. */
export function isChain(restaurantName: string): boolean {
  return matchChain(restaurantName) !== null;
}

// ══════════════════════════════════════════════════════════════════════════════
// RESTAURANT GROUPING — find sibling locations of a chain
// ══════════════════════════════════════════════════════════════════════════════

export type ChainResult = {
  ids: string[];
  chainName: string | null;  // Display name of the chain (null = independent)
  chainId: string | null;    // Slug from catalog
};

/**
 * Given a restaurant ID, find all sibling locations of the same chain.
 * Returns { ids, chainName } — for independents, ids = [restaurantId], chainName = null.
 */
export async function getRelevantRestaurantIds(restaurantId: string): Promise<ChainResult> {
  // 1. Fetch the restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, chain_name')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { ids: [restaurantId], chainName: null, chainId: null };

  // 2. If chain_name is already set, find siblings by chain_name
  if (restaurant.chain_name) {
    const { data: siblings } = await supabase
      .from('restaurants')
      .select('id')
      .eq('chain_name', restaurant.chain_name);

    const ids = (siblings ?? []).map((r: any) => r.id);
    if (!ids.includes(restaurantId)) ids.push(restaurantId);

    // Look up display name from catalog
    const entry = CHAIN_CATALOG.find(c => c.chainId === restaurant.chain_name);
    return {
      ids,
      chainName: entry?.name ?? restaurant.chain_name,
      chainId: restaurant.chain_name,
    };
  }

  // 3. Try matching name against catalog
  const match = matchChain(restaurant.name);
  if (!match) return { ids: [restaurantId], chainName: null, chainId: null };

  // 4. Find all restaurants matching this chain
  const { data: siblings } = await supabase
    .from('restaurants')
    .select('id, name')
    .neq('id', restaurantId);

  const siblingIds = (siblings ?? [])
    .filter((r: any) => match.pattern.test(r.name))
    .map((r: any) => r.id);

  const ids = [restaurantId, ...siblingIds];

  // 5. Backfill chain_name for all matched restaurants (async, non-blocking)
  if (ids.length > 0) {
    Promise.resolve(
      supabase
        .from('restaurants')
        .update({ chain_name: match.chainId })
        .in('id', ids)
    ).catch((err: any) => console.warn('[fudi] chain_name backfill failed:', err));
  }

  return { ids, chainName: match.name, chainId: match.chainId };
}

// Legacy compat — used by old upsertRestaurant
export function extractBrandPrefixPublic(name: string): { prefix: string; hasLocationSuffix: boolean } | null {
  const match = matchChain(name);
  if (!match) return null;
  return { prefix: match.name, hasLocationSuffix: true };
}

export function resolveChainId(_name: string): Promise<string | null> {
  const match = matchChain(_name);
  return Promise.resolve(match?.chainId ?? null);
}
