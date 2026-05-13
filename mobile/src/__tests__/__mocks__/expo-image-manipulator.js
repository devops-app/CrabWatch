const mockImageManipulator = {
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file://compressed.jpg',
    width: 1920,
    height: 1080,
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}

module.exports = mockImageManipulator
