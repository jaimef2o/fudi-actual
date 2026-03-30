/**
 * fudi Design System — Color Tokens
 * Single source of truth for all colors in the app.
 * Import from here instead of using hardcoded hex values.
 */
export const COLORS = {
  // Primary
  primary:                '#032417',
  primaryContainer:       '#1a3a2b',
  onPrimary:              '#ffffff',
  onPrimaryContainer:     '#82a491',

  // Secondary (Lima)
  secondary:              '#516600',
  secondaryContainer:     '#c7ef48',
  onSecondaryContainer:   '#546b00',

  // Surface hierarchy
  surface:                '#fdf9f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#f7f3ec',
  surfaceContainer:       '#f1ede6',
  surfaceContainerHigh:   '#ebe8e1',
  surfaceContainerHighest:'#e6e2db',
  surfaceDim:             '#dddad3',

  // On-surface
  onSurface:              '#1c1c18',
  onSurfaceVariant:       '#424844',

  // Outline
  outline:                '#727973',
  outlineVariant:         '#c1c8c2',

  // Tertiary
  tertiaryFixed:          '#caf24b',
  tertiaryFixedDim:       '#aed52e',
  secondaryFixedDim:      '#aed52e',

  // Error
  error:                  '#ba1a1a',

  // Inverse
  inverseSurface:         '#31302c',
  inverseOnSurface:       '#f4f0e9',

  // Semantic aliases
  background:             '#fdf9f2',
  cardBackground:         '#ffffff',
  chipBackground:         '#f7f3ec',
  inputBackground:        '#f7f3ec',
  divider:                'rgba(193,200,194,0.15)',

  // Transparency variants
  headerBg:               'rgba(253,249,242,0.94)',
  tabBarBg:               'rgba(253,249,242,0.92)',
  overlayDark:            'rgba(3,36,23,0.88)',
  overlayMedium:          'rgba(3,36,23,0.45)',
} as const;

export type ColorToken = keyof typeof COLORS;
