import { useCallback } from 'react'
import { useLocaleStore } from '../store/localeStore'

const LOCALE_MAP: Record<string, string> = {
  en: 'en-MY',
  ms: 'ms-MY',
}

export function useFormatters() {
  const { locale } = useLocaleStore()
  const intlLocale = LOCALE_MAP[locale] || 'en-MY'

  const formatDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  }, [intlLocale])

  const formatDateTime = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }, [intlLocale])

  const formatNumber = useCallback((value: number | null, decimals: number = 1) => {
    if (value == null) return 'N/A'
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }, [intlLocale])

  const formatPercent = useCallback((value: number, decimals: number = 0) => {
    return new Intl.NumberFormat(intlLocale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      minimumSignificantDigits: 1,
    }).format(value / 100)
  }, [intlLocale])

  const formatCoordinates = useCallback((lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }, [])

  const formatConditionFactor = useCallback((cw: number, bw: number | null) => {
    if (bw == null || cw === 0) return 'N/A'
    const k = bw / Math.pow(cw, 3) * 100
    return formatNumber(k, 2)
  }, [formatNumber])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1)} KB`
    return `${formatNumber(bytes / (1024 * 1024), 1)} MB`
  }, [formatNumber])

  const formatCurrency = useCallback((value: number | null, currency: string = 'MYR') => {
    if (value == null) return 'N/A'
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }, [intlLocale])

  return {
    formatDate,
    formatDateTime,
    formatNumber,
    formatPercent,
    formatCoordinates,
    formatConditionFactor,
    formatFileSize,
    formatCurrency,
  }
}
