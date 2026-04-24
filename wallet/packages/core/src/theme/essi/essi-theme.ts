import type {
  ITheme,
  IBrandColors,
  IColorPalette,
  IGrayscaleColors,
  ISemanticColors,
  INotificationColors,
} from '../../theme'
import { ThemeBuilder } from '../../theme-builder'
import { bifoldTheme } from '../../theme'
import { palette, gradients, opacity } from './essi-colors'
import { typography } from './essi-typography'
import { spacing, radius } from './essi-spacing'

// Map ESSI colors to Bifold's color structure
const ESSIGrayscaleColors: IGrayscaleColors = {
  black: palette.background,
  darkGrey: palette.surface,
  mediumGrey: palette.surfaceSecondary,
  lightGrey: palette.card,
  veryLightGrey: palette.outline,
  white: palette.text,
}

const ESSIBrandColors: IBrandColors = {
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
  buttonText: palette.text,
  tabBarInactive: palette.muted,
  inlineError: palette.danger,
  inlineWarning: palette.warning,
}

const ESSISemanticColors: ISemanticColors = {
  error: palette.danger,
  success: palette.success,
  focus: palette.primary,
}

const ESSINotificationColors: INotificationColors = {
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

export const ESSIColorPalette: IColorPalette = {
  brand: ESSIBrandColors,
  semantic: ESSISemanticColors,
  notification: ESSINotificationColors,
  grayscale: ESSIGrayscaleColors,
}

/**
 * Complete ESSI Theme
 * Uses ThemeBuilder to create a full ITheme object with ESSI colors
 * This theme overrides all Bifold green colors with ESSI dark blue palette
 */
export const essiTheme: ITheme = new ThemeBuilder(bifoldTheme)
  .setColorPalette(ESSIColorPalette)
  .withOverrides({
    themeName: 'essi',
  })
  .build()

// Export ESSI-specific values for use in components
export { palette, gradients, opacity, typography, spacing, radius }
