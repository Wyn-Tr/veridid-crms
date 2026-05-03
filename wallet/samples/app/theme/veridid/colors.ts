import type { WalletColorPalette } from '../factory'

/**
 * VeriDID theme surfaces share the same keys: background, text, border
 * (keeps tokens consistent instead of mixing outline/muted naming).
 */
export type VeriDIDSurface = {
  background: string
  text: string
  border: string
}

/**
 * VeriDID light skin. Design-ref tokens (canvas #F8F8F8, primary #F323C6, ...).
 * `settings` uses the same shape as `surfaceSecondary` (list / section chrome like Settings).
 */
export const verididTokens = {
  canvas: {
    background: '#F8F8F8',
    text: '#1B1B1B',
    border: 'rgba(27,27,27,0.12)',
  },
  surface: {
    background: '#FFFFFF',
    text: '#1B1B1B',
    border: 'rgba(27,27,27,0.12)',
  },
  /** PIN cells, text fields, keypad; distinct from canvas (#F8F8F8) */
  surfaceSecondary: {
    background: '#E8E8E8',
    text: '#1B1B1B',
    border: 'rgba(27,27,27,0.12)',
  },
  card: {
    background: '#FFFFFF',
    text: '#1B1B1B',
    border: 'rgba(27,27,27,0.12)',
  },
  settings: {
    background: '#F0F0F0',
    text: '#1B1B1B',
    border: 'rgba(27,27,27,0.12)',
  },
  primary: {
    background: '#F323C6',
    /** Label on filled primary (buttons, chips on pink) */
    text: '#FFFFFF',
    border: '#F323C6',
  },
  accent: {
    background: '#31C63F',
    text: '#1B1B1B',
    border: '#31C63F',
  },
  success: {
    background: '#31C63F',
    text: '#1B1B1B',
    border: '#31C63F',
  },
  warning: {
    background: '#FFA41D',
    text: '#1B1B1B',
    border: '#FFA41D',
  },
  danger: {
    background: '#E53935',
    text: '#FFFFFF',
    border: '#E53935',
  },
  muted: {
    background: 'transparent',
    text: '#6B6B6B',
    border: 'transparent',
  },
  inputs: {
    passwordField: {
      background: '#E8E8E8',
      text: '#1B1B1B',
      /** Subtle idle border; focused pink uses `primary.background` in brandAssets */
      border: 'rgba(27,27,27,0.12)',
    },
  },
} as const

/** PIN / password field tokens: gray fill, text aligned with canvas */
export const verididInputPasswordTokens = verididTokens.inputs.passwordField

/**
 * Flat map for `buildThemeFromPalette`. Keeps public keys (`outline`, etc.) stable for essiwallet / factory.
 */
export const palette: WalletColorPalette = {
  background: verididTokens.canvas.background,
  surface: verididTokens.surface.background,
  surfaceSecondary: verididTokens.surfaceSecondary.background,
  card: verididTokens.card.background,
  primary: verididTokens.primary.background,
  accent: verididTokens.accent.background,
  success: verididTokens.success.background,
  warning: verididTokens.warning.background,
  danger: verididTokens.danger.background,
  text: verididTokens.canvas.text,
  muted: verididTokens.muted.text,
  outline: verididTokens.canvas.border,
  buttonText: verididTokens.primary.text,
}
