const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

config.watchFolders = [
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../shared'),
]

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
]

config.resolver.unstable_enableSymlinks = true

module.exports = config
