const React = require('react')

const createMockComponent = (name) => {
  const MockComponent = React.forwardRef((props, ref) => {
    return React.createElement('div', {
      ref,
      'data-testid': props['testID'] || props.testId,
      role: props.accessibilityRole,
      style: props.style,
    }, props.children)
  })
  MockComponent.displayName = name
  return MockComponent
}

const mockSafeAreaContext = {
  SafeAreaView: createMockComponent('SafeAreaView'),
  SafeAreaProvider: createMockComponent('SafeAreaProvider'),
  SafeAreaConsumer: createMockComponent('SafeAreaConsumer'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  initialWindowMetrics: {
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: 390, height: 844 },
  },
}

module.exports = mockSafeAreaContext
