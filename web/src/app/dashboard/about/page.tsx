export default function AboutPage(): React.JSX.Element {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ocean-900 mb-2">About CrabWatch</h1>
        <p className="text-gray-500">v1.0.0</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">What is CrabWatch?</h2>
        <p className="text-gray-600 leading-relaxed">
          CrabWatch is a citizen science platform for monitoring crab populations
          across Malaysia. Researchers and citizens can capture crab observations
          with AI-powered species identification, size estimation, and data analytics
          to support conservation efforts.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">Made By</h2>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛠️</span>
          <span className="text-gray-800 font-medium text-lg">DsignCodeHub</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">Support</h2>
        <a
          href="mailto:support@dsigncodehub.com"
          className="flex items-center gap-3 text-ocean-600 hover:text-ocean-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">support@dsigncodehub.com</span>
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-900 mb-3">Features</h2>
        <ul className="space-y-2">
          {[
            'AI-powered crab species identification',
            'Size estimation with coin reference',
            'Real-time observation tracking',
            'Interactive species map',
            'Research-grade analytics dashboard',
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-gray-600">
              <span className="text-ocean-500 mt-1">•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-sm text-gray-400">
        {new Date().getFullYear()} DsignCodeHub. All rights reserved.
      </p>
    </div>
  )
}
