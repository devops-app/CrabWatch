const COIN_VALUE_TO_KEY: Record<string, string> = {
  '5 sen (Third Series, 17.78 mm)': 'third5',
  '10 sen (Third Series, 18.80 mm)': 'third10',
  '20 sen (Third Series, 20.60 mm)': 'third20',
  '50 sen (Third Series, 22.65 mm)': 'third50',
  '5 sen (Second Series, 16.20 mm)': 'second5',
  '10 sen (Second Series, 19.40 mm)': 'second10',
  '20 sen (Second Series, 23.59 mm)': 'second20',
  '50 sen (Second Series, 27.76 mm)': 'second50',
}

export function getCoinKey(value: string | null | undefined): string | null {
  if (!value) return null
  return COIN_VALUE_TO_KEY[value] ?? null
}
