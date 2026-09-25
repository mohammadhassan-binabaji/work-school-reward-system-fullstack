import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/*.(spec|test).ts',
    '<rootDir>/test/contract/**/*.ts',
    '<rootDir>/test/integration/**/*.ts',
    '<rootDir>/test/e2e/**/*.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/test/helpers/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 60000,
};

export default config;
