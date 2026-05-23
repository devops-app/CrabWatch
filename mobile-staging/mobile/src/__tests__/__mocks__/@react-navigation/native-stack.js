const React = require('react')

const MockStack = {
  Navigator: ({ children }) => React.createElement('div', { 'data-testid': 'stack-navigator' }, children),
  Screen: ({ children, name }) => children || React.createElement('div', { 'data-testid': `screen-${name}` }, name),
}

module.exports = {
  createNativeStackNavigator: () => MockStack,
}
