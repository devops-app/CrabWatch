'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Map, { Layer, Source } from 'react-map-gl'
import type { CrabAnalysisResult, PhotoView, SpeciesResponse, ViewDetectionResult } from '@crabwatch/shared'
import { api } from '@/lib/api'
import { MALAYSIA_BOUNDS } from '@crabwatch/shared'

const COIN_SERIES = {
  'Third Series (Current)': [
    { label: '5 sen (17.78mm)', value: '5 sen (Third Series, 17.78 mm)' },
    { label: '10 sen (18.80mm)', value: '10 sen (Third Series, 18.80 mm)' },
    { label: '20 sen (20.60mm)', value: '20 sen (Third Series, 20.60 mm)' },
    { label: '50 sen (22.65mm)', value: '50 sen (Third Series, 22.65 mm)' },
  ],
  'Second Series (1989-2011)': [
    { label: '5 sen (16.20mm)', value: '5 sen (Second Series, 16.20 mm)' },
    { label: '10 sen (19.40mm)', value: '10 sen (Second Series, 19.40 mm)' },
    { label: '20 sen (23.59mm)', value: '20 sen (Second Series, 23.59 mm)' },
    { label: '50 sen (27.76mm)', value: '50 sen (Second Series, 27.76 mm)' },
  ],
}

const CAPTURE_STEPS: Array<{ key: PhotoView; label: string; hint: string; required: boolean }> = [
  { key: 'dorsal', label: 'Dorsal View', hint: 'Capture top shell with coin beside crab.', required: true },
  { key: 'ventral', label: 'Ventral View', hint: 'Capture underside for gender ID.', required: true },
  { key: 'carapace-closeup', label: 'Shell Close-up', hint: 'Optional close-up for species details.', required: false },
]

type PhotoMap = Record<PhotoView, string | null>

interface ReviewFormState {
  speciesId: string
  cw: string
  bw: string
  gender: 'male' | 'female' | 'unknown'
  maturationStatus: 'mature' | 'immature' | 'unknown'
  lat: string
  lng: string
  locationMethod: 'gps' | 'manual'
  notes: string
}

interface FlashMessage {
  tone: 'success' | 'error' | 'info'
  text: string
}

type AnalysisStage = 'idle' | 'uploading' | 'identifying' | 'estimating' | 'complete' | 'reviewing'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeSpeciesText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function findSpeciesMatch(result: CrabAnalysisResult, options: SpeciesResponse[]): SpeciesResponse | null {
  if (isUuid(result.speciesId)) {
    const byId = options.find((item) => item.id === result.speciesId)
    if (byId) return byId
  }

  const aiCandidates = [result.speciesName, result.speciesId]
    .map((value) => normalizeSpeciesText(value))
    .filter((value) => value && value !== 'unknown' && value !== 'unknown species')

  if (aiCandidates.length === 0) return null

  const exact = options.find((item) => {
    const scientific = normalizeSpeciesText(item.scientificName)
    const common = normalizeSpeciesText(item.commonName)
    return aiCandidates.some((candidate) => candidate === scientific || candidate === common)
  })
  if (exact) return exact

  const partial = options.find((item) => {
    const scientific = normalizeSpeciesText(item.scientificName)
    const common = normalizeSpeciesText(item.commonName)
    return aiCandidates.some((candidate) => {
      const candidateWords = candidate.split(' ').filter(Boolean)
      const genus = candidateWords[0]
      return scientific.includes(candidate) || common.includes(candidate)
        || candidate.includes(scientific) || candidate.includes(common)
        || (genus ? scientific.includes(genus) : false)
    })
  })

  return partial ?? null
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = /data:(.*?);base64/.exec(header)
  const mime = mimeMatch?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], filename, { type: mime })
}

function normalizeGender(value: string): 'male' | 'female' | 'unknown' {
  const lowered = value.toLowerCase()
  if (lowered === 'male') return 'male'
  if (lowered === 'female') return 'female'
  return 'unknown'
}

function normalizeMaturation(value: string): 'mature' | 'immature' | 'unknown' {
  const lowered = value.toLowerCase()
  if (lowered === 'mature') return 'mature'
  if (lowered === 'immature') return 'immature'
  return 'unknown'
}

function getConfidenceTone(confidence: number): { label: string; className: string } {
  if (confidence >= 0.8) {
    return { label: 'High', className: 'bg-green-100 text-green-700' }
  }
  if (confidence >= 0.5) {
    return { label: 'Medium', className: 'bg-amber-100 text-amber-700' }
  }
  return { label: 'Low', className: 'bg-red-100 text-red-700' }
}

async function analyzeView(
  dataUrl: string,
  expectedView: PhotoView
): Promise<string[]> {
  try {
    const img = new Image()
    img.src = dataUrl
    await new Promise((resolve) => { img.onload = resolve })
    const aspectRatio = img.width / img.height
    const warnings: string[] = []

    if (expectedView === 'dorsal' || expectedView === 'ventral') {
      if (aspectRatio < 0.6 || aspectRatio > 1.5) {
        warnings.push('Frame too narrow/wide — crab may not be centered')
      }
    }

    if (expectedView === 'carapace-closeup') {
      if (aspectRatio > 1.3) {
        warnings.push('Frame too wide — zoom in closer on the shell')
      }
    }

    return warnings
  } catch {
    return []
  }
}

async function detectViewAI(
  file: File,
  expectedView: string
): Promise<ViewDetectionResult> {
  const formData = new FormData()
  formData.append('photo', file, `photo-${Date.now()}.jpg`)

  const response = await fetch('/api/v1/analyze/detect-view', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = (await response.json()) as { success: boolean; data?: ViewDetectionResult; error?: string }
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'View detection failed')
  }
  return data.data!
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

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

export default function WebGuidedCapturePage(): React.JSX.Element {
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
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([])
  const [photos, setPhotos] = useState<PhotoMap>({ dorsal: null, ventral: null, 'carapace-closeup': null })
  const [showFullscreen, setShowFullscreen] = useState(false)
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
    () => CAPTURE_STEPS.map((step) => ({ ...step, uri: photos[step.key] })).filter((step) => Boolean(step.uri)),
    [photos]
  )

  const markerLat = Number.parseFloat(review.lat)
  const markerLng = Number.parseFloat(review.lng)
  const hasMapMarker = Number.isFinite(markerLat) && Number.isFinite(markerLng) && markerLat >= -90 && markerLat <= 90 && markerLng >= -180 && markerLng <= 180
  const selectedPointGeoJson = useMemo(() => {
    if (!hasMapMarker) return null
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [markerLng, markerLat],
        },
        properties: {},
      }],
    } as const
  }, [hasMapMarker, markerLat, markerLng])

  useEffect(() => {
    const loadSpecies = async () => {
      try {
        const data = await api.listSpecies()
        setSpecies(data)
      } catch {
        setSpecies([])
      }
    }
    loadSpecies()
  }, [])

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
        setCameraError('Camera preview failed. Tap Open Camera again or use Upload Photo.')
      }
    }
    attachStream()
  }, [cameraActive])

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
      setCameraError('Camera requires HTTPS. Open via https:// or use Upload Photo.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser does not support camera. Use Upload Photo.')
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
      setCameraError('Unable to access camera. Allow permission or use Upload Photo.')
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
      setCameraError('Camera preview not ready. Wait a second and try again.')
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
      setSubmitError('Geolocation not available.')
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
        setFlash({ tone: 'success', text: 'GPS location captured.' })
      },
      () => {
        setSubmitError('Unable to fetch location. Enter coordinates manually.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleNext = () => {
    if (current.required && !photos[currentView]) return
    if (!coinSelected && currentStep < 2) return
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
    setFlash({ tone: 'info', text: 'Manual entry mode. Fill in all fields.' })
  }

  const runAnalysis = async () => {
    if (!requiredComplete) return
    setAnalysisError(null)
    setAnalysisStage('uploading')
    setBusyMessage('Uploading photos...')
    setElapsed(0)

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    try {
      const files: File[] = capturedEntries.map((entry, index) =>
        dataUrlToFile(entry.uri as string, `${entry.key}-${index + 1}.jpg`)
      )
      const views: PhotoView[] = capturedEntries.map((entry) => entry.key)

      const upload = await api.uploadAnalysisPhotos(files)
      setUploadedPhotoUrls(upload.blobUrls)

      setAnalysisStage('identifying')
      setBusyMessage('Identifying species...')
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
      setFlash({ tone: 'success', text: `AI analysis complete in ${formatElapsed(elapsed)}` })
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

    const cw = Number(review.cw)
    const bw = Number(review.bw)
    const lat = Number(review.lat)
    const lng = Number(review.lng)

    if (!isUuid(review.speciesId)) { setSubmitError('Please select a valid species.'); return }
    if (!Number.isFinite(cw) || cw <= 0) { setSubmitError('Carapace width must be > 0.'); return }
    if (review.bw && (!Number.isFinite(bw) || bw <= 0)) { setSubmitError('Body weight must be > 0.'); return }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setSubmitError('Valid lat/lng required.'); return
    }

    try {
      setBusyMessage('Submitting observation...')
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
        detectedCoin: coinType || analysis?.detectedCoin || null,
        notes: review.notes || undefined,
      })
      setAnalysisStage('idle')
      setSubmitted(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit'
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

  if (submitted) {
    return (
      <div className="card text-center py-12">
        <div className="text-green-500 mb-4">
          <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ocean-900 mb-2">Observation Submitted</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Your AI-assisted observation has been queued for review.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={resetState}
          aria-label="Capture another observation"
        >
          Capture Another
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
        <h1 className="text-3xl font-bold text-ocean-900 mb-2">AI Guided Capture</h1>
        <p className="text-gray-600">
          {inReview ? 'Review AI results and submit' : `Step ${currentStep + 1} of ${CAPTURE_STEPS.length}`}
        </p>
      </div>

      {(analysisStage !== 'idle' || inReview) && (
        <section className="card space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {capturedEntries.map((entry, i) => (
              <img key={i} src={entry.uri as string} alt={`${entry.label} thumbnail`} className="w-20 h-20 rounded-lg object-cover" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {([{ key: 'uploading', label: 'Uploading photos' }, { key: 'identifying', label: 'Identifying species' }, { key: 'estimating', label: 'Estimating size' }, { key: 'complete', label: 'Analysis complete' }] as Array<{ key: 'uploading' | 'identifying' | 'estimating' | 'complete'; label: string }>).map((step, index) => {
              const order: Record<'uploading' | 'identifying' | 'estimating' | 'complete', number> = { uploading: 1, identifying: 2, estimating: 3, complete: 4 }
              const currentOrder = order[analysisStage === 'idle' ? 'uploading' : (analysisStage === 'reviewing' ? 'complete' : analysisStage)]
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
                  <p className={`text-sm font-medium ${isDone || isActive ? 'text-ocean-800' : 'text-gray-500'}`}>{step.label}</p>
                  {index < 3 && <div className={`h-[2px] flex-1 ${currentOrder > stepOrder ? 'bg-green-300' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>
          {analysisStage === 'uploading' || analysisStage === 'identifying' || analysisStage === 'estimating' && (
            <p className="text-xs text-gray-500 mt-2 text-center">Elapsed: {formatElapsed(elapsed)}</p>
          )}
        </section>
      )}

      {analysisError && (
        <section className="card bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Analysis Failed</h3>
              <p className="text-sm text-red-600 mt-1">{analysisError}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" className="btn-primary text-sm py-1.5 px-4" onClick={runAnalysis} disabled={Boolean(busyMessage)} aria-label="Retry AI analysis">Retry</button>
                <button type="button" className="btn-secondary text-sm py-1.5 px-4" onClick={handleSubmitManually} aria-label="Submit observation manually without AI analysis">Submit Manually</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {!inReview && !analysisError && (
        <>
          {!coinSelected && currentStep === 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold text-ocean-800 mb-3">Coin Reference</h2>
              <p className="text-gray-600 mb-4">Select a coin for scale, or let AI detect.</p>

              <button
                type="button"
                className="w-full mb-3 px-4 py-3 rounded-lg border-2 border-amber-300 bg-amber-50 text-left hover:border-amber-400 transition-colors flex items-center gap-2"
                onClick={() => { setCoinType(''); setCoinSelected(true) }}
                aria-label="Let AI detect coin automatically"
              >
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold text-amber-700">Let AI detect</span>
              </button>

              {Object.entries(COIN_SERIES).map(([series, options]) => (
                <div key={series} className="mb-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 hover:border-ocean-300 text-left transition-colors"
                    onClick={() => setExpandedSeries(expandedSeries === series ? null : series)}
                    aria-label={`Toggle ${series} coin options`}
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
                          onClick={() => { setCoinType(option.value); setCoinSelected(true); setExpandedSeries(null) }}
                          className="px-3 py-2 rounded-lg border border-gray-200 hover:border-ocean-400 text-left text-sm transition-colors"
                          aria-label={`Select ${option.label}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {coinSelected && currentStep === 0 && (
            <section className="card flex items-center justify-between gap-4">
              <p className="text-sm text-gray-700">Coin: <span className="font-semibold">{coinType || 'AI detect'}</span></p>
              <button type="button" className="text-ocean-700 text-sm" onClick={() => { setCoinSelected(false); setExpandedSeries(null); }} aria-label="Change coin selection">Change</button>
            </section>
          )}

          <section className="card space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-ocean-800">{current.label}</h2>
              <p className="text-sm text-gray-600">{current.hint}</p>
            </div>

            {currentView !== 'carapace-closeup' && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-semibold text-ocean-800 mb-1">Photo Tips</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>Place the coin flat next to the crab</li>
                  <li>Ensure the entire crab fits in the frame</li>
                  <li>Use natural light when possible</li>
                  <li>Hold your device steady before shooting</li>
                </ul>
              </div>
            )}

            {photos[currentView] ? (
              <div className="space-y-3">
                <div className="relative w-full h-[420px] rounded-lg bg-black/5 overflow-hidden">
                  <Image
                    src={photos[currentView] as string}
                    alt={`${current.label} preview`}
                    fill
                    unoptimized
                    className="object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handlePhotoFullscreen(photos[currentView]!)}
                  />
                  {analyzingView && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 rounded-lg">
                      <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-white text-sm font-medium">Checking view...</span>
                    </div>
                  )}
                </div>
                {viewWarnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                    <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Possible Issue</p>
                    {viewWarnings.map((warning, i) => (
                      <p key={i} className="text-sm text-amber-700">• {warning}</p>
                    ))}
                    <p className="text-xs text-amber-600 mt-2 italic">AI will verify the view during analysis. Retake if unsure.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => { setPhotos((prev) => ({ ...prev, [currentView]: null })); setViewWarnings([]); setAnalyzingView(false); }} aria-label="Retake photo">Retake</button>
                  {!isLastStep && <button type="button" className="btn-primary" onClick={handleNext} aria-label="Confirm photo and continue to next step">Confirm & Continue</button>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} className="w-full max-h-[420px] rounded-lg bg-black object-cover" playsInline muted autoPlay />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary" onClick={capturePhoto} aria-label="Take photo">Capture</button>
                      <button type="button" className="btn-secondary" onClick={stopCamera} aria-label="Cancel camera and return">Cancel Camera</button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary" onClick={startCamera} aria-label="Open camera to take photo">Open Camera</button>
                    <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} aria-label="Upload photo from file">Upload Photo</button>
                  </div>
                )}
                {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileSelected} />
            <canvas ref={canvasRef} className="hidden" />
          </section>

          <section className="card">
            <h3 className="text-sm font-semibold text-ocean-800 mb-2">Progress</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Dorsal: {photos.dorsal ? 'Captured' : 'Missing'}</li>
              <li>Ventral: {photos.ventral ? 'Captured' : 'Missing'}</li>
              <li>Close-up: {photos['carapace-closeup'] ? 'Captured' : 'Optional'}</li>
            </ul>
          </section>

          {busyMessage && <p className="text-sm text-ocean-700">{busyMessage}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))} disabled={currentStep === 0 || Boolean(busyMessage)} aria-label="Go back to previous step">Back</button>
            {!isLastStep ? (
              <button type="button" className="btn-primary" disabled={(current.required && !photos[currentView]) || (!coinSelected && currentStep < 2) || Boolean(busyMessage)} onClick={handleNext} aria-label="Proceed to next capture step">Next Step</button>
            ) : requiredComplete ? (
              <button type="button" className="btn-primary" disabled={Boolean(busyMessage)} onClick={runAnalysis} aria-label="Proceed to AI analysis with captured photos">Analyze with AI</button>
            ) : undefined}
          </div>
        </>
      )}

      {inReview && analysis && (
        <>
          {photos.dorsal && (
            <section className="flex gap-2 overflow-x-auto pb-1">
              {CAPTURE_STEPS.map((step) => photos[step.key] && (
                <img
                  key={step.key}
                  src={photos[step.key]!}
                  alt={`${step.label} thumbnail`}
                  className="w-[70px] h-[70px] rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handlePhotoFullscreen(photos[step.key]!)}
                />
              ))}
            </section>
          )}

          {!analysis.speciesId || analysis.speciesId === 'unknown' || analysis.confidence === 0 ? (
            <section className="card bg-amber-50 border border-amber-200 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">AI analysis unavailable. Please fill in all fields manually.</p>
            </section>
          ) : null}

          <section className="card space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-ocean-800">AI Results</h2>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getConfidenceTone(analysis.confidence).className}`}>
                {getConfidenceTone(analysis.confidence).label} confidence
              </span>
            </div>
            <p className="text-gray-700"><span className="font-semibold">Species:</span> {analysis.speciesName}</p>
            <p className="text-gray-700"><span className="font-semibold">Confidence:</span> {(analysis.confidence * 100).toFixed(1)}%</p>
            {analysis.detectedCoin && (
              <p className="text-gray-700"><span className="font-semibold">Detected coin:</span> {analysis.detectedCoin} ({(analysis.coinConfidence * 100).toFixed(0)}%)</p>
            )}
            {analysis.rawAnalysis && (
              <p className="text-sm text-gray-500 italic">{analysis.rawAnalysis}</p>
            )}
            {analysis.suggestions.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-semibold text-ocean-800 mb-1">AI suggestions</p>
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
                  <p className="text-sm font-semibold text-amber-800">Coin Mismatch</p>
                  <p className="text-sm text-amber-700">You selected <strong>{coinType}</strong> but AI detected <strong>{analysis.detectedCoin}</strong>.</p>
                  <p className="text-xs text-amber-600 mt-1">Verify your coin selection before submitting.</p>
                </div>
              </div>
            </section>
          )}

          <section className="card grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Species{analysis.speciesName && normalizeSpeciesText(analysis.speciesName) !== 'unknown species' && <AIBadge label="AI" />}
              </label>
              <select className="input-field" value={review.speciesId} onChange={(e) => setReview((prev) => ({ ...prev, speciesId: e.target.value }))}>
                <option value="">Select species</option>
                {species.map((s) => <option key={s.id} value={s.id}>{s.commonName} ({s.scientificName})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carapace Width (cm){analysis.estimatedCW && <AIBadge label={`AI: ${analysis.estimatedCW}`} />}
              </label>
              <input className="input-field" value={review.cw} onChange={(e) => setReview((prev) => ({ ...prev, cw: e.target.value }))} placeholder="e.g. 8.5" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Weight (g)</label>
              <input className="input-field" value={review.bw} onChange={(e) => setReview((prev) => ({ ...prev, bw: e.target.value }))} placeholder="Optional - weigh manually" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender{analysis.gender && analysis.gender !== 'unknown' && <AIBadge label={`AI: ${analysis.gender}`} />}
              </label>
              <select className="input-field" value={review.gender} onChange={(e) => setReview((prev) => ({ ...prev, gender: e.target.value as ReviewFormState['gender'] }))}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maturation{analysis.maturationStatus && analysis.maturationStatus !== 'unknown' && <AIBadge label={`AI: ${analysis.maturationStatus}`} />}
              </label>
              <select className="input-field" value={review.maturationStatus} onChange={(e) => setReview((prev) => ({ ...prev, maturationStatus: e.target.value as ReviewFormState['maturationStatus'] }))}>
                <option value="mature">Mature</option>
                <option value="immature">Immature</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Method</label>
              <select className="input-field" value={review.locationMethod} onChange={(e) => setReview((prev) => ({ ...prev, locationMethod: e.target.value as 'gps' | 'manual' }))}>
                <option value="manual">Manual</option>
                <option value="gps">GPS</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pick Location on Map</label>
              <div className="relative w-full h-[300px] rounded-lg overflow-hidden border">
                <Map
                  {...mapViewport}
                  onMove={(e) => setMapViewport(e.viewState)}
                  mapStyle="mapbox://styles/mapbox/light-v11"
                  mapboxAccessToken={process.env.MAPBOX_TOKEN}
                  interactive={true}
                  onClick={(e) => {
                    const { lat, lng } = e.lngLat
                    setReview((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6), locationMethod: 'manual' }))
                    setMapViewport((prev) => ({ ...prev, latitude: lat, longitude: lng, zoom: Math.max(prev.zoom, 10) }))
                  }}
                  attributionControl={false}
                >
                  {selectedPointGeoJson && (
                    <Source id="capture-selected-point" type="geojson" data={selectedPointGeoJson}>
                      <Layer
                        id="capture-selected-point-core"
                        type="circle"
                        paint={{
                          'circle-radius': 7,
                          'circle-color': '#ef4444',
                          'circle-stroke-width': 2,
                          'circle-stroke-color': '#ffffff',
                        }}
                      />
                      <Layer
                        id="capture-selected-point-ring"
                        type="circle"
                        paint={{
                          'circle-radius': 14,
                          'circle-color': '#ef4444',
                          'circle-opacity': 0.25,
                        }}
                      />
                    </Source>
                  )}
                </Map>
               </div>
               {hasMapMarker && (
                 <p className="mt-2 text-xs text-gray-500">Selected: {markerLat.toFixed(6)}, {markerLng.toFixed(6)}</p>
               )}
              </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input className="input-field" value={review.lat} onChange={(e) => setReview((prev) => ({ ...prev, lat: e.target.value }))} placeholder="e.g. 5.4141" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input className="input-field" value={review.lng} onChange={(e) => setReview((prev) => ({ ...prev, lng: e.target.value }))} placeholder="e.g. 100.3288" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea className="input-field min-h-[110px]" value={review.notes} onChange={(e) => setReview((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </section>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          {busyMessage && <p className="text-sm text-ocean-700">{busyMessage}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={requestBrowserLocation} disabled={Boolean(busyMessage)} aria-label="Use browser GPS to get current location">Use Browser GPS</button>
            <button type="button" className="btn-secondary" onClick={() => { setAnalysis(null); setUploadedPhotoUrls([]); setAnalysisStage('idle'); setSubmitError(null) }} disabled={Boolean(busyMessage)} aria-label="Go back and retake photos">Back to Capture</button>
            <button type="button" className="btn-primary" onClick={submitObservation} disabled={Boolean(busyMessage)} aria-label="Submit observation to server">Submit Observation</button>
          </div>
        </>
      )}

      {showFullscreen && fullscreenPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={() => setShowFullscreen(false)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setShowFullscreen(false)} aria-label="Close fullscreen image">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <Image src={fullscreenPhoto} alt="Fullscreen preview" fill unoptimized className="object-contain" />
        </div>
      )}
    </div>
  )
}
