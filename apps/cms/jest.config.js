/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, types: ['jest', 'node'] }, diagnostics: { warnOnly: false } }] },
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.tmp/', '<rootDir>/.strapi/'],
  testTimeout: 60000,
};
