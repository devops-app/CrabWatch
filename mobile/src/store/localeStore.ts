import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

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

    const i18n = (global as any).__i18n
    if (i18n) {
      i18n.changeLanguage(locale)
    }
  },

  init: async () => {
    const saved = await SecureStore.getItemAsync(LOCALE_KEY)
    const locale = (saved && SUPPORTED_LOCALES.includes(saved as any)) ? (saved as SupportedLocale) : 'en'
    set({ locale })

    const i18n = (global as any).__i18n
    if (i18n) {
      i18n.changeLanguage(locale)
    }
  },
}))
