// ─── For You Feed — Scoring Signals ──────────────────────────────────────────
import { RECENCY_HALF_LIFE_DAYS, NEUTRAL_SCORE } from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ForYouCandidate = {
  visit_id: string;
  author_id: string;
  restaurant_id: string;
  visited_at: string;
  created_at: string;
  sentiment: 'loved' | 'fine' | 'disliked' | null;
  rank_score: number | null;
  note: string | null;
  restaurant_name: string;
  lat: number | null;
  lng: number | null;
  cuisine: string | null;
  city: string | null;
  author_name: string;
  author_handle: string | null;
  author_avatar: string | null;
  author_city: string | null;
  // Computed in query
  i_follow_author: boolean;
  is_mutual: boolean;
  mutual_friends_following_author: number;
  reaction_count: number;
  total_saves: number;
  photo_count: number;
  dish_count: number;
};

export type TasteCache = {
  cuisine_scores: Record<string, number>; // cuisine → 0-1 avg sentiment
};

// ─── Signal 1: Taste Affinity (weight 0.30) ──────────────────────────────────

export function tasteAffinityScore(
  candidate: ForYouCandidate,
  userTaste: TasteCache
): number {
  const cuisine = candidate.cuisine;
  if (!cuisine) return NEUTRAL_SCORE;

  const userCuisineScore = userTaste.cuisine_scores[cuisine];
  if (userCuisineScore === undefined) return NEUTRAL_SCORE;

  const authorSentimentScore =
    candidate.sentiment === 'loved'    ? 1.0 :
    candidate.sentiment === 'fine'     ? 0.5 : 0.0;

  // Closer scores = better match
  return 1 - Math.abs(userCuisineScore - authorSentimentScore);
}

// ─── Signal 2: Geo Proximity (weight 0.25) ───────────────────────────────────

export function geoProximityScore(
  candidate: ForYouCandidate,
  userCity: string | null,
  userLat?: number | null,
  userLng?: number | null
): number {
  // Level 1: same city
  if (userCity && candidate.city &&
      normalize(userCity) === normalize(candidate.city)) {
    return 1.0;
  }

  // Level 2: haversine distance
  if (userLat && userLng && candidate.lat && candidate.lng) {
    const km = haversineDistance(userLat, userLng, candidate.lat, candidate.lng);
    if (km <= 5) return 1.0;
    if (km <= 20) return 0.85;
    if (km <= 50) return 0.6;
    if (km <= 200) return 0.3;
    return 0.1;
  }

  return NEUTRAL_SCORE;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Signal 3: Social Proximity (weight 0.15) ────────────────────────────────

export function socialProximityScore(candidate: ForYouCandidate): number {
  if (candidate.is_mutual) return 1.0;
  if (candidate.i_follow_author) return 0.8;

  const fof = candidate.mutual_friends_following_author;
  if (fof >= 5) return 0.7;
  if (fof >= 3) return 0.6;
  if (fof >= 1) return 0.4;

  return 0.1;
}

// ─── Signal 4: Engagement (weight 0.10) ──────────────────────────────────────

export function engagementScore(candidate: ForYouCandidate): number {
  const reactions = candidate.reaction_count;
  const saves = candidate.total_saves;

  // Log curve to avoid overvaluing virality
  const reactionScore = Math.min(1, Math.log2(reactions + 1) / Math.log2(51));
  const saveScore = Math.min(1, Math.log2(saves + 1) / Math.log2(21));

  return reactionScore * 0.6 + saveScore * 0.4;
}

// ─── Signal 5: Content Quality (weight 0.10) ─────────────────────────────────

export function contentQualityScore(candidate: ForYouCandidate): number {
  let score = 0;

  if (candidate.photo_count > 0) score += 0.40;
  if (candidate.photo_count >= 3) score += 0.10;

  if (candidate.note && candidate.note.length > 20) score += 0.25;

  if (candidate.dish_count > 0) score += 0.15;
  if (candidate.dish_count >= 3) score += 0.10;

  return Math.min(1, score);
}

// ─── Signal 6: Recency (weight 0.10) ─────────────────────────────────────────

export function recencyScore(candidate: ForYouCandidate): number {
  const now = Date.now();
  const created = new Date(candidate.created_at).getTime();
  const daysAgo = (now - created) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, daysAgo / RECENCY_HALF_LIFE_DAYS);
}
