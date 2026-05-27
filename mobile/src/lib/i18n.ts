import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import en from '../locales/en.json'
import ms from '../locales/ms.json'

const systemLocale = Localization.getLocales()[0]?.languageCode ?? 'en'

type LocaleBundle = Record<string, unknown>

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
  en: buildLocaleResources(en as LocaleBundle),
  ms: buildLocaleResources(ms as LocaleBundle),
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

;(global as any).__i18n = i18n

export default i18n
