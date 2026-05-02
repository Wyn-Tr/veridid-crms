import type { DeepPartial, ITheme } from '@bifold/core'
import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'

import VerididLogoSvg from './assets/veridid-logo.svg'
import { verididTokens } from './colors'

const logoW = 120
const logoH = Math.round((logoW * 175) / 188)

const verididLogoMark = {
  SvgComponent: VerididLogoSvg as FC<SvgProps>,
  width: logoW,
  height: logoH,
  aspectRatio: 188 / 175,
  resizeMode: 'contain' as const,
}

const pin = verididTokens.inputs.passwordField
const brand = verididTokens.primary

/**
 * VeriDID-only overrides (does not affect essiwallet):
 * - PIN / password: gray cells, pink border on focus
 * - TextInput: gray fill + brand-colored border
 */
export const verididBrandThemeOverrides: DeepPartial<ITheme> = {
  Assets: {
    img: {
      logoPrimary: verididLogoMark as ITheme['Assets']['img']['logoPrimary'],
      logoSecondary: verididLogoMark as ITheme['Assets']['img']['logoSecondary'],
    },
  },
  Inputs: {
    textInput: {
      backgroundColor: pin.background,
      borderColor: brand.background,
      borderWidth: 2,
      color: pin.text,
    },
  },
  PINInputTheme: {
    cell: {
      backgroundColor: pin.background,
      borderColor: pin.background,
      borderWidth: 1,
    },
    focussedCell: {
      borderColor: brand.background,
    },
    labelAndFieldContainer: {
      backgroundColor: pin.background,
      borderColor: brand.background,
      borderWidth: 2,
    },
    cellText: { color: pin.text },
    icon: { color: brand.background },
  },
  SeparatedPINInputTheme: {
    cell: {
      backgroundColor: pin.background,
      borderColor: pin.border,
      borderWidth: 1,
    },
    focussedCell: {
      borderColor: brand.background,
    },
    cellText: { color: pin.text },
    icon: { color: brand.background },
  },
}
