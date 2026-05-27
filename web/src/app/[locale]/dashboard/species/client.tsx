'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { SpeciesResponse } from '@crabwatch/shared'

export function SpeciesClient({ initialSpecies }: { initialSpecies: SpeciesResponse[] }) {
  const t = useTranslations('species')
  const [species] = useState(initialSpecies)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SpeciesResponse | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const list = Array.isArray(species) ? species : []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (s) =>
        s.scientificName.toLowerCase().includes(q) ||
        s.commonName.toLowerCase().includes(q)
    )
  }, [species, search])

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-ocean-900 mb-4">{t('guide')}</h1>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{t('found', { count: filtered.length })}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">{t('noResults')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('tryDifferent')}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="card hover:border-ocean-400 transition-colors text-left group"
            >
              {s.images.length > 0 ? (
                <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-100">
                  <img
                    src={s.images[0]}
                    alt={s.commonName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-ocean-50 flex items-center justify-center">
                  <span className="text-4xl">🦀</span>
                </div>
              )}
              <h3 className="font-semibold text-ocean-900">{s.commonName}</h3>
              <p className="text-sm text-gray-500 italic">{s.scientificName}</p>
              {s.keyFeatures.length > 0 && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{s.description}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between rounded-t-xl z-10">
              <div>
                <h2 className="text-xl font-bold text-ocean-900">{selected.commonName}</h2>
                <p className="text-sm text-gray-500 italic">{selected.scientificName}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {selected.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selected.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setFullscreenImage(img)}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-ocean-400 transition-all"
                    >
                      <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {selected.description && (
                <div>
                  <h3 className="text-sm font-semibold text-ocean-800 mb-2">{t('description')}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                </div>
              )}

              {selected.keyFeatures.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ocean-800 mb-2">{t('keyFeatures')}</h3>
                  <div className="space-y-2">
                    {selected.keyFeatures.map((kf, i) => (
                      <div key={i} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                        <span className="text-xs font-medium text-gray-500 w-28 flex-shrink-0">{kf.trait}</span>
                        <span className="text-sm text-gray-800">{kf.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.distributionZones.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ocean-800 mb-2">{t('distributionZones')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.distributionZones.map((dz, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-ocean-50 text-ocean-800 rounded-full text-xs font-medium"
                      >
                        {dz.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setFullscreenImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fullscreenImage}
            alt={t('fullView')}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}
