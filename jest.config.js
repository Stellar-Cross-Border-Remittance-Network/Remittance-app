/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@stellar/.*|js-xdr|uint8array-extras|@exodus/bytes|@noble/ed25519|@noble/hashes))',
  ],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  clearMocks: true,
  collectCoverageFrom: [
    // The logic layers the unit suite is responsible for. Screens, navigation
    // and presentational components are excluded deliberately: they are
    // covered by the Detox e2e suite (e2e/) and are not meaningfully
    // unit-testable without a full RN render tree.
    'src/lib/**/*.ts',
    'src/services/**/*.ts',
    'src/queue/**/*.ts',
    'src/store/**/*.ts',
    'src/config/**/*.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      statements: 80,
      branches: 70,
    },
  },
};