import createNextIntlPlugin from 'next-intl/plugin'

const isDev = process.env.NODE_ENV !== 'production'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // eslint: { ignoreDuringBuilds: true },  // Removed — lint warnings should surface in CI
  transpilePackages: ['@crabwatch/shared'],
  env: {
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
  },
  rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'https://crabwatch-api.azurewebsites.net'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/dashboard/:path*',
        destination: '/en/dashboard/:path*',
      },
      {
        source: '/auth/:path*',
        destination: '/en/auth/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' blob: data: https://*.azurewebsites.net https://*.blob.core.windows.net https://*.mapbox.com https://*.mapboxcdn.com${isDev ? ' http://127.0.0.1:10000 http://localhost:10000' : ''}`,
              "font-src 'self' data: https://*.mapbox.com https://*.mapboxcdn.com",
              `connect-src 'self' https://*.azurewebsites.net https://*.blob.core.windows.net https://*.mapbox.com https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://*.applicationinsights.azure.com${isDev ? ' http://127.0.0.1:10000 http://localhost:10000' : ''}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
