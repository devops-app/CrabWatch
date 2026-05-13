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
}

module.exports = mockImagePicker
