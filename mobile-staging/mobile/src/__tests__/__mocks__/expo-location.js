const mockLocation = {
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 3.1390,
      longitude: 101.6869,
      accuracy: 5,
      altitude: 10,
      speed: 0,
      heading: 0,
    },
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({
    remove: jest.fn(),
  }),
  Accuracy: {
    High: 0,
    Balanced: 1,
    Low: 2,
  },
}

module.exports = mockLocation
