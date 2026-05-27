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
  const userLocale = (req as any).dbUser?.preferredLocale ?? null
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
    return fixedT(key, options)
  }
}

export function localeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const locale = detectLocale(req, (req as any).dbUser?.preferredLocale ?? null)
  translationLocaleStorage.run(locale, () => {
    next()
  })
}
