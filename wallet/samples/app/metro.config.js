/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line import/no-extraneous-dependencies
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const escape = require('escape-string-regexp')
const exclusionList = require('metro-config/src/defaults/exclusionList')
const fs = require('fs')
const path = require('path')

const dotEnvPath = path.join(__dirname, '.env')

/**
 * Last non-comment `WALLET_THEME=` wins (dotenv-style). Skips `# ...` lines so a doc line like
 * `# WALLET_THEME: essi | veridid` is never mistaken for an assignment.
 */
function readWalletThemeFromDotEnvFile() {
  try {
    const text = fs.readFileSync(dotEnvPath, 'utf8')
    let value = ''
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue
      }
      const m = trimmed.match(/^WALLET_THEME\s*=\s*(.*)$/)
      if (!m) {
        continue
      }
      let v = m[1].trim()
      const inlineComment = v.search(/\s+#/)
      if (inlineComment >= 0) {
        v = v.slice(0, inlineComment).trim()
      }
      v = v.replace(/^["']|["']$/g, '').trim()
      value = v
    }
    return value
  } catch {
    return ''
  }
}

const packageDirs = [
  path.resolve(__dirname, '../../packages/core'),
  path.resolve(__dirname, '../../packages/oca'),
  path.resolve(__dirname, '../../packages/verifier'),
]

const watchFolders = [...packageDirs]

const extraExclusionlist = [
  // Block @ajna-inc/payments from being bundled - it has Node.js dependencies (ethers, ws)
  // that don't work with React Native/Metro bundler
  path.join(__dirname, 'node_modules/@ajna-inc/payments'),
]
const extraNodeModules = {}

for (const packageDir of packageDirs) {
  const pak = require(path.join(packageDir, 'package.json'))
  const modules = Object.keys({
    ...pak.peerDependencies,
    ...pak.devDependencies,
  })
  extraExclusionlist.push(...modules.map((m) => path.join(packageDir, 'node_modules', m)))

  modules.reduce((acc, name) => {
    acc[name] = path.join(__dirname, 'node_modules', name)
    return acc
  }, extraNodeModules)
}

// Virtual `@env` from react-native-dotenv: Metro must resolve a real path; Babel then strips imports.
extraNodeModules['@env'] = path.resolve(__dirname, 'shims/env')

const {
  resolver: { sourceExts, assetExts },
} = getDefaultConfig()

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    blacklistRE: exclusionList(extraExclusionlist.map((m) => new RegExp(`^${escape(m)}\\/.*$`))),
    extraNodeModules: extraNodeModules,
    tslib: path.join(__dirname, 'node_modules/tslib'),
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg', 'cjs'],
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'browser', 'import', 'require'],
  },
  watchFolders,
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (pathname === '/wallet-theme-dev.json') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          })
          res.end(JSON.stringify({ WALLET_THEME: readWalletThemeFromDotEnvFile() }))
          return
        }
        return middleware(req, res, next)
      }
    },
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
