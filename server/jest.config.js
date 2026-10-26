module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Integration tests (src/__tests__/integration) require a live PostgreSQL and
  // hang on connection attempts otherwise. They are skipped by default so
  // `npx jest` stays fast and DB-free. Run them explicitly with:
  //   RUN_INTEGRATION_TESTS=1 npx jest
  testPathIgnorePatterns: [
    '/node_modules/',
    ...(process.env.RUN_INTEGRATION_TESTS
      ? []
      : ['<rootDir>/src/__tests__/integration/']),
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '@crabwatch/shared': '<rootDir>/../shared/src',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 15000,
  maxWorkers: 1,
}
