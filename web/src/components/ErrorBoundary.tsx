'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useTranslations } from 'next-intl'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// Fallback UI rendered without next-intl context (class component can't use hooks)
function ErrorFallbackContent({ error }: { error: Error | null }) {
  const t = useTranslations('error.boundary')
  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50 p-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-ocean-900 mb-2">{t('title')}</h2>
        <p className="text-gray-600 mb-4">
          {t('description')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          {t('refresh')}
        </button>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">Error details</summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto text-red-600">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }

    fetch('/api/v1/telemetry/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }),
    }).catch((err) => {
      console.error('ErrorBoundary telemetry POST failed:', err)
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallbackContent error={this.state.error} />
    }

    return this.props.children
  }
}
