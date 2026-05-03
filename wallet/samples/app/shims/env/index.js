'use strict'
/**
 * Metro resolves the `@env` module name here before Babel runs.
 * `babel-plugin` react-native-dotenv removes `from '@env'` in app source and inlines values.
 */
module.exports = {
  WALLET_THEME: undefined,
}
