import Link from 'next/link'

export default function Home(): React.JSX.Element {
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

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-ocean-900 mb-6">
              CrabWatch Malaysia
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A citizen science platform for crab conservation. Help protect
              Malaysia&apos;s crab populations by contributing your observations.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
                Start Contributing
              </Link>
              <Link href="/public/about" className="btn-secondary text-lg px-8 py-3">
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-ocean-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-ocean-900 mb-12">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="text-4xl mb-4">
                  <span role="img" aria-label="camera">
                    📸
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-2">
                  Capture
                </h3>
                <p className="text-gray-600">
                  Take a photo of your crab and record its measurements
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-4">
                  <span role="img" aria-label="upload">
                    📤
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-2">
                  Submit
                </h3>
                <p className="text-gray-600">
                  Fill in species, size, and location data through our mobile app
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-4">
                  <span role="img" aria-label="science">
                    🔬
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-ocean-800 mb-2">
                  Contribute
                </h3>
                <p className="text-gray-600">
                  Your data helps scientists understand and protect crab populations
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-ocean-900 mb-8">
              Target Species
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { name: 'Scylla serrata', common: 'Blue Mud Crab' },
                { name: 'Scylla olivacea', common: 'Olive Mud Crab' },
                { name: 'Scylla paramamosain', common: 'Green Mud Crab' },
                { name: 'Scylla tranquebarica', common: 'Tamil Mud Crab' },
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
          <p>CrabWatch Malaysia — Citizen Science for Crab Conservation</p>
        </div>
      </footer>
    </div>
  )
}
