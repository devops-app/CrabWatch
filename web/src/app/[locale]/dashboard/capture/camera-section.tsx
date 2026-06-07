'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { PhotoView } from '@crabwatch/shared'
import { CAPTURE_STEPS } from './utils'

interface CameraSectionProps {
  currentStep: number
  currentView: PhotoView
  photos: Record<PhotoView, string | null>
  cameraActive: boolean
  cameraError: string | null
  webcamWarning: string | null
  analyzingView: boolean
  viewWarnings: string[]
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isLastStep: boolean
  onCapture: () => void
  onStartCamera: () => void
  onStopCamera: () => void
  onFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRetake: () => void
  onNext: () => void
  onPhotoFullscreen: (uri: string) => void
}

export function CameraSection({
  currentStep,
  currentView,
  photos,
  cameraActive,
  cameraError,
  webcamWarning,
  analyzingView,
  viewWarnings,
  videoRef,
  canvasRef,
  fileInputRef,
  isLastStep,
  onCapture,
  onStartCamera,
  onStopCamera,
  onFileSelected,
  onRetake,
  onNext,
  onPhotoFullscreen,
}: CameraSectionProps) {
  const t = useTranslations('capture')
  const current = CAPTURE_STEPS[currentStep]
  const stepLabel = t.raw(`stepLabels.${current.key}`)
  const stepHint = t.raw(`stepHints.${current.key}`)

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ocean-800">{stepLabel}</h2>
        <p className="text-sm text-gray-600">{stepHint}</p>
      </div>

      {photos[currentView] ? (
        <div className="space-y-3">
          <div className="relative w-full h-[420px] rounded-lg bg-black/5 overflow-hidden">
            <Image
              src={photos[currentView] as string}
              alt={`${stepLabel} preview`}
              fill
              unoptimized
              className="object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onPhotoFullscreen(photos[currentView]!)}
            />
            {analyzingView && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 rounded-lg">
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-white text-sm font-medium">{t('camera.checkingView')}</span>
              </div>
            )}
          </div>
          {viewWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">{t('camera.possibleIssue')}</p>
              {viewWarnings.map((warning, i) => (
                <p key={i} className="text-sm text-amber-700">• {warning}</p>
              ))}
              <p className="text-xs text-amber-600 mt-2 italic">{t('camera.aiVerifyHint')}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onRetake} aria-label={t('client.retakePhoto')}>{t('camera.retake')}</button>
            {!isLastStep && <button type="button" className="btn-primary" onClick={onNext} aria-label={t('client.confirmPhoto')}>{t('camera.confirmAndContinue')}</button>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="w-full max-h-[420px] rounded-lg bg-black object-cover" playsInline muted autoPlay />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={onCapture} aria-label={t('camera.takePhoto')}>{t('camera.capture')}</button>
                <button type="button" className="btn-secondary" onClick={onStopCamera} aria-label={t('camera.cancelCamera')}>{t('camera.cancelCamera')}</button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={onStartCamera} aria-label={t('client.openCamera')}>{t('camera.openCamera')}</button>
               <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} aria-label={t('client.uploadFromFile')}>{t('camera.uploadPhoto')}</button>
            </div>
          )}
          {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
          {webcamWarning && <p className="text-sm text-amber-700">{webcamWarning}</p>}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileSelected} />
      <canvas ref={canvasRef} className="hidden" />
    </section>
  )
}
