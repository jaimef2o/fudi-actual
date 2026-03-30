/**
 * Taste Profile System
 * Computes a user's gastronomy level based on their activity.
 *
 * Levels (in order):
 * 1. Novato Gastronómico    — 0-2 visits
 * 2. Explorador de Sabores  — 3-9 visits
 * 3. Paladar Refinado       — 10-24 visits
 * 4. Crítico Gastronómico   — 25-49 visits
 * 5. QuintoExquisito        — 50+ visits
 */

export type TasteLevel = {
  name: string;
  level: number;       // 1-5
  minVisits: number;
  icon: string;        // Material icon name
  color: string;       // Badge color
};

const LEVELS: TasteLevel[] = [
  { name: 'Novato Gastronómico',    level: 1, minVisits: 0,  icon: 'eco',           color: '#e6e2db' },
  { name: 'Explorador de Sabores',  level: 2, minVisits: 3,  icon: 'explore',       color: '#f1ede6' },
  { name: 'Paladar Refinado',       level: 3, minVisits: 10, icon: 'restaurant',    color: '#c7ef48' },
  { name: 'Crítico Gastronómico',   level: 4, minVisits: 25, icon: 'workspace-premium', color: '#c7ef48' },
  { name: 'QuintoExquisito',        level: 5, minVisits: 50, icon: 'diamond',       color: '#c7ef48' },
];

/**
 * Determine taste level from visit count.
 */
export function getTasteLevel(visitCount: number): TasteLevel {
  let result = LEVELS[0];
  for (const level of LEVELS) {
    if (visitCount >= level.minVisits) result = level;
  }
  return result;
}

/**
 * Compute progress to next level (0.0 - 1.0).
 * Returns 1.0 if already at max level.
 */
export function getProgressToNextLevel(visitCount: number): number {
  const current = getTasteLevel(visitCount);
  const nextIdx = LEVELS.findIndex(l => l.level === current.level + 1);
  if (nextIdx === -1) return 1; // Max level
  const next = LEVELS[nextIdx];
  const range = next.minVisits - current.minVisits;
  const progress = visitCount - current.minVisits;
  return Math.min(1, progress / range);
}

/**
 * Get visits needed for next level.
 * Returns 0 if already at max.
 */
export function visitsToNextLevel(visitCount: number): number {
  const current = getTasteLevel(visitCount);
  const nextIdx = LEVELS.findIndex(l => l.level === current.level + 1);
  if (nextIdx === -1) return 0;
  return LEVELS[nextIdx].minVisits - visitCount;
}
