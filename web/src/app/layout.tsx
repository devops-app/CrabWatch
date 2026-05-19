import type { Metadata } from 'next'
import type { ReactNode, ReactElement } from 'react'

import '../styles/globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'CrabWatch Malaysia — Crab Conservation',
  description: 'Citizen science platform for crab conservation in Malaysia',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
