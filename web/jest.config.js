module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@crabwatch/shared$': '<rootDir>/../shared/src',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        target: 'ES2020',
        lib: ['DOM', 'DOM.Iterable', 'ES2020'],
        moduleResolution: 'node',
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
          '@crabwatch/shared': ['../shared/src'],
        },
      },
      diagnostics: {
        ignoreCodes: [1343, 18028],
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-map-gl|mapbox-gl|mapbox-gl-supported|@mapbox)/)',
  ],
}
