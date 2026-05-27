import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

import enMessages from '../../messages/en.json'
import msMessages from '../../messages/ms.json'

const messagesMap: Record<string, typeof enMessages> = {
  en: enMessages,
  ms: msMessages,
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || routing.defaultLocale
  const messages = messagesMap[locale] || messagesMap[routing.defaultLocale]

  return {
    locale,
    messages,
  }
})
