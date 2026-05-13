const React = require('react')

const MockTab = {
  Navigator: ({ children }) => React.createElement('div', { 'data-testid': 'tab-navigator' }, children),
  Screen: ({ children }) => children,
}

module.exports = {
  createBottomTabNavigator: () => MockTab,
}
