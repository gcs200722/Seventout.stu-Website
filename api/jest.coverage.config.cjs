const baseProject = {
  rootDir: 'src',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
};

module.exports = {
  projects: [
    {
      ...baseProject,
      displayName: 'auth-module',
      testMatch: ['<rootDir>/modules/auth/**/*.spec.ts'],
      collectCoverageFrom: ['<rootDir>/modules/auth/**/*.service.ts'],
      coverageDirectory: '../coverage/auth-module',
      coverageThreshold: {
        global: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
    {
      ...baseProject,
      displayName: 'users-module',
      testMatch: ['<rootDir>/modules/users/**/*.spec.ts'],
      collectCoverageFrom: ['<rootDir>/modules/users/**/*.service.ts'],
      coverageDirectory: '../coverage/users-module',
      coverageThreshold: {
        global: {
          statements: 60,
          branches: 40,
          functions: 60,
          lines: 60,
        },
      },
    },
    {
      ...baseProject,
      displayName: 'categories-module',
      testMatch: ['<rootDir>/modules/categories/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/modules/categories/**/*.service.ts',
        '<rootDir>/modules/categories/**/*.controller.ts',
      ],
      coverageDirectory: '../coverage/categories-module',
      coverageThreshold: {
        global: {
          statements: 70,
          branches: 55,
          functions: 70,
          lines: 70,
        },
      },
    },
    {
      ...baseProject,
      displayName: 'other-modules',
      testMatch: [
        '<rootDir>/modules/storage/**/*.spec.ts',
        '<rootDir>/modules/queue/**/*.spec.ts',
        '<rootDir>/modules/authorization/**/*.spec.ts',
      ],
      collectCoverageFrom: ['<rootDir>/modules/storage/**/*.service.ts'],
      coverageDirectory: '../coverage/other-modules',
      coverageThreshold: {
        global: {
          statements: 40,
          branches: 30,
          functions: 40,
          lines: 40,
        },
      },
    },
  ],
};
