'use client'

import { useTranslations } from 'next-intl'
import type { CrabAnalysisResult, SpeciesResponse, PhotoView } from '@crabwatch/shared'
import { CAPTURE_STEPS, ReviewFormState, getConfidenceTone, normalizeSpeciesText } from './utils'
import { MapSection } from './map-section'

function AIBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {label}
    </span>
  )
}

interface ReviewSectionProps {
  analysis: CrabAnalysisResult
  species: SpeciesResponse[]
  photos: Record<PhotoView, string | null>
  review: ReviewFormState
  coinType: string
  busyMessage: string | null
  submitError: string | null
  onReviewChange: (review: ReviewFormState) => void
  onRequestGPS: () => void
  onBackToCapture: () => void
  onSubmit: () => void
  onPhotoFullscreen: (uri: string) => void
  lat: string
  lng: string
  mapViewport: { latitude: number; longitude: number; zoom: number }
  onMapClick: (lat: number, lng: number) => void
  onViewportChange: (viewport: { latitude: number; longitude: number; zoom: number }) => void
}

function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [intPart = '', ...fractionParts] = normalized.split('.')
  if (fractionParts.length === 0) return intPart
  const fraction = fractionParts.join('').slice(0, 2)
  return `${intPart}.${fraction}`
}

export function ReviewSection({
  analysis,
  species,
  photos,
  review,
  coinType,
  busyMessage,
  submitError,
  onReviewChange,
  onRequestGPS,
  onBackToCapture,
  onSubmit,
  onPhotoFullscreen,
  lat,
  lng,
  mapViewport,
  onMapClick,
  onViewportChange,
}: ReviewSectionProps) {
  const t = useTranslations('capture')
  const tone = getConfidenceTone(analysis.confidence)

  return (
    <>
      {photos.dorsal && (
        <section className="flex gap-2 overflow-x-auto pb-1">
          {CAPTURE_STEPS.map((step) => photos[step.key] && (
            <img
              key={step.key}
              src={photos[step.key]!}
              alt={t.raw(`stepLabels.${step.key}`)}
              className="w-[70px] h-[70px] rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onPhotoFullscreen(photos[step.key]!)}
            />
          ))}
        </section>
      )}

      {!analysis.speciesId || analysis.speciesId === 'unknown' || analysis.confidence === 0 ? (
        <section className="card bg-amber-50 border border-amber-200 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800">{t('review.aiUnavailable')}</p>
        </section>
      ) : null}

      <section className="card space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ocean-800">{t('review.aiResults')}</h2>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tone.className}`}>
            {t(`confidence.${tone.level}`)} {t('review.confidence')}
          </span>
        </div>
        <p className="text-gray-700"><span className="font-semibold">{t('review.speciesLabel')}</span> {analysis.speciesName}</p>
        <p className="text-gray-700"><span className="font-semibold">{t('review.confidenceLabel')}</span> {(analysis.confidence * 100).toFixed(1)}%</p>
        {analysis.detectedCoin && (
          <p className="text-gray-700"><span className="font-semibold">{t('review.detectedCoin')}</span> {analysis.detectedCoin} ({(analysis.coinConfidence * 100).toFixed(0)}%)</p>
        )}
        {analysis.rawAnalysis && (
          <p className="text-sm text-gray-500 italic">{analysis.rawAnalysis}</p>
        )}
        {analysis.suggestions.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-semibold text-ocean-800 mb-1">{t('review.aiSuggestions')}</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              {analysis.suggestions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </ul>
          </div>
        )}
      </section>

      {coinType && analysis.detectedCoin && coinType !== analysis.detectedCoin && (
        <section className="card bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">{t('review.coinMismatch')}</p>
              <p className="text-sm text-amber-700">{t('review.coinMismatchDesc', { selected: coinType, detected: analysis.detectedCoin })}</p>
              <p className="text-xs text-amber-600 mt-1">{t('review.coinMismatchHint')}</p>
            </div>
          </div>
        </section>
      )}

      <section className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('review.species')}{analysis.speciesName && normalizeSpeciesText(analysis.speciesName) !== 'unknown species' && <AIBadge label="AI" />}
          </label>
          <select className="input-field" value={review.speciesId} onChange={(e) => onReviewChange({ ...review, speciesId: e.target.value })}>
            <option value="">{t('review.selectSpecies')}</option>
            {species.map((s) => <option key={s.id} value={s.id}>{s.commonName} ({s.scientificName})</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('review.carapaceWidth')}{analysis.estimatedCW && <AIBadge label={t('review.carapaceWidthAi', { value: analysis.estimatedCW })} />}
          </label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field"
            value={review.cw}
            onChange={(e) => onReviewChange({ ...review, cw: sanitizeDecimalInput(e.target.value) })}
            placeholder={t('review.cwPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('review.bodyWeight')}</label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field"
            value={review.bw}
            onChange={(e) => onReviewChange({ ...review, bw: sanitizeDecimalInput(e.target.value) })}
            placeholder={t('review.bwPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('review.gender')}{analysis.gender && analysis.gender !== 'unknown' && <AIBadge label={t('review.genderAi', { value: analysis.gender })} />}
          </label>
          <select className="input-field" value={review.gender} onChange={(e) => onReviewChange({ ...review, gender: e.target.value as ReviewFormState['gender'] })}>
            <option value="male">{t('review.male')}</option>
            <option value="female">{t('review.female')}</option>
            <option value="unknown">{t('review.unknown')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('review.maturation')}{analysis.maturationStatus && analysis.maturationStatus !== 'unknown' && <AIBadge label={t('review.maturationAi', { value: analysis.maturationStatus })} />}
          </label>
          <select className="input-field" value={review.maturationStatus} onChange={(e) => onReviewChange({ ...review, maturationStatus: e.target.value as ReviewFormState['maturationStatus'] })}>
            <option value="mature">{t('review.mature')}</option>
            <option value="immature">{t('review.immature')}</option>
            <option value="unknown">{t('review.unknown')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('review.locationMethod')}</label>
          <select className="input-field" value={review.locationMethod} onChange={(e) => onReviewChange({ ...review, locationMethod: e.target.value as 'gps' | 'manual' })}>
            <option value="manual">{t('review.manual')}</option>
            <option value="gps">{t('review.gps')}</option>
          </select>
        </div>

        <MapSection
          lat={lat}
          lng={lng}
          mapViewport={mapViewport}
          onMapClick={onMapClick}
          onViewportChange={onViewportChange}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('review.latitude')}</label>
          <input className="input-field" value={review.lat} onChange={(e) => onReviewChange({ ...review, lat: e.target.value })} placeholder={t('review.latPlaceholder')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('review.longitude')}</label>
          <input className="input-field" value={review.lng} onChange={(e) => onReviewChange({ ...review, lng: e.target.value })} placeholder={t('review.lngPlaceholder')} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('review.notes')}</label>
          <textarea className="input-field min-h-[110px]" value={review.notes} onChange={(e) => onReviewChange({ ...review, notes: e.target.value })} />
        </div>
      </section>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      {busyMessage && <p className="text-sm text-ocean-700">{busyMessage}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={onRequestGPS} disabled={Boolean(busyMessage)} aria-label={t('client.useGps')}>{t('review.useBrowserGps')}</button>
        <button type="button" className="btn-secondary" onClick={onBackToCapture} disabled={Boolean(busyMessage)} aria-label={t('client.backCapture')}>{t('review.backToCapture')}</button>
        <button type="button" className="btn-primary" onClick={onSubmit} disabled={Boolean(busyMessage)} aria-label={t('client.submitObs')}>{t('review.submitObservation')}</button>
      </div>
    </>
  )
}
