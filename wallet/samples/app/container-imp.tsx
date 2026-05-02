import { BifoldLogger, Container, TokenMapping, TOKENS, setWalletThemeDevResolver } from '@bifold/core'
import { DependencyContainer } from 'tsyringe'
import { Screens } from '../../packages/core/src/types/navigators'
import ESSITabStack from '../../packages/core/src/navigators/ESSITabStack'
import ESSIPINCreate from '../../packages/core/src/screens/essi/ESSIPINCreate'
import ESSIPINEnter from '../../packages/core/src/screens/essi/ESSIPINEnter'
import ESSIOnboarding from '../../packages/core/src/screens/essi/ESSIOnboarding'
import ESSIOnboardingPages from '../../packages/core/src/screens/essi/ESSIOnboardingPages'
import ESSITerms from '../../packages/core/src/screens/essi/ESSITerms'
import ESSIBiometry from '../../packages/core/src/screens/essi/ESSIBiometry'
import ESSIChat from '../../packages/core/src/screens/essi/ESSIChat'
import ESSICredentialOfferAccept from '../../packages/core/src/screens/essi/ESSICredentialOfferAccept'
import { WALLET_THEME as WALLET_THEME_FROM_ENV } from '@env'
import Config from 'react-native-config'
import { resolveWalletTheme, sanitizeWalletThemeEnv } from './theme'

/** Prefer Metro-inlined `.env` so `WALLET_THEME` updates without a native rebuild; else react-native-config. */
function pickWalletThemeRaw(): string | undefined {
  const bundled = sanitizeWalletThemeEnv(WALLET_THEME_FROM_ENV)
  if (bundled !== '' && bundled !== 'undefined') {
    return bundled
  }
  const native = sanitizeWalletThemeEnv(Config.WALLET_THEME as string | undefined)
  if (native !== '' && native !== 'undefined') {
    return Config.WALLET_THEME as string | undefined
  }
  return undefined
}

export class AppContainer implements Container {
  private _container: DependencyContainer
  private log?: BifoldLogger

  public constructor(bifoldContainer: Container, log?: BifoldLogger) {
    this._container = bifoldContainer.container.createChildContainer()
    this.log = log
  }

  public get container(): DependencyContainer {
    return this._container
  }

  public init(): Container {
    // eslint-disable-next-line no-console
    this.log?.info(`Initializing App container`)

    // Register ESSI UI components
    this.container.registerInstance(TOKENS.NAV_TAB_STACK, ESSITabStack)
    this.container.registerInstance(TOKENS.SCREEN_PIN_CREATE, ESSIPINCreate)
    this.container.registerInstance(TOKENS.SCREEN_PIN_ENTER, ESSIPINEnter)
    this.container.registerInstance(TOKENS.SCREEN_ONBOARDING, ESSIOnboarding)
    this.container.registerInstance(TOKENS.SCREEN_ONBOARDING_PAGES, ESSIOnboardingPages)
    this.container.registerInstance(TOKENS.SCREEN_TERMS, { screen: ESSITerms, version: '1' })
    this.container.registerInstance(TOKENS.SCREEN_BIOMETRY, ESSIBiometry)
    this.container.registerInstance(TOKENS.SCREEN_CHAT, ESSIChat)
    this.container.registerInstance(TOKENS.COMPONENT_CREDENTIAL_OFFER_ACCEPT, ESSICredentialOfferAccept)
    const rawTheme = pickWalletThemeRaw()
    const envTheme = sanitizeWalletThemeEnv(rawTheme)
    const walletTheme = resolveWalletTheme(envTheme === '' ? undefined : envTheme)
    this.log?.info(
      `WALLET_THEME bundled="${String(WALLET_THEME_FROM_ENV ?? '')}" native="${String(Config.WALLET_THEME ?? '')}" → sanitized="${envTheme}" themeName=${walletTheme.themeName}`
    )
    this.container.registerInstance(TOKENS.OBJECT_THEME, walletTheme)

    setWalletThemeDevResolver((raw: string | undefined) => {
      const id = sanitizeWalletThemeEnv(raw)
      return resolveWalletTheme(id === '' ? undefined : id)
    })

    const defaultConfig = this.container.resolve(TOKENS.CONFIG)
    const useWebrtcTunnel = String(Config.USE_WEBRTC_TUNNEL).toLowerCase() === 'true'
    const iceServersUrl =
      (useWebrtcTunnel && Config.WEBRTC_ICE_URL_TUNNEL) ||
      Config.WEBRTC_ICE_URL ||
      'https://api.essi.studio/api/webrtc/turn'
    this.log?.info(`Using WEBRTC_ICE_URL: ${iceServersUrl}`)
    this.container.registerInstance(TOKENS.CONFIG, {
      ...defaultConfig,
      webrtc: {
        ...defaultConfig.webrtc,
        iceServersUrl,
      },
    })

    // Override screen options to hide headers for ESSI screens
    const DefaultScreenOptionsDictionary = this.container.resolve(TOKENS.OBJECT_SCREEN_CONFIG)
    this.container.registerInstance(TOKENS.OBJECT_SCREEN_CONFIG, {
      ...DefaultScreenOptionsDictionary,
      [Screens.Onboarding]: {
        headerShown: false,
      },
      [Screens.Terms]: {
        headerShown: false,
      },
      [Screens.CreatePIN]: {
        headerShown: false,
      },
      [Screens.EnterPIN]: {
        headerShown: false,
      },
      [Screens.Biometry]: {
        headerShown: false,
      },
    })

    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
    // this.container.registerInstance(TOKENS.COMP_BUTTON, Button)

    //This is an example of how to customize the screen layout and use custom header for wallets who wnat to hide default navigation header
    //To hide navigation header for a specific page, use headerShown: false in the screen options like this
    /**
    this.container.registerInstance(TOKENS.OBJECT_SCREEN_CONFIG, {
      ...DefaultScreenOptionsDictionary,
      [Screens.Terms]: {
        ...DefaultScreenOptionsDictionary[Screens.Terms],
        headerShown: false,
      },
    })

    //Customizing Terms screen custom header
    this.container.registerInstance(TOKENS.OBJECT_LAYOUT_CONFIG, {
      ...DefaultScreenLayoutOptions,
      [Screens.Terms]: {
        ...DefaultScreenLayoutOptions[Screens.Terms],
        customEdges: ['bottom'],
        safeArea: true,
        Header: () => (
          <View style={{ backgroundColor: 'red', height: 129, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white' }}>Custom Header</Text>
          </View>
        ),
      },
    })
      */
    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this._container.resolve(token)
  }
  public resolveAll<K extends keyof TokenMapping, T extends K[]>(
    tokens: [...T]
  ): { [I in keyof T]: TokenMapping[T[I]] } {
    return tokens.map((key) => this.resolve(key)!) as { [I in keyof T]: TokenMapping[T[I]] }
  }
}
