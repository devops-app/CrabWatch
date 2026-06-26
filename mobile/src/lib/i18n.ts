import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import { localesEn as sharedEn, localesMs as sharedMs } from '@crabwatch/shared'
import en from '../locales/en.json'
import ms from '../locales/ms.json'

const systemLocale = Localization.getLocales()[0]?.languageCode ?? 'en'

type LocaleBundle = Record<string, unknown>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(base: LocaleBundle, override: LocaleBundle): LocaleBundle {
  const result: LocaleBundle = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key] as LocaleBundle, value as LocaleBundle)
    } else {
      result[key] = value
    }
  }

  return result
}

function buildLocaleResources(bundle: LocaleBundle) {
  const namespaces: Record<string, LocaleBundle> = {
    translation: bundle,
  }

  for (const [key, value] of Object.entries(bundle)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      namespaces[key] = value as LocaleBundle
    }
  }

  return namespaces
}

const resources = {
  en: buildLocaleResources(deepMerge(sharedEn as LocaleBundle, en as LocaleBundle)),
  ms: buildLocaleResources(deepMerge(sharedMs as LocaleBundle, ms as LocaleBundle)),
}

const fallbackLng = systemLocale === 'ms' ? 'ms' : 'en'

i18n.use(initReactI18next).init({
  resources,
  lng: fallbackLng,
  fallbackLng: 'en',
  defaultNS: 'translation',
  fallbackNS: 'translation',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

; global.__i18n = i18n

export default i18n
