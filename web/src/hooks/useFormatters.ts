import { useFormatter } from 'next-intl'

export function useFormatters() {
  const fmt = useFormatter()

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return fmt.dateTime(d, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return fmt.dateTime(d, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatNumber = (value: number | null, decimals: number = 1) => {
    if (value == null) return 'N/A'
    return fmt.number(value, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatInt = (value: number | null) => {
    if (value == null) return 'N/A'
    return fmt.number(value, { maximumFractionDigits: 0 })
  }

  const formatCompact = (value: number) => {
    return fmt.number(value, { notation: 'compact', maximumFractionDigits: 1 })
  }

  const formatPercent = (value: number, decimals: number = 0) => {
    return fmt.number(value / 100, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return fmt.dateTime(d, { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1)} KB`
    return `${formatNumber(bytes / (1024 * 1024), 1)} MB`
  }

  const formatCurrency = (value: number | null, currency: string = 'MYR') => {
    if (value == null) return 'N/A'
    return fmt.number(value, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return {
    formatDate,
    formatDateTime,
    formatTime,
    formatNumber,
    formatInt,
    formatCompact,
    formatPercent,
    formatFileSize,
    formatCurrency,
  }
}
