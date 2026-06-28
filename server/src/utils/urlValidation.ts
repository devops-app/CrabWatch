const ALLOWED_HOSTS = new Set([
  'blob.core.windows.net',
  'blob.core.chinacloudapi.cn',
  'blob.core.usgovcloudapi.net',
])

export function isSafeImageUrl(url: string): boolean {
  if (url.startsWith('data:')) return true

  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    return ALLOWED_HOSTS.has(hostname)
  } catch {
    return false
  }
}
