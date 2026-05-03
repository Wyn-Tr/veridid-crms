import {
  ITheme,
  IBrandColors,
  IColorPalette,
  IGrayscaleColors,
  ISemanticColors,
  INotificationColors,
  ThemeBuilder,
  bifoldTheme,
  type DeepPartial,
} from '@bifold/core'

/** Minimal shape from each skin `colors.ts`. Extend here if new tokens are needed app-wide. */
export type WalletColorPalette = {
  background: string
  surface: string
  surfaceSecondary: string
  card: string
  primary: string
  accent: string
  success: string
  warning: string
  danger: string
  text: string
  muted: string
  outline: string
  buttonText?: string
}

function canvasLuminance(hex: string): number {
  const raw = hex.replace('#', '')
  const h = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (h.length < 6) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function buildGrayscale(palette: WalletColorPalette, lightCanvas: boolean): IGrayscaleColors {
  if (lightCanvas) {
    return {
      black: palette.text,
      darkGrey: palette.muted,
      mediumGrey: palette.surfaceSecondary,
      lightGrey: typeof palette.outline === 'string' ? palette.outline : '#D3D3D3',
      veryLightGrey: palette.background,
      white: palette.surface,
    }
  }
  return {
    black: '#000000',
    darkGrey: palette.surface,
    mediumGrey: palette.surfaceSecondary,
    lightGrey: palette.muted,
    veryLightGrey: palette.card,
    white: palette.text,
  }
}

/**
 * Maps a wallet palette + optional brand overrides into a full `ITheme`.
 * Reskin: edit `theme/<skin>/colors.ts` (and optional `brandAssets.ts`) only.
 */
export const buildThemeFromPalette = (
  palette: WalletColorPalette,
  themeName: string,
  brandOverrides?: DeepPartial<ITheme>
): ITheme => {
  const lightCanvas = canvasLuminance(palette.background) > 0.55
  const CustomGrayscaleColors = buildGrayscale(palette, lightCanvas)

  const CustomBrandColors: IBrandColors = {
    primary: palette.primary,
    primaryDisabled: palette.primary + '50',
    secondary: palette.surfaceSecondary,
    secondaryDisabled: palette.surfaceSecondary + '50',
    tertiary: palette.card,
    tertiaryDisabled: palette.card + '50',
    primaryLight: palette.primary + '30',
    highlight: palette.accent,
    primaryBackground: palette.background,
    secondaryBackground: palette.surface,
    tertiaryBackground: palette.surfaceSecondary,
    modalPrimary: palette.primary,
    modalSecondary: palette.text,
    modalTertiary: palette.text,
    modalPrimaryBackground: palette.background,
    modalSecondaryBackground: palette.surface,
    modalTertiaryBackground: palette.surfaceSecondary,
    modalIcon: palette.text,
    unorderedList: palette.text,
    unorderedListModal: palette.text,
    link: palette.primary,
    credentialLink: palette.primary,
    text: palette.text,
    icon: palette.text,
    headerIcon: palette.text,
    headerText: palette.text,
    buttonText: palette.buttonText ?? palette.text,
    tabBarInactive: palette.muted,
    inlineError: palette.danger,
    inlineWarning: palette.warning,
  }

  const CustomSemanticColors: ISemanticColors = {
    error: palette.danger,
    success: palette.success,
    focus: palette.primary,
  }

  const CustomNotificationColors: INotificationColors = {
    success: palette.surface,
    successBorder: palette.success,
    successIcon: palette.success,
    successText: palette.text,
    info: palette.surface,
    infoBorder: palette.primary,
    infoIcon: palette.primary,
    infoText: palette.text,
    warn: palette.surface,
    warnBorder: palette.warning,
    warnIcon: palette.warning,
    warnText: palette.text,
    error: palette.surface,
    errorBorder: palette.danger,
    errorIcon: palette.danger,
    errorText: palette.text,
    popupOverlay: palette.background + 'CC',
  }

  const colorPalette: IColorPalette = {
    brand: CustomBrandColors,
    semantic: CustomSemanticColors,
    notification: CustomNotificationColors,
    grayscale: CustomGrayscaleColors,
  }

  const builder = new ThemeBuilder(bifoldTheme)
    .setColorPalette(colorPalette)
    .withOverrides({
      themeName,
      Inputs: {
        textInput: lightCanvas
          ? {
              backgroundColor: palette.surface,
              borderColor: typeof palette.outline === 'string' ? palette.outline : palette.surfaceSecondary,
              color: palette.text,
            }
          : {
              // Dark canvas (ESSI): avoid Bifold’s default light fields on PIN / password (PINInput, TextInput).
              backgroundColor: palette.surfaceSecondary,
              borderColor: typeof palette.outline === 'string' ? palette.outline : palette.surface,
              color: palette.text,
            },
      },
    })

  if (brandOverrides) {
    builder.withOverrides(brandOverrides)
  }

  return builder.build()
}
