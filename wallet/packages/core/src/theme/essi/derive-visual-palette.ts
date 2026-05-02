import type { ITheme } from '../../theme'

/**
 * Flat runtime palette: **always** derived from the active `ITheme` (`TOKENS.OBJECT_THEME` / `resolveWalletTheme`).
 * Token names stay the same for every skin (background, primary, text, ...); only values change (ESSI vs VeriDID).
 * Do **not** import `palette` from `essi-colors.ts` in UI; that bypasses multi-theme and pins the dark ESSI look.
 */
export type WalletVisualPalette = {
  background: string
  surface: string
  surfaceSecondary: string
  card: string
  primary: string
  primaryDark: string
  accent: string
  success: string
  warning: string
  danger: string
  text: string
  muted: string
  outline: string
  buttonText: string
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const h = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (h.length < 6) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export function isLightVisualCanvas(backgroundHex: string): boolean {
  return luminance(backgroundHex) > 0.55
}

export function statusBarStyleForBackground(backgroundHex: string): 'light-content' | 'dark-content' {
  return isLightVisualCanvas(backgroundHex) ? 'dark-content' : 'light-content'
}

export function deriveWalletVisualPalette(theme: ITheme): WalletVisualPalette {
  const b = theme.ColorPalette.brand
  const s = theme.ColorPalette.semantic
  const n = theme.ColorPalette.notification
  return {
    background: b.primaryBackground,
    surface: b.secondaryBackground,
    surfaceSecondary: b.tertiaryBackground,
    card: b.tertiary,
    primary: b.primary,
    primaryDark: b.primary,
    accent: b.highlight,
    success: s.success,
    warning: n.warnIcon,
    danger: s.error,
    text: b.text,
    muted: b.tabBarInactive,
    outline: b.secondaryDisabled,
    buttonText: b.buttonText,
  }
}
