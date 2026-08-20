// @ts-nocheck
// Standalone mock — does NOT require the real @react-navigation/native
// (the real package ships ESM which Jest cannot parse under pnpm).
const mockNavigation = {
  NavigationContainer: ({ children }) => children,
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ params: {}, name: 'Mock', key: 'mock-key' })),
  useIsFocused: jest.fn(() => true),
  useFocusEffect: jest.fn(),
  useTheme: jest.fn(() => ({ colors: { background: '#fff', primary: '#0284c7' } })),
  createNavigationContainerRef: jest.fn(() => ({
    current: null,
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
    dispatch: jest.fn(),
  })),
  CommonActions: {
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
  },
  DefaultTheme: {
    colors: { background: '#fff', card: '#fff', text: '#000', primary: '#0284c7', border: '#e0e0e0' },
    fonts: { regular: { fontSize: 14 }, medium: { fontSize: 14 }, bold: { fontSize: 14 } },
  },
  DarkTheme: {
    colors: { background: '#000', card: '#121212', text: '#fff', primary: '#4da3ff', border: '#333' },
    fonts: { regular: { fontSize: 14 }, medium: { fontSize: 14 }, bold: { fontSize: 14 } },
  },
}

module.exports = mockNavigation
