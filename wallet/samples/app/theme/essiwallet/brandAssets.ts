import type { DeepPartial, ITheme } from '@bifold/core'

const logoW = 120
const logoH = 120

const essiLogoMark = {
  src: require('../../../../packages/core/src/assets/img/logo.png') as number,
  width: logoW,
  height: logoH,
  aspectRatio: 1,
  resizeMode: 'contain' as const,
}

/** Logo splash / loading (`LoadingIndicator` → `logoSecondary`). */
export const essiWalletBrandThemeOverrides: DeepPartial<ITheme> = {
  Assets: {
    img: {
      logoPrimary: essiLogoMark as ITheme['Assets']['img']['logoPrimary'],
      logoSecondary: essiLogoMark as ITheme['Assets']['img']['logoSecondary'],
    },
  },
}
