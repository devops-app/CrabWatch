// Mock for react-native
const React = require('react')

const createMockComponent = (name) => {
  const MockComponent = React.forwardRef((props, ref) => {
    return React.createElement('div', {
      'data-testid': props['testID'] || props.testId,
      role: props.accessibilityRole,
      style: props.style,
    }, props.children)
  })
  MockComponent.displayName = name
  return MockComponent
}

module.exports = {
  // Core components
  AppRegistry: { registerConfig: () => {}, runApplication: () => {} },
  View: createMockComponent('View'),
  Text: createMockComponent('Text'),
  ScrollView: createMockComponent('ScrollView'),
  FlatList: React.forwardRef(({ data, renderItem, ListEmptyComponent, children, ...rest }, ref) => {
    const items = data && renderItem ? data.map((item, index) =>
      React.createElement('div', { key: index }, renderItem({ item, index, separators: { highlight: () => {}, unhighlight: () => {}, highlightEnded: () => {}, highlightStart: () => {} } }))
    ) : null
    const empty = (!data || data.length === 0) && ListEmptyComponent ? React.createElement(ListEmptyComponent) : null
    return React.createElement('div', {
      ref,
      'data-testid': rest['testID'] || rest.testId,
      role: rest.accessibilityRole,
      style: rest.style,
    }, items, children, empty)
  }),
  SectionList: createMockComponent('SectionList'),
  Image: createMockComponent('Image'),
  ImageBackground: createMockComponent('ImageBackground'),
  TextInput: React.forwardRef(({ value, placeholder, onChangeText, onBlur, secureTextEntry, keyboardType, ...rest }, ref) => {
    return React.createElement('input', {
      ref,
      value,
      placeholder,
      'data-testid': rest['testID'] || rest.testId,
      onChange: (e) => onChangeText && onChangeText(e.target.value),
      onBlur: (e) => onBlur && onBlur(e),
      type: secureTextEntry ? 'password' : 'text',
    })
  }),
  TouchableOpacity: React.forwardRef((props, ref) => {
    return React.createElement('div', {
      ref,
      'data-testid': props['testID'] || props.testId,
      role: props.accessibilityRole,
      style: props.style,
      onClick: props.onPress,
    }, props.children)
  }),
  Pressable: React.forwardRef((props, ref) => {
    return React.createElement('div', {
      ref,
      'data-testid': props['testID'] || props.testId,
      role: props.accessibilityRole,
      style: props.style,
      onClick: props.onPress,
    }, props.children)
  }),
  TouchableHighlight: createMockComponent('TouchableHighlight'),
  TouchableWithoutFeedback: createMockComponent('TouchabaleWithoutFeedback'),
  Modal: createMockComponent('Modal'),
  SafeAreaView: createMockComponent('SafeAreaView'),
  KeyboardAvoidingView: createMockComponent('KeyboardAvoidingView'),
  StatusBar: createMockComponent('StatusBar'),
  Switch: createMockComponent('Switch'),
  ProgressBar: createMockComponent('ProgressBar'),
  RefreshControl: createMockComponent('RefreshControl'),
  ActivityIndicator: React.forwardRef((props, ref) => {
    return React.createElement('div', {
      ref,
      role: 'progressbar',
      style: props.style,
    })
  }),
  Alert: {
    alert: jest.fn(),
    alertAsync: jest.fn(),
  },
  BackHandler: { exitApp: jest.fn(), addEventListener: () => ({ remove: jest.fn() }) },
  Linking: { openURL: jest.fn(), canOpenURL: jest.fn(), addEventListener: () => ({ remove: jest.fn() }) },
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default, Version: 16 },
  Dimensions: { get: () => ({ width: 375, height: 812 }), addEventListener: () => ({ remove: jest.fn() }) },
  StyleSheet: {
    create: (styles) => styles,
    compose: (...styles) => styles,
    flatten: (style) => style,
  },
  InteractionManager: { runAfterInteractions: (cb) => cb() },
  I18nManager: { allowRTL: false, forceRTL: jest.fn() },
  PixelRatio: { get: () => 2, roundToNearestPixel: (x) => x },
  AppState: { addEventListener: () => ({ remove: jest.fn() }), currentState: 'active' },
  NetInfo: { addEventListener: () => ({ remove: jest.fn() }), fetch: () => Promise.resolve({ isConnected: true }) },

  // Hooks
  useCallback: React.useCallback,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useRef: React.useRef,
  useState: React.useState,
  useContext: React.useContext,
  useReducer: React.useReducer,
  useLayoutEffect: React.useLayoutEffect,

  // Layout
  LayoutAnimation: { configureNext: jest.fn(), presetSpring: {}, presets: {} },
  Animated: {
    View: createMockComponent('Animated.View'),
    Text: createMockComponent('Animated.Text'),
    Image: createMockComponent('Animated.Image'),
    TimingAnimation: class {},
    DecayAnimation: class {},
    SpringAnimation: class {},
    Value: class { constructor(v) { this._value = v } },
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    decay: jest.fn(() => ({ start: jest.fn() })),
    interpolate: jest.fn((cfg) => cfg),
  },

  // GestureResponder
  GestureResponderHandlers: {},

  // NativeModules
  NativeModules: {},
  NativeEventEmitter: jest.fn().mockImplementation(function () {
    return { addListener: jest.fn(() => ({ remove: jest.fn() })) }
  }),

  // Permissions
  PermissionsAndroid: { request: jest.fn(), check: jest.fn() },

  // UI
  ScrollViewComponent: {},
  SwitchIOS: createMockComponent('SwitchIOS'),
  TextInputState: { currentTextInput: null },
  ToastAndroid: { show: jest.fn(), showShort: jest.fn(), showLong: jest.fn() },
  Vibration: { vibrate: jest.fn(), cancel: jest.fn(), isVibrating: jest.fn(() => Promise.resolve(false)) },

  // Accessibility
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: () => ({ remove: jest.fn() }),
  },

  // React exports (for compatibility)
  Children: React.Children,
  Component: React.Component,
  PureComponent: React.PureComponent,
  Fragment: React.Fragment,
  StrictMode: React.StrictMode,
  Profiler: React.Profiler,
  Suspense: React.Suspense,
  createElement: React.createElement,
  cloneElement: React.cloneElement,
  isValidElement: React.isValidElement,
  createFactory: React.createFactory,
  version: '0.74.5',

  // React Native specific exports
  requireNativeComponent: jest.fn(() => createMockComponent('NativeComponent')),
  requireNativeComponents: jest.fn(() => ({})),
  UIManager: {},
  YellowBox: { ignoreWarnings: jest.fn(), showWarning: jest.fn() },
  LogBox: { ignoreLogs: jest.fn(), ignoreAllLogs: jest.fn(), stopImplementation: jest.fn() },
}
