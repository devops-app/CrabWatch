import i18next from 'i18next'
import { localesEn as sharedEn, localesMs as sharedMs } from '../../../shared/src'

const en = require('../locales/en.json')
const ms = require('../locales/ms.json')

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(target[key] || {}, value)
    } else {
      result[key] = value
    }
  }
  return result
}

export const serverI18n = i18next.createInstance()

export async function initServerI18n(): Promise<void> {
  await serverI18n.init({
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ms'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'user', 'observation', 'species', 'analysis', 'admin', 'invite', 'engagement', 'upload', 'notification', 'gamification'],
    resources: {
      en: {
        common: deepMerge(en.common, sharedEn.common),
        auth: en.auth,
        user: en.user,
        observation: deepMerge(en.observation, sharedEn.observation),
        species: en.species,
        analysis: en.analysis,
        admin: deepMerge(en.admin, sharedEn.admin),
        invite: en.invite,
        engagement: en.engagement,
        upload: en.upload,
        notification: en.notification,
        gamification: sharedEn.gamification,
      },
      ms: {
        common: deepMerge(ms.common, sharedMs.common),
        auth: ms.auth,
        user: ms.user,
        observation: deepMerge(ms.observation, sharedMs.observation),
        species: ms.species,
        analysis: ms.analysis,
        admin: deepMerge(ms.admin, sharedMs.admin),
        invite: ms.invite,
        engagement: ms.engagement,
        upload: ms.upload,
        notification: ms.notification,
        gamification: sharedMs.gamification,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  })
}

export function getServerI18n() {
  return serverI18n
}
