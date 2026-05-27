import i18next from 'i18next'

const en = require('../locales/en.json')
const ms = require('../locales/ms.json')

export const serverI18n = i18next.createInstance()

export async function initServerI18n(): Promise<void> {
  await serverI18n.init({
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'ms'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'user', 'observation', 'species', 'analysis', 'admin', 'invite', 'engagement', 'upload', 'notification'],
    resources: {
      en: {
        common: en.common,
        auth: en.auth,
        user: en.user,
        observation: en.observation,
        species: en.species,
        analysis: en.analysis,
        admin: en.admin,
        invite: en.invite,
        engagement: en.engagement,
        upload: en.upload,
        notification: en.notification,
      },
      ms: {
        common: ms.common,
        auth: ms.auth,
        user: ms.user,
        observation: ms.observation,
        species: ms.species,
        analysis: ms.analysis,
        admin: ms.admin,
        invite: ms.invite,
        engagement: ms.engagement,
        upload: ms.upload,
        notification: ms.notification,
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
