import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { TARGET_SPECIES_COUNT, STATES_AND_TERRITORIES_COUNT } from '@crabwatch/shared'

export default async function AboutPage(): Promise<React.JSX.Element> {
  const t = await getTranslations('publicAbout')

  const features = [
    {
      icon: '📊',
      title: t('feature1.title'),
      description: t('feature1.description'),
    },
    {
      icon: '🗺️',
      title: t('feature2.title'),
      description: t('feature2.description'),
    },
    {
      icon: '📈',
      title: t('feature3.title'),
      description: t('feature3.description'),
    },
    {
      icon: '🤝',
      title: t('feature4.title'),
      description: t('feature4.description'),
    },
  ]

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-ocean-700">
              {t('brand')}
            </Link>
            <div className="flex gap-4">
              <Link href="/auth/login" className="btn-secondary">
                {t('login')}
              </Link>
              <Link href="/auth/register" className="btn-primary">
                {t('register')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative bg-gradient-to-br from-ocean-600 via-ocean-700 to-ocean-900 text-white py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-mangrove-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">{t('hero.title')}</h1>
          <p className="text-xl text-ocean-100 max-w-3xl mx-auto leading-relaxed">{t('hero.description')}</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-ocean-900 mb-4">{t('mission.title')}</h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-16">{t('mission.description')}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-ocean-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-ocean-600 mb-2">{TARGET_SPECIES_COUNT}</div>
              <div className="text-gray-600">{t('stats.targetSpecies')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-mangrove-600 mb-2">{STATES_AND_TERRITORIES_COUNT}</div>
              <div className="text-gray-600">{t('stats.states')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-600 mb-2">{t('stats.growing')}</div>
              <div className="text-gray-600">{t('stats.citizenScientists')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-ocean-900 mb-4">{t('cta.title')}</h2>
          <p className="text-lg text-gray-600 mb-8">{t('cta.description')}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
              {t('cta.createAccount')}
            </Link>
            <Link href="/auth/login" className="btn-secondary text-lg px-8 py-3">
              {t('cta.signIn')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-ocean-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-ocean-900 mb-12">{t('contact.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h3 className="font-semibold text-ocean-800 mb-2">{t('contact.email')}</h3>
              <p className="text-gray-600">support@dsigncodehub.com</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-ocean-800 mb-2">{t('contact.location')}</h3>
              <p className="text-gray-600">{t('contact.locationValue')}</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-ocean-800 mb-2">{t('contact.partners')}</h3>
              <p className="text-gray-600">{t('contact.partnersValue')}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-ocean-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>{t('footer')}</p>
        </div>
      </footer>
    </div>
  )
}
