import { api } from './api'
const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production'

async function reportError(message: string, error?: Error | unknown): Promise<void> {
  if (!isProd) {
    console.error(message, error)
    return
  }

  const payload = {
    message,
    error: error instanceof Error
      ? { message: error.message, stack: error.stack }
      : String(error),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  }

  try {
    await api.reportTelemetryError(payload)
  } catch {
    console.error('[Telemetry] Failed to report error to backend')
  }
}

export const logger = {
  error: (message: string, error?: Error | unknown): void => {
    if (!isProd) {
      console.error(message, error)
    }
    reportError(message, error)
  },
  warn: (message: string, data?: unknown): void => {
    console.warn(message, data)
  },
}
