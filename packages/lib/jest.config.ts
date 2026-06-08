import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest', // 🔥 ESTA LÍNEA ES LA CLAVE
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.entity.ts',
    '!src/entities/**',
    '!src/app.controller.ts',
    '!src/app.service.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  coverageDirectory: 'coverage',
};

export default config;
