import type { ITheme } from '../theme'

export type WalletThemeDevResolver = (raw: string | undefined) => ITheme

let devResolver: WalletThemeDevResolver | undefined

/** Wallet app registers this so `WALLET_THEME` can hot-switch via Metro `/wallet-theme-dev.json` when a packager is reachable. */
export function setWalletThemeDevResolver(fn: WalletThemeDevResolver | undefined): void {
  devResolver = fn
}

export function getWalletThemeDevResolver(): WalletThemeDevResolver | undefined {
  return devResolver
}

/**
 * Same packager base URL React Native uses for HMR (reads `NativeSourceCode`, not legacy `NativeModules.SourceCode`).
 * On physical devices the latter can be unset while the bundle URL is still correct.
 */
function getDevServerFromRN(): { url: string; bundleLoadedFromServer: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native/Libraries/Core/Devtools/getDevServer')() as {
    url: string
    bundleLoadedFromServer: boolean
  }
}

/**
 * Manual override when Metro host cannot be inferred (USB / VPN / odd `scriptURL`).
 * Set on `globalThis` before app mounts, e.g. `globalThis.__BIFOLD_WALLET_DEV_PACKAGER_ORIGIN__ = 'http://192.168.1.20:8081'`.
 */
const GLOBAL_PACKAGER_KEY = '__BIFOLD_WALLET_DEV_PACKAGER_ORIGIN__'

/** Packager origin without trailing slash, or `null` if the bundle was not loaded from Metro (e.g. store release). */
export function getDevPackagerOrigin(): string | null {
  const g = globalThis as Record<string, unknown>
  const manual = g[GLOBAL_PACKAGER_KEY]
  if (typeof manual === 'string') {
    const t = manual.trim().replace(/\/+$/, '')
    if (t.startsWith('http://') || t.startsWith('https://')) {
      return t
    }
  }

  try {
    const { url, bundleLoadedFromServer } = getDevServerFromRN()
    if (!bundleLoadedFromServer) {
      return null
    }
    const trimmed = url.replace(/\/+$/, '')
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

/**
 * Poll Metro for current `WALLET_THEME` from disk `.env` (see sample `metro.config.js`).
 * No-ops when there is no packager URL or no resolver registered (typical production / offline bundle).
 */
export function subscribeDevWalletThemeFromMetro(onRaw: (raw: string) => void): () => void {
  const origin = getDevPackagerOrigin()
  if (!origin || !getWalletThemeDevResolver()) {
    return () => {}
  }

  let last = ''
  const tick = async () => {
    try {
      const res = await fetch(`${origin}/wallet-theme-dev.json?ts=${Date.now()}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        return
      }
      const j = (await res.json()) as { WALLET_THEME?: string }
      const raw = String(j?.WALLET_THEME ?? '').trim()
      if (raw !== last) {
        last = raw
        onRaw(raw)
      }
    } catch {
      // packager stopped or unreachable
    }
  }

  void tick()
  const id = setInterval(() => void tick(), 1200)
  return () => clearInterval(id)
}
