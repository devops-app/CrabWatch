// @ts-nocheck
const ReactNavigation = require('@react-navigation/native')

module.exports = {
  ...ReactNavigation,
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((cb) => cb()),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }) => children,
  useRoute: jest.fn(),
  useTheme: jest.fn(() => ({ colors: { background: '#fff', primary: '#0284c7' } })),
}
