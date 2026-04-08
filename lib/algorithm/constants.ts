// ─── For You Feed Algorithm — Weights & Thresholds ───────────────────────────

export const WEIGHTS = {
  taste:    0.30,
  geo:      0.25,
  social:   0.15,
  engage:   0.10,
  quality:  0.10,
  recency:  0.10,
} as const;

/** Recency half-life in days: at 14 days a post retains 50% of its recency score */
export const RECENCY_HALF_LIFE_DAYS = 14;

/** Default score when no signal data is available */
export const NEUTRAL_SCORE = 0.3;

/** Max posts from the same author per page */
export const MAX_AUTHOR_PER_PAGE = 2;

/** Default page size for the For You feed */
export const FOR_YOU_PAGE_SIZE = 20;

/** Initial candidate window in days */
export const INITIAL_CANDIDATE_DAYS = 30;

/** Max candidate window expansion */
export const MAX_CANDIDATE_DAYS = 180;

/** Min candidates before expanding the window */
export const MIN_CANDIDATES = 50;
