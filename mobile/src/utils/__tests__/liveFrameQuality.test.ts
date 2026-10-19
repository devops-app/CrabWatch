import {
  LIVE_GRID_SIZE,
  centerEdgeEnergyRatio,
  classifyLiveFrameMetrics,
  computeLiveFrameMetrics,
  downsampleBgraToLuminance,
  laplacianVariance,
  meanLuminance,
} from '../liveFrameQuality'

/** Build a BGRA ArrayBuffer (interleaved [B, G, R, A]) with optional row padding. */
function makeBgra(
  width: number,
  height: number,
  bytesPerRow: number,
  fill: [number, number, number, number],
): ArrayBuffer {
  const buf = new ArrayBuffer(bytesPerRow * height)
  const bytes = new Uint8ClampedArray(buf)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * bytesPerRow + x * 4
      bytes[i] = fill[0]
      bytes[i + 1] = fill[1]
      bytes[i + 2] = fill[2]
      bytes[i + 3] = fill[3]
    }
  }
  return buf
}

describe('liveFrameQuality', () => {
  describe('downsampleBgraToLuminance', () => {
    it('returns null for invalid dimensions', () => {
      const buf = makeBgra(4, 4, 16, [255, 255, 255, 255])
      expect(downsampleBgraToLuminance(buf, 0, 4, 16, 4)).toBeNull()
      expect(downsampleBgraToLuminance(buf, 4, -1, 16, 4)).toBeNull()
    })

    it('returns null when bytesPerRow is too small', () => {
      const buf = makeBgra(4, 4, 16, [255, 255, 255, 255])
      expect(downsampleBgraToLuminance(buf, 4, 4, 8, 4)).toBeNull()
    })

    it('returns null when the buffer is too small', () => {
      const buf = new ArrayBuffer(8)
      expect(downsampleBgraToLuminance(buf, 4, 4, 16, 4)).toBeNull()
    })

    it('downsamples a solid white frame to an all-255 grid', () => {
      const buf = makeBgra(4, 4, 16, [255, 255, 255, 255])
      const grid = downsampleBgraToLuminance(buf, 4, 4, 16, 4)
      expect(grid).not.toBeNull()
      expect(grid!.length).toBe(16)
      for (let i = 0; i < 16; i += 1) expect(grid![i]).toBe(255)
    })

    it('downsamples a solid black frame to an all-0 grid', () => {
      const buf = makeBgra(8, 8, 32, [0, 0, 0, 255])
      const grid = downsampleBgraToLuminance(buf, 8, 8, 32, 4)
      expect(grid).not.toBeNull()
      for (let i = 0; i < 16; i += 1) expect(grid![i]).toBe(0)
    })

    it('respects bytesPerRow row padding', () => {
      // 4px wide but 32 bytes/row (16 bytes of padding per row).
      const buf = makeBgra(4, 4, 32, [255, 255, 255, 255])
      const grid = downsampleBgraToLuminance(buf, 4, 4, 32, 4)
      expect(grid).not.toBeNull()
      for (let i = 0; i < 16; i += 1) expect(grid![i]).toBe(255)
    })
  })

  describe('laplacianVariance', () => {
    it('returns 0 for grids smaller than 3x3', () => {
      const grid = new Uint8Array([10, 20, 30])
      expect(laplacianVariance(grid, 2)).toBe(0)
    })

    it('returns 0 for a flat (uniform) grid', () => {
      const grid = new Uint8Array(16 * 16).fill(128)
      expect(laplacianVariance(grid, 16)).toBe(0)
    })

    it('returns a higher value for an image with a sharp edge', () => {
      const size = 16
      const flat = new Uint8Array(size * size).fill(128)
      const edged = new Uint8Array(size * size)
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          edged[y * size + x] = x < size / 2 ? 0 : 255
        }
      }
      expect(laplacianVariance(edged, size)).toBeGreaterThan(laplacianVariance(flat, size))
    })
  })

  describe('meanLuminance', () => {
    it('returns 0 for an empty grid', () => {
      expect(meanLuminance(new Uint8Array(0), 0)).toBe(0)
    })

    it('returns ~1 for a white grid', () => {
      const grid = new Uint8Array(16 * 16).fill(255)
      expect(meanLuminance(grid, 16)).toBeCloseTo(1, 5)
    })

    it('returns ~0 for a black grid', () => {
      const grid = new Uint8Array(16 * 16).fill(0)
      expect(meanLuminance(grid, 16)).toBe(0)
    })

    it('returns ~0.5 for a mid-gray grid', () => {
      const grid = new Uint8Array(16 * 16).fill(128)
      expect(meanLuminance(grid, 16)).toBeCloseTo(128 / 255, 2)
    })
  })

  describe('centerEdgeEnergyRatio', () => {
    it('returns 0.5 for a flat grid (no edges anywhere)', () => {
      const grid = new Uint8Array(16 * 16).fill(128)
      expect(centerEdgeEnergyRatio(grid, 16)).toBe(0.5)
    })

    it('returns > 0.5 when the center holds a sharp subject', () => {
      const size = 16
      const grid = new Uint8Array(size * size).fill(0)
      // A bright square in the center creates strong edges in the inner box.
      for (let y = 5; y < 11; y += 1) {
        for (let x = 5; x < 11; x += 1) {
          grid[y * size + x] = 255
        }
      }
      expect(centerEdgeEnergyRatio(grid, size)).toBeGreaterThan(0.5)
    })

    it('returns < 0.5 when edges are concentrated at the border', () => {
      const size = 16
      const grid = new Uint8Array(size * size).fill(0)
      // A bright ring near the border creates edges in the outer region.
      for (let y = 1; y < size - 1; y += 1) {
        grid[y * size + 1] = 255
        grid[y * size + (size - 2)] = 255
      }
      for (let x = 1; x < size - 1; x += 1) {
        grid[1 * size + x] = 255
        grid[(size - 2) * size + x] = 255
      }
      expect(centerEdgeEnergyRatio(grid, size)).toBeLessThan(0.5)
    })
  })

  describe('computeLiveFrameMetrics', () => {
    it('combines blur, brightness and framing for a grid', () => {
      const size = LIVE_GRID_SIZE
      const grid = new Uint8Array(size * size).fill(128)
      const metrics = computeLiveFrameMetrics(grid, size)
      expect(metrics.blurScore).toBe(0)
      expect(metrics.brightness).toBeCloseTo(128 / 255, 2)
      expect(metrics.framingScore).toBe(0.5)
    })
  })

  describe('classifyLiveFrameMetrics', () => {
    const passBrightness = () => 'pass' as const

    it('reports pass + ready when all metrics are good', () => {
      const result = classifyLiveFrameMetrics(
        { blurScore: 500, brightness: 0.5, framingScore: 0.6 },
        passBrightness,
      )
      expect(result.overallStatus).toBe('pass')
      expect(result.ready).toBe(true)
      expect(result.blurStatus).toBe('pass')
      expect(result.framingStatus).toBe('pass')
    })

    it('reports fail + not ready when blur is too low', () => {
      const result = classifyLiveFrameMetrics(
        { blurScore: 10, brightness: 0.5, framingScore: 0.6 },
        passBrightness,
      )
      expect(result.blurStatus).toBe('fail')
      expect(result.overallStatus).toBe('fail')
      expect(result.ready).toBe(false)
    })

    it('propagates a brightness fail from the classifier', () => {
      const result = classifyLiveFrameMetrics(
        { blurScore: 500, brightness: 0.05, framingScore: 0.6 },
        () => 'fail' as const,
      )
      expect(result.brightnessStatus).toBe('fail')
      expect(result.overallStatus).toBe('fail')
      expect(result.ready).toBe(false)
    })

    it('reports warn (but ready) when framing is low', () => {
      const result = classifyLiveFrameMetrics(
        { blurScore: 500, brightness: 0.5, framingScore: 0.3 },
        passBrightness,
      )
      expect(result.framingStatus).toBe('warn')
      expect(result.overallStatus).toBe('warn')
      expect(result.ready).toBe(true)
    })
  })
})
