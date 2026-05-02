import React, { useEffect, useState } from 'react'
import { StatusBar } from 'react-native'
import SplashScreen from 'react-native-splash-screen'
import Toast from 'react-native-toast-message'

import { useNavigationContainerRef } from '@react-navigation/native'
import { isTablet } from 'react-native-device-info'
import Orientation from 'react-native-orientation-locker'
import { animatedComponents } from './animated-components'
import ErrorModal from './components/modals/ErrorModal'
import toastConfig from './components/toast/ToastConfig'
import { tours } from './constants'
import { Container, ContainerProvider, useServices, TOKENS } from './container-api'
import { AnimatedComponentsProvider } from './contexts/animated-components'
import { AuthProvider } from './contexts/auth'
import NavContainer from './contexts/navigation'
import { NetworkProvider } from './contexts/network'
import { StoreProvider } from './contexts/store'
import { ThemeProvider, useTheme } from './contexts/theme'
import { getWalletThemeDevResolver, subscribeDevWalletThemeFromMetro } from './dev/wallet-theme-dev'
import { TourProvider } from './contexts/tour/tour-provider'
import { initStoredLanguage } from './localization'
import RootStack from './navigators/RootStack'
import { statusBarStyleForBackground } from './theme/essi/derive-visual-palette'
import ErrorBoundaryWrapper from './components/misc/ErrorBoundary'
import { bifoldLoggerInstance } from './services/bifoldLogger'

const AppThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [diTheme] = useServices([TOKENS.OBJECT_THEME])
  const [theme, setTheme] = useState(diTheme)

  useEffect(() => {
    setTheme(diTheme)
  }, [diTheme])

  useEffect(() => {
    const resolver = getWalletThemeDevResolver()
    if (!resolver) {
      return
    }
    return subscribeDevWalletThemeFromMetro((raw) => {
      try {
        const next = resolver(raw === '' ? undefined : raw)
        setTheme((prev) => {
          const sameSkin =
            prev.themeName === next.themeName &&
            prev.ColorPalette.brand.primaryBackground === next.ColorPalette.brand.primaryBackground
          return sameSkin ? prev : next
        })
      } catch {
        // invalid env value
      }
    })
  }, [])

  return (
    <ThemeProvider themes={[theme]} defaultThemeName={theme.themeName}>
      {children}
    </ThemeProvider>
  )
}

const AppStatusBar: React.FC = () => {
  const theme = useTheme()
  const bg = theme.ColorPalette.brand.primaryBackground
  return (
    <StatusBar
      hidden={false}
      barStyle={statusBarStyleForBackground(bg)}
      backgroundColor={bg}
      translucent={false}
    />
  )
}

const createApp = (container: Container): React.FC => {
  const AppComponent: React.FC = () => {
    const navigationRef = useNavigationContainerRef()

    useEffect(() => {
      initStoredLanguage().then()
    }, [])

    useEffect(() => {
      // Hide the native splash / loading screen so that our
      // RN version can be displayed.
      SplashScreen.hide()
    }, [])

    if (!isTablet()) {
      Orientation.lockToPortrait()
    }

    return (
      <ErrorBoundaryWrapper logger={bifoldLoggerInstance}>
        <ContainerProvider value={container}>
          <StoreProvider>
            <AppThemeProvider>
              <NavContainer navigationRef={navigationRef}>
                <AnimatedComponentsProvider value={animatedComponents}>
                  <AuthProvider>
                    <NetworkProvider>
                      <AppStatusBar />
                      <ErrorModal />
                      <TourProvider tours={tours} overlayColor={'gray'} overlayOpacity={0.7}>
                        <RootStack />
                      </TourProvider>
                      <Toast topOffset={15} config={toastConfig} />
                    </NetworkProvider>
                  </AuthProvider>
                </AnimatedComponentsProvider>
              </NavContainer>
            </AppThemeProvider>
          </StoreProvider>
        </ContainerProvider>
      </ErrorBoundaryWrapper>
    )
  }

  return AppComponent
}

export default createApp
