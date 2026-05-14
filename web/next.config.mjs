/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crabwatch/shared'],
  env: {
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || ''
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
