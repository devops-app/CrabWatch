import { useEffect, useRef, useState, useCallback } from 'react'
import { Gyroscope } from 'expo-sensors'
import * as FileSystem from 'expo-file-system'
import { photoService } from '../services/photoService'

type GyroscopeSubscription = ReturnType<typeof Gyroscope.addListener>

export type CaptureMessageKey =
  | 'focusLocked'
  | 'lightingTooDark'
  | 'lightingLow'
  | 'lightingTooBright'
  | 'holdStill'
  | 'holdSteadier'

interface CaptureQuality {
  isSteady: boolean
  isWellLit: boolean
  isFocused: boolean
  overallReady: boolean
  shakeLevel: 'none' | 'slight' | 'heavy'
  brightnessLevel: 'dark' | 'low' | 'good' | 'bright'
  messages: CaptureMessageKey[]
}

/**
 * Derive `messages` in a fixed priority order from quality booleans.
 * Three independent updaters (focus, brightness, motion) previously mutated
 * a shared array — final order depended on which updater ran last, causing
 * frame-to-frame list reordering and UI flicker.
 */
function deriveMessages(
  isFocused: boolean,
  brightnessLevel: CaptureQuality['brightnessLevel'],
  shakeLevel: CaptureQuality['shakeLevel'],
): CaptureMessageKey[] {
  const messages: CaptureMessageKey[] = []
  if (!isFocused) messages.push('focusLocked')
  if (brightnessLevel === 'dark') messages.push('lightingTooDark')
  else if (brightnessLevel === 'low') messages.push('lightingLow')
  else if (brightnessLevel === 'bright') messages.push('lightingTooBright')
  if (shakeLevel === 'heavy') messages.push('holdStill')
  else if (shakeLevel === 'slight') messages.push('holdSteadier')
  return messages
}

// Optimistic defaults — camera auto-focuses on mount; first frame sample corrects if wrong.
const DEFAULT_QUALITY: CaptureQuality = {
  isSteady: true,
  isWellLit: true,
  isFocused: true,
  overallReady: true,
  shakeLevel: 'none',
  brightnessLevel: 'good',
  messages: [],
}

export function useCaptureAssistance() {
  const [quality, setQuality] = useState<CaptureQuality>(DEFAULT_QUALITY)
  const gyroSubRef = useRef<GyroscopeSubscription | null>(null)
  const motionHistoryRef = useRef<number[]>([])
  const isMountedRef = useRef(true)

  // Periodic sampling state — hook owns the full sensor lifecycle.
  // `samplingActive` is state (not a ref) so the interval effect re-runs when toggled.
  // The callback itself stays in a ref to avoid re-creating the interval on consumer re-renders.
  const [samplingActive, setSamplingActive] = useState(false)
  const sampleFrameFnRef = useRef<(() => Promise<void>) | null>(null)
  const tickInFlightRef = useRef(false)

  const setFocused = useCallback(
    (focused: boolean) => {
      setQuality((prev) => {
        const overallReady = focused && prev.isSteady && prev.isWellLit
        const messages = deriveMessages(focused, prev.brightnessLevel, prev.shakeLevel)
        if (prev.isFocused === focused && prev.overallReady === overallReady) return prev
        return { ...prev, isFocused: focused, overallReady, messages }
      })
    },
    [],
  )

  const setBrightness = useCallback(
    (level: CaptureQuality['brightnessLevel']) => {
      setQuality((prev) => {
        const isWellLit = level === 'good'
        const overallReady = isWellLit && prev.isSteady && prev.isFocused
        const messages = deriveMessages(prev.isFocused, level, prev.shakeLevel)
        if (prev.brightnessLevel === level && prev.overallReady === overallReady) return prev
        return { ...prev, isWellLit, brightnessLevel: level, overallReady, messages }
      })
    },
    [],
  )

  const processMotion = useCallback(
    (data: { x: number; y: number; z: number }) => {
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2)
      const history = motionHistoryRef.current
      history.push(magnitude)
      if (history.length > 20) history.shift()

      if (history.length >= 10) {
        const recent = history.slice(-10)
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length
        const variance = recent.reduce((sum, val) => sum + (val - mean) ** 2, 0) / recent.length
        const stdDev = Math.sqrt(variance)

        // expo-sensors Gyroscope reports angular velocity in rad/s.
        // Handheld phone: steady ≈ 0.02–0.2 rad/s, noticeable shake ≈ 0.5–2 rad/s.
        // Previous thresholds (6 / 15) were calibrated for accelerometer m/s² — steadiness
        // detection never fired. These values restore functional shake detection.
        let shakeLevel: CaptureQuality['shakeLevel'] = 'none'
        let isSteady = true

        if (stdDev > 0.8) {
          shakeLevel = 'heavy'
          isSteady = false
        } else if (stdDev > 0.3) {
          shakeLevel = 'slight'
        }

        setQuality((prev) => {
          if (prev.isSteady === isSteady && prev.shakeLevel === shakeLevel) return prev
          const messages = deriveMessages(prev.isFocused, prev.brightnessLevel, shakeLevel)
          const overallReady = isSteady && prev.isWellLit && prev.isFocused
          return { ...prev, isSteady, shakeLevel, overallReady, messages }
        })
      }
    },
    [],
  )

  const sampleBrightnessFromUri = useCallback(
    async (uri: string) => {
      try {
        const qualityResult = await photoService.assessImageQuality(uri)
        // Guard against setState after unmount — async sample may resolve
        // after the camera closes and the component unmounts.
        if (!isMountedRef.current) return
        setBrightness(qualityResult.brightnessLevel)
        // blurStatus 'warn' still counts as focused — a slightly shaken but
        // optically focused frame reads as "focused". Acceptable proxy.
        setFocused(qualityResult.blurStatus !== 'fail')
      } catch {
        // Ignore frame sampling errors to keep capture flow responsive
      } finally {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true })
        } catch {
          // Best effort cleanup for sampled frame files
        }
      }
    },
    [setBrightness, setFocused],
  )

  // Gyroscope listener — start on mount, cleanup on unmount
  useEffect(() => {
    Gyroscope.setUpdateInterval(100)
    gyroSubRef.current = Gyroscope.addListener(processMotion)

    return () => {
      gyroSubRef.current?.remove()
      gyroSubRef.current = null
      motionHistoryRef.current = []
    }
  }, [processMotion])

  // Unmount guard — prevent setState after unmount from async sample callbacks
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Periodic brightness re-sampling — hook owns the interval lifecycle.
  // Driven by `samplingActive` state so the effect re-runs when toggled.
  useEffect(() => {
    if (!samplingActive) return

    const SAMPLE_INTERVAL_MS = 3000
    const intervalId = setInterval(async () => {
      // Skip if unmounted, previous tick still in-flight, or callback cleared.
      if (!isMountedRef.current || tickInFlightRef.current || !sampleFrameFnRef.current) return
      tickInFlightRef.current = true
      try {
        await sampleFrameFnRef.current()
      } catch {
        // Ignore periodic sampling errors
      } finally {
        tickInFlightRef.current = false
      }
    }, SAMPLE_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [samplingActive])

  const startSampling = useCallback((sampleFrame: () => Promise<void>) => {
    sampleFrameFnRef.current = sampleFrame
    setSamplingActive(true)
  }, [])

  const stopSampling = useCallback(() => {
    setSamplingActive(false)
    sampleFrameFnRef.current = null
  }, [])

  return {
    quality,
    setFocused,
    setBrightness,
    sampleBrightnessFromUri,
    startSampling,
    stopSampling,
  }
}
