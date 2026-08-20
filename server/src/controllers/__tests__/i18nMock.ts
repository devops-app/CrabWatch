/**
 * Shared i18n mock factory for controller unit tests.
 *
 * The real `createTranslator` resolves keys via i18next `getFixedT`, but the
 * server i18n instance is never initialized in unit tests. This factory builds
 * a translator that resolves keys directly from the English locale JSON,
 * supporting both conventions used across the controllers:
 *   - `__('notFound', 'species')`            -> species.notFound
 *   - `__('species.notFound', 'species')`    -> species.notFound
 *   - `__('login.invalidCredentials', 'auth')` -> auth.login.invalidCredentials
 *
 * Lives in `__tests__` so it is excluded from the production build.
 */
import en from '../../locales/en.json'

function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, path))
    } else {
      result[path] = String(value)
    }
  }
  return result
}

const flat: Record<string, string> = flatten(en as Record<string, unknown>)

export function createI18nMock() {
  return {
    detectLocale: () => 'en',
    createTranslator: () => (key: string, ns?: string) => {
      const namespace = ns || 'common'
      // Key already a full dotted path (e.g. 'species.notFound')
      if (flat[key] !== undefined) return flat[key]
      // Key relative to namespace (e.g. 'notFound' with ns 'species')
      const prefixed = `${namespace}.${key}`
      if (flat[prefixed] !== undefined) return flat[prefixed]
      return key
    },
  }
}
