import type { DeepPartial, ITheme } from '@bifold/core'

import { buildThemeFromPalette, type WalletColorPalette } from './factory'
import { essiWalletBrandThemeOverrides, palette as essiWalletPalette } from './essiwallet'
import { verididBrandThemeOverrides, palette as verididPalette } from './veridid'

/**
 * Two skins: **essiwallet** (`theme/essiwallet/`) and **veridid** (`theme/veridid/`).
 *
 * Set `WALLET_THEME` in `.env` (react-native-config), then **clean rebuild** native.
 *
 * - **essiwallet** (+ alias `essi`)
 * - **veridid** (+ alias `verididwallet`)
 * Any other value falls back to **essiwallet**.
 */
export const WALLET_THEME_IDS = ['essiwallet', 'veridid'] as const
export type WalletThemeId = (typeof WALLET_THEME_IDS)[number]

const PALETTES: Record<WalletThemeId, WalletColorPalette> = {
  essiwallet: essiWalletPalette,
  veridid: verididPalette,
}

const BRAND_THEME_OVERRIDES: Record<WalletThemeId, DeepPartial<ITheme>> = {
  essiwallet: essiWalletBrandThemeOverrides,
  veridid: verididBrandThemeOverrides,
}

export function sanitizeWalletThemeEnv(themeId: string | undefined): string {
  if (themeId == null) return ''
  let s = String(themeId).trim()
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim()
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function normalizeThemeId(themeId: string | undefined): WalletThemeId {
  const raw = sanitizeWalletThemeEnv(themeId)
  if (!raw || raw === 'undefined') {
    return 'essiwallet'
  }
  const key = raw.toLowerCase().replace(/\s+/g, '')

  if (key === 'essiwallet' || key === 'essi') {
    return 'essiwallet'
  }
  if (key === 'veridid' || key === 'verididwallet') {
    return 'veridid'
  }

  return 'essiwallet'
}

export function resolveWalletTheme(themeId: string | undefined): ITheme {
  const id = normalizeThemeId(themeId)
  return buildThemeFromPalette(PALETTES[id], id, BRAND_THEME_OVERRIDES[id])
}
