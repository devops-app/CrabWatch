import type { TOptions, TFunction } from 'i18next'
import { Request, Response, NextFunction } from 'express'
import { getServerI18n } from '../config/i18n'
import { translationLocaleStorage } from '../utils/i18n-prisma'

const localeCache = new WeakMap<Request, string>()
const translatorCache = new WeakMap<Request, Map<string, TFunction>>()

export function detectLocale(req: Request, userLocale?: string | null): string {
  if (localeCache.has(req)) {
    return localeCache.get(req)!
  }

  let locale: string

  if (userLocale && (userLocale === 'en' || userLocale === 'ms')) {
    locale = userLocale
  } else {
    const acceptLanguage = req.headers['accept-language'] || 'en'
    const parts = acceptLanguage.split(',')[0].split(';')
    let detected = parts[0].trim().toLowerCase()

    if (detected.startsWith('ms') || detected.startsWith('may')) {
      locale = 'ms'
    } else if (detected.startsWith('en')) {
      locale = 'en'
    } else {
      locale = 'en'
    }
  }

  localeCache.set(req, locale)
  return locale
}

export function createTranslator(req: Request): (key: string, ns?: string, options?: TOptions) => string {
  const i18n = getServerI18n()
  const userLocale = req.dbUser?.preferredLocale ?? null
  const locale = detectLocale(req, userLocale)

  let nsMap = translatorCache.get(req)
  if (!nsMap) {
    nsMap = new Map()
    translatorCache.set(req, nsMap)
  }

  return (key: string, ns?: string, options?: TOptions) => {
    const namespace = ns || 'common'
    let fixedT = nsMap.get(namespace)
    if (!fixedT) {
      fixedT = i18n.getFixedT(locale, namespace)
      nsMap.set(namespace, fixedT)
    }
    // The codebase uses two key conventions:
    //   - `__('notFound', 'species')`            -> key relative to namespace
    //   - `__('species.notFound', 'species')`    -> key already includes namespace
    // i18next treats `.` as a path separator, so the second form looks up
    // `species.species.notFound` (not found) and returns the raw key. Try the
    // key as-is first; if i18next returns it unchanged (not found) and it
    // starts with `<namespace>.`, retry with the prefix stripped. This keeps
    // flat keys that legitimately start with the namespace name intact.
    const full = fixedT(key, options)
    if (full !== key) return full
    if (key.startsWith(`${namespace}.`)) {
      const strippedKey = key.slice(namespace.length + 1)
      const stripped = fixedT(strippedKey, options)
      if (stripped !== strippedKey) return stripped
    }
    return full
  }
}

export function localeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const locale = detectLocale(req, req.dbUser?.preferredLocale ?? null)
  translationLocaleStorage.run(locale, () => {
    next()
  })
}
