/**
 * Sentiment color system — consistent across the whole app.
 *
 * Three levels, semantically clear:
 *   loved    → Lima verde  (#c7ef48 / #aed52e)   — the app's signature accent
 *   fine     → Ámbar       (#fde68a / #d97706)   — neutral, warm
 *   disliked → Rojo suave  (#fecaca / #ef4444)   — clear negative signal
 *   unknown  → Gris neutro (#f1ede6 / #c1c8c2)   — no sentiment data
 */

export type Sentiment = 'loved' | 'fine' | 'disliked' | null | undefined;

export interface SentimentPalette {
  /** Badge / pill background */
  badgeBg: string;
  /** Badge / pill text */
  badgeText: string;
  /** SVG ring / progress stroke */
  ring: string;
  /** Very light tint for card backgrounds */
  tint: string;
}

export const SENTIMENT_COLORS: Record<'loved' | 'fine' | 'disliked' | 'unknown', SentimentPalette> = {
  loved: {
    badgeBg:   '#c7ef48',
    badgeText: '#546b00',
    ring:      '#aed52e',
    tint:      '#f5fcd0',
  },
  fine: {
    badgeBg:   '#fde68a',
    badgeText: '#92400e',
    ring:      '#d97706',
    tint:      '#fffbeb',
  },
  disliked: {
    badgeBg:   '#fecaca',
    badgeText: '#ba1a1a',
    ring:      '#ef4444',
    tint:      '#fff1f2',
  },
  unknown: {
    badgeBg:   '#f1ede6',
    badgeText: '#727973',
    ring:      '#c1c8c2',
    tint:      '#f7f3ec',
  },
};

/** Resolve a nullable sentiment string to its palette. */
export function sentimentPalette(sentiment: Sentiment): SentimentPalette {
  if (sentiment === 'loved')    return SENTIMENT_COLORS.loved;
  if (sentiment === 'fine')     return SENTIMENT_COLORS.fine;
  if (sentiment === 'disliked') return SENTIMENT_COLORS.disliked;
  return SENTIMENT_COLORS.unknown;
}

/**
 * Resolve a numeric score (0–10) to its palette using the canonical bracket ranges.
 * Used for aggregated scores (Descubrir, restaurant page) where there is no single sentiment.
 *   ≥ 7.5 → loved (lima)
 *   ≥ 5.0 → fine (ámbar)
 *   < 5.0 → disliked (rojo)
 *   null/0 → unknown (gris)
 */
export function scorePalette(score: number | null | undefined): SentimentPalette {
  if (score == null || score === 0) return SENTIMENT_COLORS.unknown;
  if (score >= 7.5) return SENTIMENT_COLORS.loved;
  if (score >= 5.0) return SENTIMENT_COLORS.fine;
  return SENTIMENT_COLORS.disliked;
}
