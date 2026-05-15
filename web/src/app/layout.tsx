import type { Metadata } from 'next'
import type { ReactNode, ReactElement } from 'react'
/* eslint-disable react-hooks/rules-of-hooks */
import { useAzureMonitor } from '@azure/monitor-opentelemetry'
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  useAzureMonitor()
}
/* eslint-enable react-hooks/rules-of-hooks */

import '../styles/globals.css'
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
