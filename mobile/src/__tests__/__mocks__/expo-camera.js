const mockCamera = {
  Camera: {
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  },
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}

module.exports = mockCamera
