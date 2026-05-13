import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'

export const photoService = {
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
    return result.assets[0].uri
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
    return result.assets[0].uri
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
    return result.assets[0].uri
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
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (!fileInfo.exists) {
        return { isBlurry: true, meetsMinimum: false, resolution: '0x0', sharpnessScore: 0 }
      }

      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: 0.1, format: ImageManipulator.SaveFormat.JPEG }
      )

      const compressedInfo = await FileSystem.getInfoAsync(manipResult.uri)
      const originalSize = ('size' in fileInfo ? fileInfo.size : 0) || 0
      const compressedSize = ('size' in compressedInfo ? compressedInfo.size : 0) || 0

      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1
      const sharpnessScore = Math.max(0, Math.min(100, (1 - compressionRatio) * 100))

      return {
        isBlurry: sharpnessScore < 20,
        meetsMinimum: originalSize > 50000,
        resolution: `${manipResult.width}x${manipResult.height}`,
        sharpnessScore: Math.round(sharpnessScore),
      }
    } catch {
      return { isBlurry: true, meetsMinimum: false, resolution: 'unknown', sharpnessScore: 0 }
    }
  },
}
