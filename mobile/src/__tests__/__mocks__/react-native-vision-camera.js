/**
 * Jest mock for react-native-vision-camera.
 *
 * The real package ships ESM (`export * from ...`) which ts-jest (CommonJS)
 * cannot parse, and it is a native module that has no meaningful behaviour in
 * a jsdom test environment. We stub just enough surface for the capture screen
 * and the live-frame-quality hook to import and render without crashing.
 */
const React = require('react')

const mockCameraRef = {
  focusTo: jest.fn(async () => {}),
}

const mockDevice = {
  id: 'mock-back-camera',
  position: 'back',
  hasFlash: true,
}

const mockPhotoOutput = {
  capturePhotoToFile: jest.fn(async () => ({ filePath: '/tmp/mock-photo.jpg' })),
  capturePhoto: jest.fn(async () => ({ path: '/tmp/mock-photo.jpg' })),
}

const mockFrameOutput = {
  // Opaque handle; the hook only passes it to the <Camera> outputs prop.
}

module.exports = {
  Camera: jest.fn(() => null),
  useCameraDevice: jest.fn(() => mockDevice),
  usePhotoOutput: jest.fn(() => mockPhotoOutput),
  useFrameOutput: jest.fn(() => mockFrameOutput),
  useCameraPermission: jest.fn(() => ({
    status: 'granted',
    hasPermission: true,
    canRequestPermission: false,
    requestPermission: jest.fn(async () => true),
  })),
  // Exposed for tests that need to assert on the camera ref.
  __mockCameraRef: mockCameraRef,
}
