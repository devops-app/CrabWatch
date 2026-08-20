const mockImagePicker = {
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://photo.jpg', width: 1920, height: 1080, type: 'image/jpeg' }],
  }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://photo1.jpg', width: 1920, height: 1080, type: 'image/jpeg' }],
  }),
  MediaTypeOptions: {
    Images: 'images',
    Videos: 'videos',
    ImagesAndVideos: 'imagesAndVideos',
  },
  getCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  getMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
}

module.exports = mockImagePicker
