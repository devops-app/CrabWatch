module.exports = {
  Ionicons: require('react').forwardRef(({ name, size, color }, ref) => {
    return require('react').createElement('span', {
      ref,
      'data-testid': `icon-${name}`,
      'aria-label': name,
      style: { fontSize: size, color },
      children: '🔷',
    })
  }),
  MaterialIcons: require('react').forwardRef(({ name, size, color }, ref) => {
    return require('react').createElement('span', {
      ref,
      'data-testid': `icon-${name}`,
      'aria-label': name,
      style: { fontSize: size, color },
      children: '🔷',
    })
  }),
  MaterialCommunityIcons: require('react').forwardRef(({ name, size, color }, ref) => {
    return require('react').createElement('span', {
      ref,
      'data-testid': `icon-${name}`,
      'aria-label': name,
      style: { fontSize: size, color },
      children: '🔷',
    })
  }),
  FontAwesome: require('react').forwardRef(({ name, size, color }, ref) => {
    return require('react').createElement('span', {
      ref,
      'data-testid': `icon-${name}`,
      'aria-label': name,
      style: { fontSize: size, color },
      children: '🔷',
    })
  }),
}
