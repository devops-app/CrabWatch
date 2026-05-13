import Link from 'next/link'
import { TARGET_SPECIES_COUNT, STATES_AND_TERRITORIES_COUNT } from '@crabwatch/shared'

export default function AboutPage(): React.JSX.Element {
  const features = [
    {
      icon: '📊',
      title: 'Observation Tracking',
      description:
        'Record crab sightings with species, size, weight, and location data. Every observation contributes to a growing scientific dataset.',
    },
    {
      icon: '🗺️',
      title: 'Interactive Mapping',
      description:
        'Visualize observation hotspots across Malaysia with our interactive map. Identify patterns in crab distribution and habitat preferences.',
    },
    {
      icon: '📈',
      title: 'Data Analytics',
      description:
        'Access population analytics including size-frequency distributions, gender ratios, maturity indices, and temporal trends across all tracked species.',
    },
    {
      icon: '🤝',
      title: 'Community Validation',
      description:
        'A two-tier review system where researchers validate citizen-submitted observations, ensuring data quality for scientific use.',
    },
  ]

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-ocean-700">
              CrabWatch
            </Link>
            <div className="flex gap-4">
              <Link href="/auth/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/auth/register" className="btn-primary">
                Register
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
          <h1 className="text-5xl font-bold mb-6">
            CrabWatch Malaysia
          </h1>
          <p className="text-xl text-ocean-100 max-w-3xl mx-auto leading-relaxed">
            Protecting Malaysia&apos;s crab populations through community-driven
            science. We empower fishers, divers, and nature enthusiasts to become
            citizen scientists, collecting vital data that informs conservation
            policy and sustainable fisheries management.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-ocean-900 mb-4">
            Our Mission
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-16">
            Malaysia is home to diverse crab species including mud crabs, swimming
            crabs, and hermit crabs across mangrove, coastal, and marine habitats.
            Overfishing, habitat loss, and climate change threaten these populations.
            CrabWatch bridges the gap between local communities and marine scientists
            by creating an accessible platform for data collection, analysis, and
            conservation action.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
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
              <div className="text-gray-600">Target Species</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-mangrove-600 mb-2">{STATES_AND_TERRITORIES_COUNT}</div>
              <div className="text-gray-600">States & Territories</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-600 mb-2">
                Growing
              </div>
              <div className="text-gray-600">Citizen Scientists</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-ocean-900 mb-4">
            Get Involved
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Whether you&apos;re a fisherman, a recreational diver, or a marine
            biology student, your observations matter. Join our community of
            citizen scientists and help protect Malaysia&apos;s crab
            populations.
          </p>
          <div className="flex gap-4 justify-center">
           <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
                Create Account
              </Link>
              <Link href="/auth/login" className="btn-secondary text-lg px-8 py-3">
                Sign In
              </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-ocean-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-ocean-900 mb-12">
            Contact Us
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h3 className="font-semibold text-ocean-800 mb-2">Email</h3>
              <p className="text-gray-600">support@dsigncodehub.com</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-ocean-800 mb-2">Location</h3>
              <p className="text-gray-600">Kuala Lumpur, Malaysia</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-ocean-800 mb-2">Partners</h3>
              <p className="text-gray-600">Universiti Malaysia Terengganu</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-ocean-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>CrabWatch Malaysia — Citizen Science for Crab Conservation</p>
        </div>
      </footer>
    </div>
  )
}
