import { getTranslations } from 'next-intl/server'
import pkg from '../../../../../package.json'

export default async function AboutPage(): Promise<React.JSX.Element> {
  const t = await getTranslations('about')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ocean-900 mb-2">{t('title')}</h1>
        <p className="text-gray-500">{t('version')} {pkg.version}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">{t('features')}</h2>
        <p className="text-gray-600 leading-relaxed">
          {t('description')}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">{t('madeBy')}</h2>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛠️</span>
          <span className="text-gray-800 font-medium text-lg">{t('madeByCredit')}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">{t('support')}</h2>
        <a
          href="mailto:support@dsigncodehub.com"
          className="flex items-center gap-3 text-ocean-600 hover:text-ocean-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">{t('supportEmail')}</span>
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">{t('features')}</h2>
        <ul className="space-y-2">
          {[t('feature1'), t('feature2'), t('feature3'), t('feature4'), t('feature5')].map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-gray-600">
              <span className="text-ocean-500 mt-1">•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-sm text-gray-400">
        {new Date().getFullYear()} {t('footer')}
      </p>
    </div>
  )
}
