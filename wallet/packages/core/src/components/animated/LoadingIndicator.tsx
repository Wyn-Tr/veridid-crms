import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Image } from 'react-native'

import { useTheme } from '../../contexts/theme'
import { testIdWithKey } from '../../utils/testable'

type LogoImg = {
  src?: number
  width: number
  height: number
  SvgComponent?: React.ComponentType<{ width?: number; height?: number }>
}

const timing: Animated.TimingAnimationConfig = {
  toValue: 1,
  duration: 2000,
  useNativeDriver: true,
}

const LoadingIndicator: React.FC = () => {
  const { ColorPalette, Assets } = useTheme()
  const logo = Assets.img.logoSecondary as LogoImg
  const SvgLogo = logo.SvgComponent
  const rotationAnim = useRef(new Animated.Value(0))
  const rotation = rotationAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  /** Keep mark inside the activity ring so the circular loader does not visually cut the logo. */
  const ringSize = 168
  const maxLogoSide = 82
  const logoScale = Math.min(1, maxLogoSide / Math.max(logo.width, logo.height))
  const logoW = logo.width * logoScale
  const logoH = logo.height * logoScale

  const style = StyleSheet.create({
    root: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: ringSize,
      minHeight: ringSize,
    },
    animation: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 0,
    },
    logoWrap: {
      zIndex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })
  const imageDisplayOptions = {
    fill: ColorPalette.notification.infoText,
    height: ringSize,
    width: ringSize,
  }

  useEffect(() => {
    Animated.loop(Animated.timing(rotationAnim.current, timing)).start()
  }, [])

  return (
    <View style={style.root} testID={testIdWithKey('LoadingActivityIndicator')}>
      <Animated.View style={[style.animation, { transform: [{ rotate: rotation }] }]}>
        <Assets.svg.activityIndicator {...imageDisplayOptions} />
      </Animated.View>
      {SvgLogo ? (
        <View style={style.logoWrap} testID={testIdWithKey('LoadingActivityIndicatorImage')}>
          <SvgLogo width={logoW} height={logoH} />
        </View>
      ) : logo.src != null ? (
        <View style={style.logoWrap}>
          <Image
            source={logo.src}
            style={{ width: logoW, height: logoH, resizeMode: 'contain' }}
            testID={testIdWithKey('LoadingActivityIndicatorImage')}
          />
        </View>
      ) : null}
    </View>
  )
}

export default LoadingIndicator
