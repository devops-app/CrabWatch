import { getRequestConfig } from 'next-intl/server'
import { routing } from './src/i18n/routing'

import enMessages from './messages/en.json'
import msMessages from './messages/ms.json'
import { localesEn, localesMs } from '../shared/src'

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = result[key]
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else {
      result[key] = sourceVal
    }
  }
  return result
}

const messagesMap: Record<string, typeof enMessages> = {
  en: deepMerge(enMessages, localesEn) as typeof enMessages,
  ms: deepMerge(msMessages, localesMs) as typeof msMessages,
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || routing.defaultLocale
  const messages = messagesMap[locale] || messagesMap[routing.defaultLocale]

  return {
    locale,
    messages,
  }
})
