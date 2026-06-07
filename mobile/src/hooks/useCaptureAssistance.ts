import { useEffect, useRef, useState, useCallback } from 'react'
import { Gyroscope } from 'expo-sensors'
import * as FileSystem from 'expo-file-system'
import { photoService } from '../services/photoService'

type GyroscopeSubscription = ReturnType<typeof Gyroscope.addListener>

interface CaptureQuality {
  isSteady: boolean
  isWellLit: boolean
  isFocused: boolean
  overallReady: boolean
  shakeLevel: 'none' | 'slight' | 'heavy'
  brightnessLevel: 'dark' | 'low' | 'good' | 'bright'
  messages: CaptureMessageKey[]
}

export type CaptureMessageKey =
  | 'focusLocked'
  | 'lightingTooDark'
  | 'lightingLow'
  | 'lightingTooBright'
  | 'holdStill'
  | 'holdSteadier'

const DEFAULT_QUALITY: CaptureQuality = {
  isSteady: true,
  isWellLit: true,
  isFocused: false,
  overallReady: false,
  shakeLevel: 'none',
  brightnessLevel: 'good',
  messages: [],
}

export function useCaptureAssistance() {
  const [quality, setQuality] = useState<CaptureQuality>(DEFAULT_QUALITY)
  const gyroSubRef = useRef<GyroscopeSubscription | null>(null)
  const motionHistoryRef = useRef<number[]>([])

  const setFocused = useCallback((focused: boolean) => {
    setQuality((prev) => {
      const messages = prev.messages.filter((m) => m !== 'focusLocked') as CaptureMessageKey[]
      return {
        ...prev,
        isFocused: focused,
        overallReady: focused && prev.isSteady && prev.isWellLit,
        messages: focused ? [...messages, 'focusLocked'] : messages,
      }
    })
  }, [])

  const setBrightness = useCallback((level: CaptureQuality['brightnessLevel']) => {
    setQuality((prev) => {
      const isWellLit = level === 'good'
      const messages = prev.messages.filter((m) => m !== 'lightingTooDark' && m !== 'lightingLow' && m !== 'lightingTooBright') as CaptureMessageKey[]
      if (level === 'dark') messages.push('lightingTooDark')
      else if (level === 'low') messages.push('lightingLow')
      else if (level === 'bright') messages.push('lightingTooBright')
      return {
        ...prev,
        isWellLit,
        brightnessLevel: level,
        overallReady: isWellLit && prev.isSteady && prev.isFocused,
        messages,
      }
    })
  }, [])

  const processMotion = useCallback((data: { x: number; y: number; z: number }) => {
    const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2)
    const history = motionHistoryRef.current
    history.push(magnitude)
    if (history.length > 20) history.shift()

    if (history.length >= 10) {
      const recent = history.slice(-10)
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length
      const variance = recent.reduce((sum, val) => sum + (val - mean) ** 2, 0) / recent.length
      const stdDev = Math.sqrt(variance)

      let shakeLevel: CaptureQuality['shakeLevel'] = 'none'
      let isSteady = true
      let motionMsg: CaptureMessageKey | null = null

      if (stdDev > 15) {
        shakeLevel = 'heavy'
        isSteady = false
        motionMsg = 'holdStill'
      } else if (stdDev > 6) {
        shakeLevel = 'slight'
        motionMsg = 'holdSteadier'
      }

      setQuality((prev) => {
        const messages = prev.messages.filter((m) => m !== 'holdStill' && m !== 'holdSteadier') as CaptureMessageKey[]
        if (motionMsg) messages.push(motionMsg)
        return {
          ...prev,
          isSteady,
          shakeLevel,
          overallReady: isSteady && prev.isWellLit && prev.isFocused,
          messages,
        }
      })
    }
  }, [])

  const sampleBrightnessFromUri = useCallback(async (uri: string) => {
    try {
      const qualityResult = await photoService.assessImageQuality(uri)
      setBrightness(qualityResult.brightnessLevel)
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
  }, [setBrightness, setFocused])

  useEffect(() => {
    Gyroscope.setUpdateInterval(100)

    gyroSubRef.current = Gyroscope.addListener(processMotion)

    return () => {
      gyroSubRef.current?.remove()
      gyroSubRef.current = null
      motionHistoryRef.current = []
    }
  }, [processMotion])

  return {
    quality,
    setFocused,
    setBrightness,
    sampleBrightnessFromUri,
  }
}
