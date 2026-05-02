import { useMemo } from 'react'

import { useTheme } from '../../contexts/theme'
import { deriveWalletVisualPalette, type WalletVisualPalette } from './derive-visual-palette'

/** Runtime flat colors for ESSI UI; follows active wallet skin (`OBJECT_THEME`). */
export function useWalletVisualPalette(): WalletVisualPalette {
  const theme = useTheme()
  return useMemo(() => deriveWalletVisualPalette(theme), [theme])
}
