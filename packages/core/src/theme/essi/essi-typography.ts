import { TextStyle } from 'react-native'

export const fontFamilies = {
  display: 'System',
  base: 'System',
} as const

export const typography: Record<
  'hero' | 'title' | 'headline' | 'body' | 'bodyBold' | 'caption' | 'overline' | 'h1' | 'h2',
  TextStyle
> = {
  hero: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
  },
  h1: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  h2: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '600',
  },
  headline: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
  },
  body: {
    fontFamily: fontFamilies.base,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyBold: {
    fontFamily: fontFamilies.base,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontFamily: fontFamilies.base,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  overline: {
    fontFamily: fontFamilies.base,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}

export type TextVariant = keyof typeof typography
