import sharp from 'sharp'
import { isSafeImageUrl } from './urlValidation'
import {
  calculateLaplacianVariance,
  classifyBlurScore,
  DEFAULT_BLUR_THRESHOLDS,
  type QualityIssueCode,
} from '@crabwatch/shared'

// --- EXIF extraction ---

export interface ExifMetadata {
  make?: string
  model?: string
  dateTime?: string
  orientation?: number
  gpsLatitude?: number
  gpsLongitude?: number
}

const EXIF_TAG_MAKE = 0x010f
const EXIF_TAG_MODEL = 0x0110
const EXIF_TAG_DATETIME = 0x0132
const EXIF_TAG_ORIENTATION = 0x0112
const EXIF_TAG_GPSIFD = 0x8825
const GPS_TAG_LATREF = 0x0001
const GPS_TAG_LAT = 0x0002
const GPS_TAG_LONGREF = 0x0003
const GPS_TAG_LONG = 0x0004

function parseExifFromBuffer(buffer: Buffer): ExifMetadata {
  const result: ExifMetadata = {}
  if (!buffer || buffer.length < 10) return result

  let offset = 0
  const isMotorola = buffer.readUInt16BE(0) === 0x4d4d
  const isIntel = buffer.readUInt16BE(0) === 0x4949
  if (!isMotorola && !isIntel) return result

  const readUInt16 = isMotorola ? (o: number) => buffer.readUInt16BE(o) : (o: number) => buffer.readUInt16LE(o)
  const readUInt32 = isMotorola ? (o: number) => buffer.readUInt32BE(o) : (o: number) => buffer.readUInt32LE(o)

  const ifdOffset = readUInt32(4)
  if (ifdOffset >= buffer.length) return result

  const entriesCount = readUInt16(ifdOffset)
  let currentIfd = ifdOffset + 2

  for (let i = 0; i < entriesCount; i++) {
    const entryOffset = currentIfd + i * 12
    if (entryOffset + 12 > buffer.length) break

    const tag = readUInt16(entryOffset)
    const type = readUInt16(entryOffset + 2)
    const count = readUInt32(entryOffset + 4)
    const valueOffset = entryOffset + 8

    switch (tag) {
      case EXIF_TAG_ORIENTATION: {
        result.orientation = type === 3 ? readUInt16(valueOffset) : buffer.readUInt16BE(valueOffset)
        break
      }
      case EXIF_TAG_MAKE:
      case EXIF_TAG_MODEL:
      case EXIF_TAG_DATETIME: {
        if (type === 2 && count >= 1) {
          const strOffset = count <= 4 ? valueOffset : readUInt32(valueOffset)
          const strLen = Math.min(count - 1, 200)
          result[tag === EXIF_TAG_MAKE ? 'make' : tag === EXIF_TAG_MODEL ? 'model' : 'dateTime'] =
            buffer.toString('ascii', strOffset, strOffset + strLen).replace(/\0.*$/, '').trim()
        }
        break
      }
      case EXIF_TAG_GPSIFD: {
        const gpsIfdOffset = readUInt32(valueOffset)
        if (gpsIfdOffset < buffer.length) {
          parseGpsIfd(buffer, gpsIfdOffset, isMotorola, result)
        }
        break
      }
    }
  }

  return result
}

function parseGpsIfd(
  buffer: Buffer,
  ifdOffset: number,
  isMotorola: boolean,
  result: ExifMetadata,
): void {
  const readUInt16 = isMotorola ? (o: number) => buffer.readUInt16BE(o) : (o: number) => buffer.readUInt16LE(o)
  const readUInt32 = isMotorola ? (o: number) => buffer.readUInt32BE(o) : (o: number) => buffer.readUInt32LE(o)

  const entriesCount = readUInt16(ifdOffset)
  let currentIfd = ifdOffset + 2

  let latRef = '', longRef = ''
  let latDms: [number, number, number] | null = null
  let longDms: [number, number, number] | null = null

  for (let i = 0; i < entriesCount; i++) {
    const entryOffset = currentIfd + i * 12
    if (entryOffset + 12 > buffer.length) break

    const tag = readUInt16(entryOffset)
    const type = readUInt16(entryOffset + 2)
    const count = readUInt32(entryOffset + 4)
    const valueOffset = entryOffset + 8

    switch (tag) {
      case GPS_TAG_LATREF:
      case GPS_TAG_LONGREF: {
        if (type === 2 && count >= 2) {
          const strOffset = count <= 4 ? valueOffset : readUInt32(valueOffset)
          const val = buffer.toString('ascii', strOffset, strOffset + count - 1).replace(/\0.*$/, '').trim()
          if (tag === GPS_TAG_LATREF) latRef = val
          else longRef = val
        }
        break
      }
      case GPS_TAG_LAT:
      case GPS_TAG_LONG: {
        if (type === 5 && count === 3) {
          const rationalOffset = readUInt32(valueOffset)
          const dms: [number, number, number] = [0, 0, 0]
          for (let j = 0; j < 3; j++) {
            const ro = rationalOffset + j * 8
            if (ro + 8 <= buffer.length) {
              const num = readUInt32(ro)
              const den = readUInt32(ro + 4)
              dms[j] = den > 0 ? num / den : 0
            }
          }
          if (tag === GPS_TAG_LAT) latDms = dms
          else longDms = dms
        }
        break
      }
    }
  }

  if (latDms) {
    let lat = latDms[0] + latDms[1] / 60 + latDms[2] / 3600
    if (latRef === 'S') lat = -lat
    result.gpsLatitude = Math.round(lat * 1e6) / 1e6
  }
  if (longDms) {
    let lng = longDms[0] + longDms[1] / 60 + longDms[2] / 3600
    if (longRef === 'W') lng = -lng
    result.gpsLongitude = Math.round(lng * 1e6) / 1e6
  }
}

export async function extractExifMetadata(imageBuffer: Buffer): Promise<ExifMetadata> {
  try {
    const metadata = await sharp(imageBuffer).metadata()
    const exifBuffer = metadata.exif
    if (!exifBuffer || exifBuffer.length < 10) return {}
    return parseExifFromBuffer(exifBuffer)
  } catch {
    return {}
  }
}

export function formatExifNotes(exif: ExifMetadata): string | null {
  const parts: string[] = []
  if (exif.make || exif.model) {
    parts.push(`Camera: ${[exif.make, exif.model].filter(Boolean).join(' ')}`)
  }
  if (exif.dateTime) {
    parts.push(`Date: ${exif.dateTime}`)
  }
  if (exif.gpsLatitude != null && exif.gpsLongitude != null) {
    parts.push(`GPS: ${exif.gpsLatitude}, ${exif.gpsLongitude}`)
  }
  return parts.length > 0 ? parts.join(' | ') : null
}

export interface ServerImageQualityResult {
  blurScore: number
  brightness: number
  blurStatus: 'fail' | 'warn' | 'pass'
  brightnessStatus: 'fail' | 'warn' | 'pass'
  issues: QualityIssueCode[]
}

interface BoundingBoxLike {
  x: number
  y: number
  width: number
  height: number
}

interface PixelBox {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toPixelBox(boundingBox: BoundingBoxLike, dimensions: { width: number; height: number }): PixelBox | null {
  const { x, y, width, height } = boundingBox
  if (![x, y, width, height].every((value) => Number.isFinite(value))) {
    return null
  }
  if (width <= 0 || height <= 0 || dimensions.width <= 0 || dimensions.height <= 0) {
    return null
  }

  const looksNormalized = x >= 0 && y >= 0 && width <= 1 && height <= 1
  const pixelX = looksNormalized ? x * dimensions.width : x
  const pixelY = looksNormalized ? y * dimensions.height : y
  const pixelWidth = looksNormalized ? width * dimensions.width : width
  const pixelHeight = looksNormalized ? height * dimensions.height : height

  if (pixelWidth <= 0 || pixelHeight <= 0) {
    return null
  }

  const clampedX = clamp(pixelX, 0, dimensions.width)
  const clampedY = clamp(pixelY, 0, dimensions.height)
  const clampedWidth = clamp(pixelWidth, 1, Math.max(1, dimensions.width - clampedX))
  const clampedHeight = clamp(pixelHeight, 1, Math.max(1, dimensions.height - clampedY))

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  }
}

export async function createCroppedImageDataUrlFromUrl(
  imageUrl: string,
  boundingBox: BoundingBoxLike,
): Promise<string | null> {
  const sourceBuffer = await fetchImageBuffer(imageUrl)
  const pipeline = sharp(sourceBuffer).rotate()
  const metadata = await pipeline.metadata()
  if (!metadata.width || !metadata.height) {
    return null
  }

  const pixel = toPixelBox(boundingBox, { width: metadata.width, height: metadata.height })
  if (!pixel) {
    return null
  }

  const left = Math.max(0, Math.floor(pixel.x))
  const top = Math.max(0, Math.floor(pixel.y))
  const width = Math.max(1, Math.floor(pixel.width))
  const height = Math.max(1, Math.floor(pixel.height))

  const cropped = await pipeline
    .extract({ left, top, width, height })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()

  return `data:image/jpeg;base64,${cropped.toString('base64')}`
}

export function computeAutoCropBoundingBox(
  boundingBox: BoundingBoxLike,
  dimensions: { width: number; height: number },
  paddingRatio = 0.12,
): BoundingBoxLike | null {
  const pixel = toPixelBox(boundingBox, dimensions)
  if (!pixel) {
    return null
  }

  const padX = pixel.width * paddingRatio
  const padY = pixel.height * paddingRatio

  const left = clamp(pixel.x - padX, 0, dimensions.width)
  const top = clamp(pixel.y - padY, 0, dimensions.height)
  const right = clamp(pixel.x + pixel.width + padX, 0, dimensions.width)
  const bottom = clamp(pixel.y + pixel.height + padY, 0, dimensions.height)

  const cropWidth = right - left
  const cropHeight = bottom - top
  if (cropWidth <= 1 || cropHeight <= 1) {
    return null
  }

  return {
    x: Math.round((left / dimensions.width) * 10000) / 10000,
    y: Math.round((top / dimensions.height) * 10000) / 10000,
    width: Math.round((cropWidth / dimensions.width) * 10000) / 10000,
    height: Math.round((cropHeight / dimensions.height) * 10000) / 10000,
  }
}

function evaluateBrightness(brightness: number): 'fail' | 'warn' | 'pass' {
  if (!Number.isFinite(brightness) || brightness < 0.15) {
    return 'fail'
  }
  if (brightness < 0.4 || brightness > 0.8) {
    return 'warn'
  }
  return 'pass'
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  if (!isSafeImageUrl(imageUrl)) {
    throw new Error(`Blocked unsafe image URL: ${imageUrl.slice(0, 100)}`)
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Server quality check image fetch timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getImageDimensionsFromUrl(imageUrl: string): Promise<{ width: number; height: number } | null> {
  const sourceBuffer = await fetchImageBuffer(imageUrl)
  const metadata = await sharp(sourceBuffer).rotate().metadata()
  if (!metadata.width || !metadata.height) {
    return null
  }
  return { width: metadata.width, height: metadata.height }
}

export function computeBoundingBoxCoveragePct(
  boundingBox: BoundingBoxLike,
  dimensions: { width: number; height: number },
): number | null {
  const pixel = toPixelBox(boundingBox, dimensions)
  if (!pixel) {
    return null
  }

  const coverage = (pixel.width * pixel.height) / (dimensions.width * dimensions.height) * 100

  if (!Number.isFinite(coverage) || coverage < 0) {
    return null
  }

  return Math.max(0, Math.min(100, Math.round(coverage * 100) / 100))
}

export async function assessServerImageQualityFromUrl(imageUrl: string): Promise<ServerImageQualityResult> {
  const sourceBuffer = await fetchImageBuffer(imageUrl)

  const { data, info } = await sharp(sourceBuffer)
    .rotate()
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (!info.width || !info.height || info.channels < 3) {
    return {
      blurScore: 0,
      brightness: 0,
      blurStatus: 'fail',
      brightnessStatus: 'fail',
      issues: ['QUALITY_BLUR_FAIL', 'QUALITY_BRIGHTNESS_FAIL'],
    }
  }

  const luminance = new Uint8Array(info.width * info.height)
  let sum = 0

  for (let i = 0, p = 0; p < luminance.length; p += 1, i += info.channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    luminance[p] = y
    sum += y
  }

  const brightness = luminance.length > 0 ? sum / luminance.length / 255 : 0
  const blurScore = calculateLaplacianVariance(luminance, info.width, info.height)
  const blurStatus = classifyBlurScore(blurScore, DEFAULT_BLUR_THRESHOLDS)
  const brightnessStatus = evaluateBrightness(brightness)

  const issues: QualityIssueCode[] = []
  if (blurStatus === 'fail') {
    issues.push('QUALITY_BLUR_FAIL')
  }
  if (brightnessStatus === 'fail') {
    issues.push('QUALITY_BRIGHTNESS_FAIL')
  }

  return {
    blurScore,
    brightness,
    blurStatus,
    brightnessStatus,
    issues,
  }
}
