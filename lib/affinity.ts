/**
 * SAVRY — Algoritmo de Afinidad
 *
 * Calcula un score 0–100% que refleja qué tan parecidos son
 * los gustos de dos usuarios basándose en:
 *   1. Sentimiento compartido (¿opinan lo mismo?)
 *   2. Score proximity (¿puntúan parecido?)
 *   3. Overlap breadth (¿cuántos restaurantes en común?)
 */

export interface SharedVisit {
  restaurantId: string;
  userSentiment: 'loved' | 'fine' | 'disliked';
  friendSentiment: 'loved' | 'fine' | 'disliked';
  userScore: number;
  friendScore: number;
}

export interface AffinityResult {
  score: number;          // 0–100
  sharedCount: number;    // restaurantes en común
  agreement: number;      // % de acuerdo en sentimiento
  avgScoreDiff: number;   // diferencia media de scores
  label: string;          // etiqueta descriptiva
}

// Peso de cada componente
const WEIGHTS = {
  sentimentMatch: 0.50,
  scoreProximity: 0.30,
  overlapBonus: 0.20,
};

const MIN_SHARED_RESTAURANTS = 2;

function sentimentMatchScore(shared: SharedVisit[]): number {
  const sentimentMap: Record<string, number> = { loved: 2, fine: 1, disliked: 0 };
  let totalMatch = 0;
  for (const visit of shared) {
    const diff = Math.abs(sentimentMap[visit.userSentiment] - sentimentMap[visit.friendSentiment]);
    totalMatch += 1 - diff / 2;
  }
  return totalMatch / shared.length;
}

function scoreProximityScore(shared: SharedVisit[]): number {
  let totalProximity = 0;
  for (const visit of shared) {
    const diff = Math.abs(visit.userScore - visit.friendScore);
    totalProximity += 1 - diff / 9;
  }
  return totalProximity / shared.length;
}

function overlapBonusScore(sharedCount: number, userTotal: number, friendTotal: number): number {
  const minTotal = Math.min(userTotal, friendTotal);
  if (minTotal === 0) return 0;
  const ratio = sharedCount / minTotal;
  const logBonus = Math.min(1, Math.log2(sharedCount + 1) / Math.log2(21));
  return ratio * 0.4 + logBonus * 0.6;
}

function getAffinityLabel(score: number): string {
  if (score >= 85) return 'Almas gemelas';
  if (score >= 70) return 'Muy afines';
  if (score >= 50) return 'Gustos parecidos';
  if (score >= 30) return 'Algo en común';
  return 'Gustos diferentes';
}

export function calculateAffinity(
  shared: SharedVisit[],
  userTotalVisits: number,
  friendTotalVisits: number
): AffinityResult {
  if (shared.length < MIN_SHARED_RESTAURANTS) {
    return {
      score: 0,
      sharedCount: shared.length,
      agreement: 0,
      avgScoreDiff: 0,
      label: shared.length === 0 ? 'Sin visitas en común' : 'Pocos sitios en común',
    };
  }

  const sentiment = sentimentMatchScore(shared);
  const proximity = scoreProximityScore(shared);
  const overlap = overlapBonusScore(shared.length, userTotalVisits, friendTotalVisits);

  const rawScore =
    sentiment * WEIGHTS.sentimentMatch +
    proximity * WEIGHTS.scoreProximity +
    overlap * WEIGHTS.overlapBonus;

  const finalScore = Math.round(rawScore * 100);
  const agreement = Math.round(sentiment * 100);
  const avgScoreDiff =
    shared.reduce((sum, v) => sum + Math.abs(v.userScore - v.friendScore), 0) / shared.length;

  return {
    score: finalScore,
    sharedCount: shared.length,
    agreement,
    avgScoreDiff: Math.round(avgScoreDiff * 10) / 10,
    label: getAffinityLabel(finalScore),
  };
}
