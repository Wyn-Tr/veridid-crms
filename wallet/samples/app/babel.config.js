const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env')

/**
 * When only `.env` changes, Metro may not invalidate transforms for files that import `@env`.
 * Tie Babel's config cache to `.env` contents so `WALLET_THEME` is re-inlined on the next bundle.
 */
module.exports = function (api) {
  api.cache.using(() => {
    try {
      const buf = fs.readFileSync(envPath)
      return crypto.createHash('sha1').update(buf).digest('hex')
    } catch {
      return 'missing-env'
    }
  })

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: envPath,
          allowlist: ['WALLET_THEME', 'APP_DISPLAY_NAME'],
          allowUndefined: true,
        },
      ],
      '@babel/plugin-transform-export-namespace-from',
    ],
  }
}
