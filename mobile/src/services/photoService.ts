import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'
import { decode as decodeJpeg } from 'jpeg-js'
import {
  calculateLaplacianVariance,
  classifyBlurScore,
  DEFAULT_BLUR_THRESHOLDS,
  rgbaToLuminance,
} from '@crabwatch/shared'
import { base64ToUint8Array } from '../utils/base64'

// EXIF orientation tag (0x0112) — maps to rotation degrees
const EXIF_TAG_ORIENTATION = 0x0112
const EXIF_ORIENTATION_ROTATION: Record<number, number> = {
  3: 180,
  6: 270,
  8: 90,
}

/**
 * Read EXIF orientation from a local file URI by parsing the JPEG binary header.
 * Returns null if no EXIF block found or orientation is default (1).
 */
async function getExifOrientation(uri: string): Promise<number | null> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
    const bytes = base64ToUint8Array(b64)
    if (bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return null
    }

    // Scan JPEG segments for APP1 (0xffe1) + "Exif" marker
    let offset = 2
    while (offset < bytes.length - 2) {
      if (bytes[offset] !== 0xff) break
      const marker = bytes[offset + 1]
      if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) break
      if (marker !== 0xe1) {
        const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3]
        offset += 2 + segLen
        continue
      }
      // APP1 found — check for "Exif\0\0"
      if (offset + 10 > bytes.length) return null
      const exifStr = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
      if (exifStr !== 'Exif') return null

      const isMotorola = bytes[offset + 8] === 0x4d && bytes[offset + 9] === 0x4d
      const isIntel = bytes[offset + 8] === 0x49 && bytes[offset + 9] === 0x49
      if (!isMotorola && !isIntel) return null

      const readU16 = isMotorola
        ? (o: number) => (bytes[o] << 8) | bytes[o + 1]
        : (o: number) => (bytes[o + 1] << 8) | bytes[o]
      const readU32 = isMotorola
        ? (o: number) => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0
        : (o: number) => (bytes[o + 3] << 24) | (bytes[o + 2] << 16) | (bytes[o + 1] << 8) | bytes[o]

      const ifdOffset = readU32(offset + 10)
      const absIfd = offset + 10 + ifdOffset
      if (absIfd + 2 > bytes.length) return null

      const entries = readU16(absIfd)
      for (let i = 0; i < entries; i++) {
        const entry = absIfd + 2 + i * 12
        if (entry + 12 > bytes.length) break
        const tag = readU16(entry)
        if (tag === EXIF_TAG_ORIENTATION) {
          return readU16(entry + 8)
        }
      }
      return null
    }
    return null
  } catch {
    return null
  }
}

/**
 * Apply EXIF orientation rotation to the image so downstream quality checks
 * operate on correctly oriented pixel data.
 */
async function applyExifOrientation(uri: string): Promise<string> {
  const orientation = await getExifOrientation(uri)
  if (orientation == null || orientation === 1) return uri

  const rotation = EXIF_ORIENTATION_ROTATION[orientation]
  if (rotation == null) return uri

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ rotate: rotation }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
  )

  return result.uri
}

/**
 * Ensure the image URI is JPEG. Converts HEIC/HEIF to JPEG via ImageManipulator
 * so the blob stored on Azure and displayed on web is universally decodable.
 * Passes through URIs that are already JPEG/PNG/WebP.
 */
async function ensureJpeg(uri: string): Promise<string> {
  const lower = uri.toLowerCase()
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
    )
    return result.uri
  }
  return uri
}

export const photoService = {
  async normalizeForAnalysis(uri: string): Promise<string> {
    try {
      return await applyExifOrientation(uri)
    } catch {
      return uri
    }
  },

  async takePhoto(): Promise<string | null> {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync()
    if (!cameraPermission.granted) {
      const requested = await ImagePicker.requestCameraPermissionsAsync()
      if (!requested.granted) {
        throw new Error('Camera permission is required to take photos.')
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    })

    if (result.canceled) return null
    return ensureJpeg(result.assets[0].uri)
  },

  async captureGuidedPhoto(): Promise<string | null> {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync()
    if (!cameraPermission.granted) {
      const requested = await ImagePicker.requestCameraPermissionsAsync()
      if (!requested.granted) {
        throw new Error('Camera permission is required to capture guided photos.')
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      aspect: [3, 4],
    })

    if (result.canceled) return null
    return ensureJpeg(result.assets[0].uri)
  },

  async pickFromLibrary(max: number = 5): Promise<string[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8,
    })

    if (result.canceled) return []
    return result.assets.slice(0, max).map((asset) => asset.uri)
  },

  async pickGuidedPhotoFromLibrary(): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      allowsEditing: false,
      quality: 1,
    })

    if (result.canceled) return null
    return ensureJpeg(result.assets[0].uri)
  },

  async pickMultiplePhotos(max: number = 5): Promise<string[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8,
    })

    if (result.canceled) return []
    return result.assets.slice(0, max).map((asset) => asset.uri)
  },

  async compressPhoto(uri: string, quality: number = 0.7): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    )

    return result.uri
  },

  async assessImageQuality(uri: string): Promise<{
    isBlurry: boolean
    meetsMinimum: boolean
    resolution: string
    sharpnessScore: number
    blurStatus: 'fail' | 'warn' | 'pass'
    brightness: number
    brightnessLevel: 'dark' | 'low' | 'good' | 'bright'
    debugError?: string
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (!fileInfo.exists) {
        return {
          isBlurry: true,
          meetsMinimum: false,
          resolution: '0x0',
          sharpnessScore: 0,
          blurStatus: 'fail',
          brightness: 0,
          brightnessLevel: 'dark',
        }
      }

      // EXIF-1: Apply orientation correction before quality checks.
      // Wrapped in try/catch: on iOS a rotate failure (e.g. orientation tag 6/8)
      // must not kill the whole assessment — fall back to the original URI.
      let orientedUri = uri
      try {
        orientedUri = await applyExifOrientation(uri)
      } catch {
        orientedUri = uri
      }

      const resized = await ImageManipulator.manipulateAsync(
        orientedUri,
        [{ resize: { width: 256 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )

      // The `base64` save option is unreliable on some iOS devices (it returns
      // undefined), which produced 0/0% quality scores. Fall back to reading the
      // resized file directly — the same stable FileSystem API already used by
      // getExifOrientation, which works on-device.
      let imageBase64 = resized.base64
      if (!imageBase64) {
        imageBase64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' })
      }

      if (!imageBase64) {
        return {
          isBlurry: true,
          meetsMinimum: false,
          resolution: 'unknown',
          sharpnessScore: 0,
          blurStatus: 'fail',
          brightness: 0,
          brightnessLevel: 'dark',
          debugError: 'no base64 from manipulator or file read',
        }
      }

      const jpegBytes = base64ToUint8Array(imageBase64)
      const decoded = decodeJpeg(jpegBytes, { useTArray: true })
      const luminance = rgbaToLuminance(decoded.data)
      const sharpnessScore = calculateLaplacianVariance(luminance, decoded.width, decoded.height)
      const blurStatus = classifyBlurScore(sharpnessScore, DEFAULT_BLUR_THRESHOLDS)
      const brightness = luminance.length > 0
        ? luminance.reduce((sum, value) => sum + value, 0) / luminance.length / 255
        : 0

      const brightnessLevel: 'dark' | 'low' | 'good' | 'bright' =
        brightness < 0.15 ? 'dark'
          : brightness < 0.4 ? 'low'
            : brightness <= 0.8 ? 'good'
              : 'bright'

      const originalSize = ('size' in fileInfo ? fileInfo.size : 0) || 0

      return {
        isBlurry: blurStatus === 'fail',
        meetsMinimum: originalSize > 50000 && blurStatus !== 'fail' && brightnessLevel !== 'dark',
        resolution: `${decoded.width}x${decoded.height}`,
        sharpnessScore: Math.round(sharpnessScore),
        blurStatus,
        brightness,
        brightnessLevel,
      }
    } catch (error) {
      const debugError = error instanceof Error ? error.message : String(error)
      console.error('[photoService] assessImageQuality failed:', debugError)
      return {
        isBlurry: true,
        meetsMinimum: false,
        resolution: 'unknown',
        sharpnessScore: 0,
        blurStatus: 'fail',
        brightness: 0,
        brightnessLevel: 'dark',
        debugError,
      }
    }
  },
}
