module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  // Os testes de integração partilham a mesma base de dados: correm em série
  maxWorkers: 1,
  testTimeout: 60000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/swagger.config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
};
