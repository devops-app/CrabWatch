import { useEffect, useRef, useState, useCallback } from 'react'
import { Gyroscope, Accelerometer } from 'expo-sensors'

type GyroscopeSubscription = ReturnType<typeof Gyroscope.addListener>
type AccelerometerSubscription = ReturnType<typeof Accelerometer.addListener>

interface CaptureQuality {
  isSteady: boolean
  isWellLit: boolean
  isFocused: boolean
  overallReady: boolean
  shakeLevel: 'none' | 'slight' | 'heavy'
  brightnessLevel: 'dark' | 'low' | 'good' | 'bright'
  messages: string[]
}

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
  const accelSubRef = useRef<AccelerometerSubscription | null>(null)
  const motionHistoryRef = useRef<number[]>([])

  const setFocused = useCallback((focused: boolean) => {
    setQuality((prev) => {
      const messages = prev.messages.filter((m) => m !== 'Focus locked')
      return {
        ...prev,
        isFocused: focused,
        overallReady: focused && prev.isSteady && prev.isWellLit,
        messages: focused ? [...messages, 'Focus locked'] : messages,
      }
    })
  }, [])

  const setBrightness = useCallback((level: CaptureQuality['brightnessLevel']) => {
    setQuality((prev) => {
      const isWellLit = level === 'good' || level === 'bright'
      const messages = prev.messages.filter((m) => !m.startsWith('Lighting'))
      if (level === 'dark') messages.push('Lighting too dark — move to brighter area')
      else if (level === 'low') messages.push('Lighting is low — try near a window')
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
      let motionMsg = ''

      if (stdDev > 15) {
        shakeLevel = 'heavy'
        isSteady = false
        motionMsg = 'Hold still — too much movement'
      } else if (stdDev > 6) {
        shakeLevel = 'slight'
        motionMsg = 'Try to hold steadier'
      }

      setQuality((prev) => {
        const messages = prev.messages.filter(
          (m) => !m.includes('Hold') && !m.includes('steadier') && !m.includes('movement')
        )
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

  const processAccelerometer = useCallback((data: { x: number; y: number; z: number }) => {
    const lightEstimate = Math.max(0, data.z)
    if (lightEstimate > 0.8) setBrightness('bright')
    else if (lightEstimate > 0.4) setBrightness('good')
    else if (lightEstimate > 0.15) setBrightness('low')
    else setBrightness('dark')
  }, [setBrightness])

  useEffect(() => {
    Gyroscope.setUpdateInterval(100)
    Accelerometer.setUpdateInterval(500)

    gyroSubRef.current = Gyroscope.addListener(processMotion)
    accelSubRef.current = Accelerometer.addListener(processAccelerometer)

    return () => {
      gyroSubRef.current?.remove()
      gyroSubRef.current = null
      accelSubRef.current?.remove()
      accelSubRef.current = null
      motionHistoryRef.current = []
    }
  }, [processMotion, processAccelerometer])

  return {
    quality,
    setFocused,
    setBrightness,
  }
}
