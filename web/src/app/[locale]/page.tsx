import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export default function Home(): React.JSX.Element {
  const t = useTranslations('home')

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

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-ocean-900 mb-6">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('subtitle')}
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
                {t('startContributing')}
              </Link>
              <Link href="/public/about" className="btn-secondary text-lg px-8 py-3">
                {t('learnMore')}
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-ocean-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-ocean-900 mb-12">
              {t('howItWorks')}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="text-4xl mb-4">
                  <span role="img" aria-label="camera">
                    📸
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-2">
                  {t('steps.capture.title')}
                </h3>
                <p className="text-gray-600">
                  {t('steps.capture.description')}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-4">
                  <span role="img" aria-label="upload">
                    📤
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-2">
                  {t('steps.submit.title')}
                </h3>
                <p className="text-gray-600">
                  {t('steps.submit.description')}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-4">
                  <span role="img" aria-label="science">
                    🔬
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-2">
                  {t('steps.contribute.title')}
                </h3>
                <p className="text-gray-600">
                  {t('steps.contribute.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-ocean-900 mb-8">
              {t('targetSpecies')}
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { name: 'Scylla serrata', common: t('species.blueMudCrab') },
                { name: 'Scylla olivacea', common: t('species.oliveMudCrab') },
                { name: 'Scylla paramamosain', common: t('species.greenMudCrab') },
                { name: 'Scylla tranquebarica', common: t('species.tamilMudCrab') },
              ].map((species) => (
                <div key={species.name} className="card text-center">
                  <h3 className="font-semibold text-ocean-800 italic">
                    {species.name}
                  </h3>
                  <p className="text-gray-600">{species.common}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ocean-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>{t('footerTagline')}</p>
        </div>
      </footer>
    </div>
  )
}
