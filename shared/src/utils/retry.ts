export interface RetryOptions {
  maxRetries?: number
  retryableStatuses?: number[]
  backoffMs?: (attempt: number) => number
}

const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRYABLE_STATUSES = new Set([502, 503, 504])
const DEFAULT_BACKOFF_MS = (attempt: number) => Math.pow(2, attempt - 1) * 1000

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

/**
 * Generic retry wrapper for any async operation.
 * Retries on "Request failed" errors with exponential backoff.
 * Re-throws AbortError immediately without retry.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(backoff(attempt))
    }

    try {
      return await fn()
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw err
      if (err instanceof Error && err.message === 'Request failed' && attempt < maxRetries) continue
      throw err
    }
  }

  throw new Error('Request failed after retries')
}

/**
 * Fetch wrapper with built-in retry for transient server errors (502/503/504).
 * Parses response as { success, data, error } envelope.
 */
export function createRetryFetch(options: RetryOptions = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const retryableStatuses = new Set(options.retryableStatuses ?? [502, 503, 504])
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS

  return async function retryFetch<T>(
    url: string,
    fetchOptions: RequestInit & { signal?: AbortSignal | null } = {}
  ): Promise<T> {
    const { signal, ...init } = fetchOptions

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(backoffMs(attempt))
      }

      try {
        const response = await fetch(url, { ...init, signal })

        if (retryableStatuses.has(response.status) && attempt < maxRetries) {
          continue
        }

        const data = await response.json() as { success: boolean; data: T; error?: string }

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Request failed')
        }

        return data.data as T
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err
        if (err instanceof Error && err.message === 'Request failed' && attempt < maxRetries) continue
        throw err
      }
    }

    throw new Error('Request failed after retries')
  }
}
