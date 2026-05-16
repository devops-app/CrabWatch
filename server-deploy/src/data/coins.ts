import { CoinReference } from '@crabwatch/shared'

export const COIN_REFERENCES: CoinReference[] = [
  { denomination: '5 sen', diameter: 16.5, unit: 'mm' },
  { denomination: '10 sen', diameter: 19.0, unit: 'mm' },
  { denomination: '20 sen', diameter: 19.0, unit: 'mm' },
  { denomination: '50 sen', diameter: 23.0, unit: 'mm' },
]

export function getCoinByDenomination(denomination: string): CoinReference | undefined {
  return COIN_REFERENCES.find(
    (c) => c.denomination.toLowerCase() === denomination.toLowerCase()
  )
}
