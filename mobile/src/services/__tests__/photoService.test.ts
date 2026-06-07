import { photoService } from '../photoService'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'

jest.mock('expo-image-picker')
jest.mock('expo-image-manipulator')
jest.mock('expo-file-system')

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockImageManipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>

beforeEach(() => {
  jest.clearAllMocks()
  mockFileSystem.getInfoAsync.mockResolvedValue({
    exists: true,
    uri: 'file://mock.jpg',
    size: 100000,
    isDirectory: false,
    modificationTime: Date.now(),
  })
})

describe('photoService', () => {
  describe('takePhoto', () => {
    it('returns photo URI on success', async () => {
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', width: 1920, height: 1080, type: 'image' as const }],
      })

      const result = await photoService.takePhoto()
      expect(result).toBe('file://photo.jpg')
      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: 'images',
          allowsEditing: true,
          quality: 0.8,
          aspect: [4, 3],
        })
      )
    })

    it('returns null when user cancels', async () => {
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      })

      const result = await photoService.takePhoto()
      expect(result).toBeNull()
    })
  })

  describe('pickFromLibrary', () => {
    it('returns photo URIs on success', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: 'file://photo1.jpg', width: 1920, height: 1080, type: 'image' as const },
          { uri: 'file://photo2.jpg', width: 1920, height: 1080, type: 'image' as const },
        ],
      })

      const result = await photoService.pickFromLibrary()
      expect(result).toEqual(['file://photo1.jpg', 'file://photo2.jpg'])
    })

    it('returns empty array when user cancels', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      })

      const result = await photoService.pickFromLibrary()
      expect(result).toEqual([])
    })

    it('limits results to max parameter', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: 'file://photo1.jpg', width: 100, height: 100 },
          { uri: 'file://photo2.jpg', width: 100, height: 100 },
          { uri: 'file://photo3.jpg', width: 100, height: 100 },
          { uri: 'file://photo4.jpg', width: 100, height: 100 },
          { uri: 'file://photo5.jpg', width: 100, height: 100 },
          { uri: 'file://photo6.jpg', width: 100, height: 100 },
        ],
      })

      const result = await photoService.pickFromLibrary(3)
      expect(result).toEqual(['file://photo1.jpg', 'file://photo2.jpg', 'file://photo3.jpg'])
    })

    it('uses default max of 5', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: 'file://photo1.jpg', width: 100, height: 100 },
          { uri: 'file://photo2.jpg', width: 100, height: 100 },
          { uri: 'file://photo3.jpg', width: 100, height: 100 },
          { uri: 'file://photo4.jpg', width: 100, height: 100 },
          { uri: 'file://photo5.jpg', width: 100, height: 100 },
          { uri: 'file://photo6.jpg', width: 100, height: 100 },
        ],
      })

      const result = await photoService.pickFromLibrary()
      expect(result).toHaveLength(5)
    })
  })

  describe('pickMultiplePhotos', () => {
    it('returns multiple photo URIs on success', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: 'file://photo1.jpg', width: 100, height: 100 },
          { uri: 'file://photo2.jpg', width: 100, height: 100 },
        ],
      })

      const result = await photoService.pickMultiplePhotos()
      expect(result).toEqual(['file://photo1.jpg', 'file://photo2.jpg'])
    })

    it('returns empty array when user cancels', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      })

      const result = await photoService.pickMultiplePhotos()
      expect(result).toEqual([])
    })

    it('limits results to max parameter', async () => {
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: 'file://photo1.jpg', width: 100, height: 100 },
          { uri: 'file://photo2.jpg', width: 100, height: 100 },
          { uri: 'file://photo3.jpg', width: 100, height: 100 },
        ],
      })

      const result = await photoService.pickMultiplePhotos(2)
      expect(result).toEqual(['file://photo1.jpg', 'file://photo2.jpg'])
    })
  })

  describe('compressPhoto', () => {
    it('compresses photo and returns new URI', async () => {
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      })

      const result = await photoService.compressPhoto('file://original.jpg')

      expect(result).toBe('file://compressed.jpg')
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [{ resize: { width: 1920 } }],
        { compress: 0.7, format: 'jpeg' }
      )
    })

    it('uses custom quality', async () => {
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      })

      await photoService.compressPhoto('file://original.jpg', 0.9)

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        expect.any(Array),
        expect.objectContaining({ compress: 0.9 })
      )
    })
  })
})
