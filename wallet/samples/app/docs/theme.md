# Wallet theme & reskin guide

Two skins: **ESSI** (`essiwallet` → `theme/essiwallet/`) and **VeriDID** (`veridid` → `theme/veridid/`). Pick one with `WALLET_THEME` in `.env`, then **clean rebuild** native.

### Multi-theme rule (same variables, different values)

- One pipeline: **`WALLET_THEME`** → **`resolveWalletTheme()`** → **`TOKENS.OBJECT_THEME`** → **`ThemeProvider`** → **`ITheme`**.
- Wallet UI must read colors via **`useWalletVisualPalette()`** (flat: `background`, `primary`, `text`, …) or **`useTheme().ColorPalette`**. **Do not** import `palette` from `@bifold/core` `theme/essi/essi-colors` in screens/components — that always shows the dark ESSI reference and breaks onboarding vs post-login mismatch.
- **`WALLET_THEME` is read two ways:** (1) **`@env` (Babel / `react-native-dotenv`)** — inlined when Metro bundles `container-imp.tsx`; changing `.env` updates the bundle once Metro recompiles. (2) **`Config.WALLET_THEME` (`react-native-config`)** — baked into the native binary; only used when `@env` has no usable value. If you rely on native `Config` only, change `.env` then **clean rebuild** Android/iOS or the skin stays stale.

### After editing `.env` in dev

- **Live switch (this sample app):** Metro serves `GET /wallet-theme-dev.json` from disk `.env` (`metro.config.js`). When the JS bundle was loaded from Metro (or you set `globalThis.__BIFOLD_WALLET_DEV_PACKAGER_ORIGIN__`), the app polls ~every 1.2s and reapplies the skin via `ThemeProvider`. **Store / offline bundles** have no packager URL → no polling, no extra cost.
- **Physical device:** Packager host comes from RN’s `getDevServer()` (same as HMR). If polling never updates, set **`globalThis.__BIFOLD_WALLET_DEV_PACKAGER_ORIGIN__ = 'http://YOUR_LAN_IP:8081'`** once at startup (e.g. in `index.js` before `AppRegistry`) so fetches hit the machine running Metro.
- **Hot-switch reads disk:** Metro’s `/wallet-theme-dev.json` uses the **last** non-comment `WALLET_THEME=…` line in `.env` (same idea as dotenv). Lines starting with `#` are ignored — only real assignments count. **Save the file** after editing; unsaved buffer ≠ what Metro reads.
- **Without Metro / release builds:** Theme comes from the bundled `@env` value and/or native `Config` at startup — use a **full JS reload** or **clean rebuild** as needed (see above).

## What lives where

| Area | Path | Role |
|------|------|------|
| Theme resolution | `theme/resolveWalletTheme.ts` | Normalizes `WALLET_THEME` → palette + brand → `buildThemeFromPalette()` |
| Palette ESSI | `theme/essiwallet/colors.ts` | Dark canvas — change only when intentionally reskinning ESSI |
| Brand ESSI | `theme/essiwallet/brandAssets.ts` | Logo: `packages/core/.../logo.png` |
| Palette VeriDID | `theme/veridid/colors.ts` | Light canvas (#F8F8F8), primary #F323C6, text #1B1B1B, … (First Run / Channel Actions mocks) |
| Brand VeriDID | `theme/veridid/brandAssets.ts` | `theme/veridid/assets/veridid-logo.svg` → `logoPrimary` / `logoSecondary` |
| Theme builder | `theme/factory.ts` | Palette → `ITheme` (`Inputs.textInput` follows canvas luminance) |
| DI | `container-imp.tsx` | `TOKENS.OBJECT_THEME` = `resolveWalletTheme(...)` from `@env` first, else `Config.WALLET_THEME` |
| Flat colors for wallet UI | `@bifold/core` `derive-visual-palette.ts` + `useWalletVisualPalette()` | **All** custom screens/components should use this hook (same keys for every skin) |

## Environment: `WALLET_THEME`

- In **`wallet/samples/app/.env`** (react-native-config).
- **`essiwallet`** or **`essi`** → ESSI skin.
- **`veridid`** or **`verididwallet`** → VeriDID skin.
- Any other value → **essiwallet**.
- After **changing `.env` → clean rebuild** iOS/Android.

## Runtime theme selection

`ThemeProvider` (`contexts/theme.tsx`): when **`themes.length === 1`**, always use the injected theme — avoids stale `preferences.theme` stuck on `bifold`.

## UI credentials (empty state)

`ESSICredentials.tsx`: CTAs follow DI palette (`useWalletVisualPalette` / `isLightVisualCanvas`).

---

## Reskin checklist (third skin)

1. `theme/<skinId>/colors.ts` + `brandAssets.ts` + `index.ts`.
2. `resolveWalletTheme.ts`: extend `WALLET_THEME_IDS`, `PALETTES`, `BRAND_THEME_OVERRIDES`, `normalizeThemeId`.
3. `.env` + clean build.

## Quick reference

- `theme/resolveWalletTheme.ts`, `theme/index.ts`, `theme/factory.ts`, `theme/essiwallet/*`, `theme/veridid/*`
- `container-imp.tsx`
- `packages/core/src/contexts/theme.tsx`

## Summary

`WALLET_THEME` → **`resolveWalletTheme`** → `TOKENS.OBJECT_THEME` → Bifold + screens using **`useWalletVisualPalette()`** for the selected palette.
