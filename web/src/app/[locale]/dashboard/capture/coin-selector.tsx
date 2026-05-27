'use client'

import { useTranslations } from 'next-intl'
import { COIN_SERIES } from './utils'

interface CoinSelectorProps {
  coinType: string
  coinSelected: boolean
  expandedSeries: string | null
  onCoinSelect: (value: string) => void
  onAIDetect: () => void
  onExpandSeries: (series: string | null) => void
  onChangeCoin: () => void
}

export function CoinSelector({
  coinType,
  coinSelected,
  expandedSeries,
  onCoinSelect,
  onAIDetect,
  onExpandSeries,
  onChangeCoin,
}: CoinSelectorProps) {
  const t = useTranslations('capture')

  if (coinSelected) {
    return (
      <section className="card flex items-center justify-between gap-4">
        <p className="text-sm text-gray-700">{t('coinSelector.coinLabel')} <span className="font-semibold">{coinType || t('coinSelector.aiDetect')}</span></p>
        <button type="button" className="text-ocean-700 text-sm" onClick={onChangeCoin} aria-label={t('client.changeCoin')}>{t('coinSelector.change')}</button>
      </section>
    )
  }

  return (
    <section className="card">
      <h2 className="text-lg font-semibold text-ocean-800 mb-3">{t('coinSelector.reference')}</h2>
      <p className="text-gray-600 mb-4">{t('coinSelector.referenceHint')}</p>

      <button
        type="button"
        className="w-full mb-3 px-4 py-3 rounded-lg border-2 border-amber-300 bg-amber-50 text-left hover:border-amber-400 transition-colors flex items-center gap-2"
        onClick={onAIDetect}
        aria-label={t('client.letAiDetect')}
      >
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="font-semibold text-amber-700">{t('coinSelector.letAiDetect')}</span>
      </button>

      {Object.entries(COIN_SERIES).map(([series, options]) => (
        <div key={series} className="mb-2">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 hover:border-ocean-300 text-left transition-colors"
            onClick={() => onExpandSeries(expandedSeries === series ? null : series)}
            aria-label={t('client.toggleSeries', { series })}
          >
            <span className="text-sm font-semibold text-ocean-800">{series}</span>
            <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSeries === series ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {expandedSeries === series && (
            <div className="grid grid-cols-2 gap-2 mt-2 ml-4">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onCoinSelect(option.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:border-ocean-400 text-left text-sm transition-colors"
                  aria-label={t('client.selectCoin', { coin: option.label })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
