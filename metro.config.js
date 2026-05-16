const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const resolvePackageRoot = (packageName) =>
  path.dirname(require.resolve(`${packageName}/package.json`, { paths: [__dirname, path.resolve(__dirname, 'mobile')] }));

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, 'mobile'),
  path.resolve(__dirname, 'shared'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'mobile/node_modules'),
  path.resolve(__dirname, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  react: resolvePackageRoot('react'),
  'react-native': resolvePackageRoot('react-native'),
  buffer: resolvePackageRoot('buffer'),
  'buffer/': resolvePackageRoot('buffer'),
};

config.resolver.unstable_enableSymlinks = true;

module.exports = config;
