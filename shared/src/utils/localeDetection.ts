export function detectLocale(userLocale?: string | null, systemLocales?: string[]): string {
  if (userLocale && userLocale !== 'en') return userLocale
  if (systemLocales) {
    for (const loc of systemLocales) {
      if (loc.startsWith('ms')) return 'ms'
      if (loc.startsWith('en')) return 'en'
    }
  }
  return 'en'
}
