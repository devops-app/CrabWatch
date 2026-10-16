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
    // Azure Blob Storage URLs are shaped `<account>.blob.core.windows.net`,
    // so the hostname includes the storage-account subdomain. Match the base
    // domain either exactly or as a subdomain suffix (e.g.
    // `crabwatch04052026.blob.core.windows.net` ends with `.blob.core.windows.net`).
    return Array.from(ALLOWED_HOSTS).some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  } catch {
    return false
  }
}
