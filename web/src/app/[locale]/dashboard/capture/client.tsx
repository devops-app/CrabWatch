'use client'

import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import type { CrabAnalysisResult, PhotoView, SpeciesResponse } from '@crabwatch/shared'
import { api } from '@/lib/api'
import { MALAYSIA_BOUNDS } from '@crabwatch/shared'
import {
  CAPTURE_STEPS,
  isUuid,
  findSpeciesMatch,
  dataUrlToFile,
  normalizeGender,
  normalizeMaturation,
  formatElapsed,
  analyzeView,
  detectViewAI,
  getConfidenceTone,
} from './utils'
import type { ReviewFormState, FlashMessage, AnalysisStage, PhotoMap } from './utils'
import { CoinSelector } from './coin-selector'
import { CameraSection } from './camera-section'
import { MapSection } from './map-section'
import { ReviewSection } from './review-section'

function createUploadSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function hasAtMostTwoDecimalPlaces(value: string): boolean {
  const normalized = value.trim()
  return /^\d+(\.\d{1,2})?$/.test(normalized)
}

interface CaptureClientProps {
  initialSpecies?: SpeciesResponse[] | null
}

export function CaptureClient({ initialSpecies }: CaptureClientProps): React.JSX.Element {
  const t = useTranslations('capture.client')
  const tCapture = useTranslations('capture')
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)
  const [coinType, setCoinType] = useState('')
  const [coinSelected, setCoinSelected] = useState(false)
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [busyMessage, setBusyMessage] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [analysis, setAnalysis] = useState<CrabAnalysisResult | null>(null)
  const [species, setSpecies] = useState<SpeciesResponse[]>(initialSpecies ?? [])
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([])
  const [uploadSessionId, setUploadSessionId] = useState<string>(() => createUploadSessionId())
  const [photos, setPhotos] = useState<PhotoMap>({ dorsal: null, ventral: null, 'carapace-closeup': null })
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [viewWarnings, setViewWarnings] = useState<string[]>([])
  const [analyzingView, setAnalyzingView] = useState(false)
  const [mapViewport, setMapViewport] = useState({
    latitude: MALAYSIA_BOUNDS.center.lat,
    longitude: MALAYSIA_BOUNDS.center.lng,
    zoom: 6,
  })
  const [review, setReview] = useState<ReviewFormState>({
    speciesId: '',
    cw: '',
    bw: '',
    gender: 'unknown',
    maturationStatus: 'unknown',
    lat: '',
    lng: '',
    locationMethod: 'manual',
    notes: '',
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (initialSpecies) return
    api.listSpecies().then(setSpecies).catch(() => setSpecies([]))
  }, [initialSpecies])

  const current = CAPTURE_STEPS[currentStep]
  const currentView = current.key
  const isLastStep = currentStep === CAPTURE_STEPS.length - 1
  const requiredComplete = Boolean(photos.dorsal && photos.ventral)
  const inReview = analysis !== null

  const resetState = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    setCoinType('')
    setCoinSelected(false)
    setExpandedSeries(null)
    setCurrentStep(0)
    setCameraActive(false)
    setCameraError(null)
    setBusyMessage(null)
    setAnalysisError(null)
    setSubmitError(null)
    setFlash(null)
    setAnalysisStage('idle')
    setSubmitted(false)
    setElapsed(0)
    setAnalysis(null)
    setUploadedPhotoUrls([])
    setUploadSessionId(createUploadSessionId())
    setPhotos({ dorsal: null, ventral: null, 'carapace-closeup': null })
    setShowFullscreen(false)
    setFullscreenPhoto(null)
    setMapViewport({
      latitude: MALAYSIA_BOUNDS.center.lat,
      longitude: MALAYSIA_BOUNDS.center.lng,
      zoom: 6,
    })
    setReview({
      speciesId: '',
      cw: '',
      bw: '',
      gender: 'unknown',
      maturationStatus: 'unknown',
      lat: '',
      lng: '',
      locationMethod: 'manual',
      notes: '',
    })
  }, [])

  useEffect(() => {
    if (prevPathnameRef.current && prevPathnameRef.current !== '/dashboard/capture' && pathname === '/dashboard/capture') {
      resetState()
    }
    prevPathnameRef.current = pathname
  }, [pathname, resetState])

  const capturedEntries = useMemo(
    () => CAPTURE_STEPS.map((step) => ({ key: step.key, label: tCapture.raw(`stepLabels.${step.key}`), uri: photos[step.key] })).filter((entry) => Boolean(entry.uri)),
    [photos]
  )

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    const attachStream = async () => {
      if (!cameraActive || !videoRef.current || !streamRef.current) return
      const videoEl = videoRef.current
      videoEl.setAttribute('playsinline', 'true')
      videoEl.muted = true
      videoEl.srcObject = streamRef.current
      try {
        await videoEl.play()
      } catch {
        setCameraError(t('cameraPreviewFailed'))
      }
    }
    attachStream()
  }, [cameraActive, t])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 3500)
    return () => window.clearTimeout(timer)
  }, [flash])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  const startCamera = async () => {
    if (!window.isSecureContext) {
      setCameraError(t('cameraRequiresHttps'))
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('cameraNotSupported'))
      return
    }
    try {
      setCameraError(null)
      stopCamera()
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      }
      streamRef.current = stream
      setCameraActive(true)
    } catch {
      setCameraError(t('cameraAccessFailed'))
      setCameraActive(false)
    }
  }

  const runViewValidation = async (dataUrl: string, view: PhotoView, file?: File) => {
    setAnalyzingView(true)
    setViewWarnings([])
    const warnings: string[] = []

    const localWarnings = await analyzeView(dataUrl, view)
    warnings.push(...localWarnings)

    if (file && (view === 'dorsal' || view === 'ventral')) {
      try {
        const aiDetection = await detectViewAI(file, view)
        if (aiDetection.mismatch) {
          warnings.unshift(`⚠️ ${aiDetection.message}`)
        }
      } catch {
        // AI detection failed — keep local warnings only
      }
    }

    setViewWarnings(warnings)
    setAnalyzingView(false)
  }

  const capturePhoto = () => {
    const videoEl = videoRef.current
    const canvasEl = canvasRef.current
    if (!videoEl || !canvasEl) return
    if (!videoEl.videoWidth || !videoEl.videoHeight) {
      setCameraError(t('cameraNotReady'))
      return
    }
    canvasEl.width = videoEl.videoWidth
    canvasEl.height = videoEl.videoHeight
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height)
    const dataUrl = canvasEl.toDataURL('image/jpeg', 0.9)
    setPhotos((prev) => ({ ...prev, [currentView]: dataUrl }))
    stopCamera()
    runViewValidation(dataUrl, currentView)
  }

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setPhotos((prev) => ({ ...prev, [currentView]: result }))
        runViewValidation(result, currentView, file)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setSubmitError(t('gpsUnavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReview((prev) => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          locationMethod: 'gps',
        }))
        setSubmitError(null)
        setFlash({ tone: 'success', text: t('gpsCaptured') })
      },
      () => {
        setSubmitError(t('gpsFetchFailed'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleNext = () => {
    if (!coinSelected && currentStep === 0) {
      setFlash({ tone: 'error', text: t('coinRequired') })
      return
    }
    if (current.required && !photos[currentView]) {
      setFlash({ tone: 'error', text: t('stepRequired', { step: tCapture.raw(`stepLabels.${currentView}`) }) })
      return
    }
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleSubmitManually = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setAnalysisError(null)
    setAnalysisStage('reviewing')
    setAnalysis({
      speciesId: 'unknown',
      speciesName: 'Unknown Species',
      confidence: 0,
      estimatedCW: null,
      estimatedBW: null,
      gender: 'unknown',
      maturationStatus: 'unknown',
      detectedCoin: null,
      coinConfidence: 0,
      suggestions: ['AI analysis failed. Please fill in all fields manually.'],
      rawAnalysis: '',
    })
    setReview({
      speciesId: '',
      cw: '',
      bw: '',
      gender: 'unknown',
      maturationStatus: 'unknown',
      lat: '',
      lng: '',
      locationMethod: 'manual',
      notes: '',
    })
    setFlash({ tone: 'info', text: t('manualEntry') })
  }

  const runAnalysis = async () => {
    if (!requiredComplete) return
    setAnalysisError(null)
    setAnalysisStage('uploading')
    setBusyMessage(t('uploading'))
    setElapsed(0)

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    try {
      const files: File[] = capturedEntries.map((entry, index) =>
        dataUrlToFile(entry.uri as string, `${entry.key}-${index + 1}.jpg`)
      )
      const views: PhotoView[] = capturedEntries.map((entry) => entry.key)

      const upload = await api.uploadAnalysisPhotos(files, uploadSessionId)
      setUploadedPhotoUrls(upload.blobUrls)

      setAnalysisStage('identifying')
      setBusyMessage(t('identifying'))
      const result = await api.analyzeCrab({
        photoUrls: upload.blobUrls,
        views,
        coinType: coinType || undefined,
      })

      if (timerRef.current) clearInterval(timerRef.current)

      const matchSpecies = findSpeciesMatch(result, species)
      setAnalysisStage('reviewing')
      setAnalysis(result)
      setReview((prev) => ({
        ...prev,
        speciesId: matchSpecies?.id || (isUuid(result.speciesId) ? result.speciesId : ''),
        cw: result.estimatedCW != null ? String(result.estimatedCW) : '',
        gender: normalizeGender(result.gender),
        maturationStatus: normalizeMaturation(result.maturationStatus),
      }))
      setFlash({ tone: 'success', text: t('analysisComplete', { elapsed: formatElapsed(elapsed) }) })
    } catch (error) {
      if (timerRef.current) clearInterval(timerRef.current)
      const message = error instanceof Error ? error.message : 'Analysis failed'
      setAnalysisError(message)
      setAnalysisStage('idle')
      setFlash({ tone: 'error', text: message })
    } finally {
      setBusyMessage(null)
    }
  }

  const submitObservation = async () => {
    setSubmitError(null)
    if (!analysis) return

    const rawCw = review.cw.trim()
    const rawBw = review.bw.trim()
    const cw = Number(review.cw)
    const bw = Number(review.bw)
    const lat = Number(review.lat)
    const lng = Number(review.lng)

    if (!isUuid(review.speciesId)) { setSubmitError(t('speciesInvalid')); return }
    if (!hasAtMostTwoDecimalPlaces(rawCw)) { setSubmitError(t('cwInvalid')); return }
    if (!Number.isFinite(cw) || cw <= 0) { setSubmitError(t('cwInvalid')); return }
    if (rawBw && !hasAtMostTwoDecimalPlaces(rawBw)) { setSubmitError(t('bwInvalid')); return }
    if (review.bw && (!Number.isFinite(bw) || bw <= 0)) { setSubmitError(t('bwInvalid')); return }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setSubmitError(t('latLngInvalid')); return
    }

    let previousLevel: number | null = null
    let previousXP: number | null = null

    try {
      try {
        const stats = await api.getMyStats()
        previousLevel = stats.stats.level
        previousXP = stats.stats.totalXP
      } catch { /* non-blocking */ }

      setBusyMessage(t('submitting'))
      await api.createObservation({
        speciesId: review.speciesId,
        cw,
        bw: bw || undefined,
        gender: review.gender,
        maturationStatus: review.maturationStatus,
        lat,
        lng,
        locationMethod: review.locationMethod,
        photos: uploadedPhotoUrls,
        uploadSessionId,
        detectedCoin: coinType || analysis?.detectedCoin || null,
        notes: review.notes || undefined,
      })

      try {
        const newStats = await api.getMyStats()
        if (previousLevel !== null && newStats.stats.level > previousLevel) {
          setFlash({ tone: 'success', text: t('levelUp', { level: newStats.stats.level, title: newStats.stats.title }) })
        } else if (previousXP !== null && newStats.stats.totalXP > previousXP) {
          const xpEarned = newStats.stats.totalXP - previousXP
          setFlash({ tone: 'success', text: t('xpEarned', { xp: xpEarned }) })
        }
      } catch { /* non-blocking */ }

      setAnalysisStage('idle')
      setSubmitted(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('submitFailed')
      setSubmitError(message)
      setFlash({ tone: 'error', text: message })
    } finally {
      setBusyMessage(null)
    }
  }

  const handlePhotoFullscreen = (uri: string) => {
    setFullscreenPhoto(uri)
    setShowFullscreen(true)
  }

  const onMapClick = (lat: number, lng: number) => {
    setReview((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6), locationMethod: 'manual' }))
    setMapViewport((prev) => ({ ...prev, latitude: lat, longitude: lng, zoom: Math.max(prev.zoom, 10) }))
  }

  const onBackToCapture = () => {
    setAnalysis(null)
    setUploadedPhotoUrls([])
    setAnalysisStage('idle')
    setSubmitError(null)
  }

  if (submitted) {
    return (
      <div className="card text-center py-12">
        <div className="text-green-500 mb-4">
          <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ocean-900 mb-2">{t('submitted')}</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {t('submittedDesc')}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={resetState}
          aria-label={t('captureAnother')}
        >
          {t('captureAnother')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {flash && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            flash.tone === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
              : flash.tone === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-ocean-50 text-ocean-700 border border-ocean-200'
          }`}
          role="alert"
        >
          {flash.text}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-ocean-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600">
          {inReview ? t('inReview') : t('stepOf', { current: currentStep + 1, total: CAPTURE_STEPS.length })}
        </p>
      </div>

      {currentView !== 'carapace-closeup' && !inReview && !analysisError && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-sm font-semibold text-ocean-800 mb-1">{t('photoTips')}</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            <li>{t('tipCoin')}</li>
            <li>{t('tipFrame')}</li>
            <li>{t('tipLight')}</li>
            <li>{t('tipSteady')}</li>
          </ul>
          <button
            type="button"
            className="text-xs font-semibold text-ocean-600 hover:text-ocean-800 mt-2 flex items-center gap-1"
            onClick={() => setShowTipsModal(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('viewExamples')}
          </button>
        </div>
      )}

      {showTipsModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowTipsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-ocean-900">{t('photoTips')}</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setShowTipsModal(false)}
                aria-label={t('closeExamples')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Image src="/images/capture-tips/dorsal.jpg" alt={t('dorsalExample')} width={600} height={300} className="w-full rounded-xl object-cover" />
                <p className="text-sm text-gray-600 mt-1 text-center">{t('dorsalExample')}</p>
              </div>
              <div>
                <Image src="/images/capture-tips/ventral.jpg" alt={t('ventralExample')} width={600} height={300} className="w-full rounded-xl object-cover" />
                <p className="text-sm text-gray-600 mt-1 text-center">{t('ventralExample')}</p>
              </div>
              <div>
                <Image src="/images/capture-tips/closeup.png" alt={t('closeupExample')} width={600} height={300} className="w-full rounded-xl object-cover" />
                <p className="text-sm text-gray-600 mt-1 text-center">{t('closeupExample')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(analysisStage !== 'idle' || inReview) && (
        <AnalysisProgress t={t} analysisStage={analysisStage} capturedEntries={capturedEntries} elapsed={elapsed} />
      )}

      {analysisError && (
        <AnalysisErrorCard t={t} analysisError={analysisError} busyMessage={busyMessage} onRetry={runAnalysis} onSubmitManually={handleSubmitManually} />
      )}

      {!inReview && !analysisError && (
        <>
          {!coinSelected && currentStep === 0 && (
            <CoinSelector
              coinType={coinType}
              coinSelected={coinSelected}
              expandedSeries={expandedSeries}
              onCoinSelect={(value) => { setCoinType(value); setCoinSelected(true); setExpandedSeries(null) }}
              onAIDetect={() => { setCoinType(''); setCoinSelected(true) }}
              onExpandSeries={(series) => setExpandedSeries(expandedSeries === series ? null : series)}
              onChangeCoin={() => { setCoinSelected(false); setExpandedSeries(null) }}
            />
          )}

          {coinSelected && currentStep === 0 && (
            <CoinSelector
              coinType={coinType}
              coinSelected={coinSelected}
              expandedSeries={expandedSeries}
              onCoinSelect={(value) => { setCoinType(value); setCoinSelected(true); setExpandedSeries(null) }}
              onAIDetect={() => { setCoinType(''); setCoinSelected(true) }}
              onExpandSeries={(series) => setExpandedSeries(expandedSeries === series ? null : series)}
              onChangeCoin={() => { setCoinSelected(false); setExpandedSeries(null) }}
            />
          )}

          <CameraSection
            currentStep={currentStep}
            currentView={currentView}
            photos={photos}
            cameraActive={cameraActive}
            cameraError={cameraError}
            analyzingView={analyzingView}
            viewWarnings={viewWarnings}
            videoRef={videoRef}
            canvasRef={canvasRef}
            fileInputRef={fileInputRef}
            isLastStep={isLastStep}
            onCapture={capturePhoto}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onFileSelected={onFileSelected}
            onRetake={() => { setPhotos((prev) => ({ ...prev, [currentView]: null })); setViewWarnings([]); setAnalyzingView(false) }}
            onNext={handleNext}
            onPhotoFullscreen={handlePhotoFullscreen}
          />

          <CaptureProgress t={t} photos={photos} />

          {busyMessage && <p className="text-sm text-ocean-700">{busyMessage}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => startTransition(() => setCurrentStep((prev) => Math.max(0, prev - 1)))} disabled={currentStep === 0 || Boolean(busyMessage)} aria-label={t('goBack')}>{t('back')}</button>
            {!isLastStep ? (
              <button type="button" className="btn-primary" disabled={Boolean(busyMessage)} onClick={() => startTransition(handleNext)} aria-label={t('nextCapture')}>{t('nextStep')}</button>
            ) : requiredComplete ? (
              <button type="button" className="btn-primary" disabled={Boolean(busyMessage)} onClick={runAnalysis} aria-label={t('proceedAnalysis')}>{t('analyzeWithAi')}</button>
            ) : undefined}
          </div>
        </>
      )}

      {inReview && analysis && (
        <ReviewSection
          analysis={analysis}
          species={species}
          photos={photos}
          review={review}
          coinType={coinType}
          busyMessage={busyMessage}
          submitError={submitError}
          onReviewChange={setReview}
          onRequestGPS={requestBrowserLocation}
          onBackToCapture={onBackToCapture}
          onSubmit={submitObservation}
          onPhotoFullscreen={handlePhotoFullscreen}
          lat={review.lat}
          lng={review.lng}
          mapViewport={mapViewport}
          onMapClick={onMapClick}
          onViewportChange={setMapViewport}
        />
      )}

      {showFullscreen && fullscreenPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={() => setShowFullscreen(false)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setShowFullscreen(false)} aria-label={t('closeFullscreen')}>
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <Image src={fullscreenPhoto} alt={t('title')} fill unoptimized className="object-contain" />
        </div>
      )}
    </div>
  )
}

function AnalysisProgress({ t, analysisStage, capturedEntries, elapsed }: {
  t: (key: string) => string
  analysisStage: AnalysisStage
  capturedEntries: Array<{ key: string; label: string; uri: string | null }>
  elapsed: number
}) {
  const stages = [
    { key: 'uploading', labelKey: 'analysis.uploading' },
    { key: 'identifying', labelKey: 'analysis.identifying' },
    { key: 'estimating', labelKey: 'analysis.estimating' },
    { key: 'complete', labelKey: 'analysis.complete' }
  ] as const
  const order: Record<string, number> = { uploading: 1, identifying: 2, estimating: 3, complete: 4 }
  const currentOrder = order[analysisStage === 'idle' ? 'uploading' : analysisStage === 'reviewing' ? 'complete' : analysisStage] ?? 1

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {capturedEntries.map((entry, i) => (
          <img key={i} src={entry.uri as string} alt={`${entry.label} thumbnail`} className="w-20 h-20 rounded-lg object-cover" />
        ))}
      </div>
      <div className="flex items-center gap-3">
        {stages.map((step, index) => {
          const stepOrder = order[step.key]
          const isDone = currentOrder > stepOrder
          const isActive = currentOrder === stepOrder
          return (
            <div key={step.key} className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center border ${
                isDone ? 'bg-green-100 border-green-300 text-green-700'
                  : isActive ? 'bg-ocean-100 border-ocean-300 text-ocean-700'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
              }`}>
                {isDone ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : index + 1}
              </div>
              <p className={`text-sm font-medium ${isDone || isActive ? 'text-ocean-800' : 'text-gray-500'}`}>{t(step.labelKey)}</p>
              {index < 3 && <div className={`h-[2px] flex-1 ${currentOrder > stepOrder ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>
      {analysisStage === 'uploading' || analysisStage === 'identifying' || analysisStage === 'estimating' ? (
        <p className="text-xs text-gray-500 mt-2 text-center">{t('analysis.elapsed')}: {formatElapsed(elapsed)}</p>
      ) : null}
    </section>
  )
}

function AnalysisErrorCard({ t, analysisError, busyMessage, onRetry, onSubmitManually }: {
  t: (key: string) => string
  analysisError: string
  busyMessage: string | null
  onRetry: () => void
  onSubmitManually: () => void
}) {
  return (
    <section className="card bg-red-50 border border-red-200">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">{t('analysis.analysisFailed')}</h3>
          <p className="text-sm text-red-600 mt-1">{analysisError}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" className="btn-primary text-sm py-1.5 px-4" onClick={onRetry} disabled={Boolean(busyMessage)} aria-label={t('retryAnalysis')}>{t('analysis.retry')}</button>
            <button type="button" className="btn-secondary text-sm py-1.5 px-4" onClick={onSubmitManually} aria-label={t('submitManual')}>{t('analysis.submitManually')}</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function CaptureProgress({ t, photos }: { t: (key: string) => string; photos: PhotoMap }) {
  return (
    <section className="card">
      <h3 className="text-sm font-semibold text-ocean-800 mb-2">{t('progress')}</h3>
      <ul className="text-sm text-gray-700 space-y-1">
        <li>Dorsal: {photos.dorsal ? t('captured') : t('missing')}</li>
        <li>Ventral: {photos.ventral ? t('captured') : t('missing')}</li>
        <li>Close-up: {photos['carapace-closeup'] ? t('captured') : t('optional')}</li>
      </ul>
    </section>
  )
}
