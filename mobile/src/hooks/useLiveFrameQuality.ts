import { useCallback, useEffect, useRef, useState } from 'react'
import { runOnJS } from 'react-native-worklets'
import { useFrameOutput } from 'react-native-vision-camera'
import type { Frame } from 'react-native-vision-camera'
import { classifyBrightness } from '@crabwatch/shared'
import {
  LIVE_GRID_SIZE,
  LIVE_SAMPLE_INTERVAL_MS,
  classifyLiveFrameMetrics,
  computeLiveFrameMetrics,
  downsampleBgraToLuminance,
} from '../utils/liveFrameQuality'
import type { LiveFrameQuality } from '../utils/liveFrameQuality'

/**
 * Live camera-frame quality analysis for the guided capture screen.
 *
 * A VisionCamera frame-output worklet downsamples each frame to a small
 * luminance grid and computes blur / brightness / framing metrics on the
 * frame-processor thread. Results are throttled (~3 Hz) and delivered to the
 * JS thread, where they are classified and pushed to React state.
 *
 * ADVISORY ONLY: the live result drives the overlay chips and frame glow. It
 * never blocks capture — the post-capture `QualityGateCard` is the
 * authoritative gate. This keeps uncalibrated live thresholds from trapping
 * the user.
 *
 * Returns the `frameOutput` (to pass to `<Camera outputs={[frameOutput]} />`)
 * and the latest `quality` sample (or `null` before the first frame).
 */
export function useLiveFrameQuality(enabled: boolean) {
  const [quality, setQuality] = useState<LiveFrameQuality | null>(null)
  const lastDeliveredAtRef = useRef(0)

  // Throttled delivery on the JS thread. `runOnJS` hands us the raw metrics;
  // we classify here (normal imports are available) and update state at most
  // once per interval.
  const deliver = useCallback((blurScore: number, brightness: number, framingScore: number) => {
    const now = Date.now()
    if (now - lastDeliveredAtRef.current < LIVE_SAMPLE_INTERVAL_MS) return
    lastDeliveredAtRef.current = now

    const result = classifyLiveFrameMetrics(
      { blurScore, brightness, framingScore },
      (b) => classifyBrightness(b),
    )
    setQuality(result)
  }, [])

  const frameOutput = useFrameOutput({
    targetResolution: { width: 640, height: 480 },
    pixelFormat: 'rgb',
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame(frame: Frame) {
      'worklet'
      try {
        if (!frame.isValid) return

        const grid = downsampleBgraToLuminance(
          frame.getPixelBuffer(),
          frame.width,
          frame.height,
          frame.bytesPerRow,
          LIVE_GRID_SIZE,
        )
        if (!grid) return

        const metrics = computeLiveFrameMetrics(grid, LIVE_GRID_SIZE)
        runOnJS(deliver)(metrics.blurScore, metrics.brightness, metrics.framingScore)
      } catch {
        // Never let a frame-processing error stall the camera pipeline.
      } finally {
        // Disposing is mandatory — otherwise the producing pipeline stalls.
        frame.dispose()
      }
    },
  })

  // Reset the sample when the live check is disabled so a stale "ready" state
  // doesn't linger when the camera modal closes.
  useEffect(() => {
    if (!enabled) {
      lastDeliveredAtRef.current = 0
      setQuality(null)
    }
  }, [enabled])

  return { frameOutput, quality }
}
