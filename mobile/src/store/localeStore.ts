import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import * as Localization from 'expo-localization'
import { detectLocale } from '@crabwatch/shared'

const LOCALE_KEY = 'app_locale'
const SUPPORTED_LOCALES = ['en', 'ms'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

interface LocaleState {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => Promise<void>
  init: () => Promise<void>
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'en',

  setLocale: async (locale) => {
    await SecureStore.setItemAsync(LOCALE_KEY, locale)
    set({ locale })

    const i18nInstance = global.__i18n
    if (i18nInstance) {
      i18nInstance.changeLanguage(locale)
    }
  },

  init: async () => {
    const saved = await SecureStore.getItemAsync(LOCALE_KEY)
    const parsed = saved as SupportedLocale | undefined
    if (parsed && SUPPORTED_LOCALES.includes(parsed)) {
      set({ locale: parsed })
      const i18nInstance = global.__i18n
      if (i18nInstance) {
        i18nInstance.changeLanguage(parsed)
      }
      return
    }

    const deviceLocales = Localization.getLocales().map(l => l.languageTag)
    const locale = detectLocale(null, deviceLocales) as SupportedLocale
    set({ locale })

    const i18nInstance = global.__i18n
    if (i18nInstance) {
      i18nInstance.changeLanguage(locale)
    }
  },
}))
