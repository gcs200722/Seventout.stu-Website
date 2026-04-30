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
      testMatch: ['<rootDir>/modules/tenant/core/auth/**/*.spec.ts'],
      collectCoverageFrom: ['<rootDir>/modules/tenant/core/auth/**/*.service.ts'],
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
      testMatch: ['<rootDir>/modules/tenant/core/users/**/*.spec.ts'],
      collectCoverageFrom: ['<rootDir>/modules/tenant/core/users/**/*.service.ts'],
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
      testMatch: ['<rootDir>/modules/tenant/extensions/categories/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/modules/tenant/extensions/categories/**/*.service.ts',
        '<rootDir>/modules/tenant/extensions/categories/**/*.controller.ts',
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
      displayName: 'products-module',
      testMatch: ['<rootDir>/modules/tenant/extensions/products/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/modules/tenant/extensions/products/**/*.service.ts',
        '<rootDir>/modules/tenant/extensions/products/**/*.controller.ts',
      ],
      coverageDirectory: '../coverage/products-module',
      coverageThreshold: {
        global: {
          statements: 65,
          branches: 50,
          functions: 65,
          lines: 65,
        },
      },
    },
    {
      ...baseProject,
      displayName: 'cart-module',
      testMatch: ['<rootDir>/modules/tenant/extensions/cart/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/modules/tenant/extensions/cart/**/*.service.ts',
        '<rootDir>/modules/tenant/extensions/cart/**/*.controller.ts',
      ],
      coverageDirectory: '../coverage/cart-module',
      coverageThreshold: {
        global: {
          statements: 65,
          branches: 50,
          functions: 65,
          lines: 65,
        },
      },
    },
    {
      ...baseProject,
      displayName: 'inventory-module',
      testMatch: ['<rootDir>/modules/tenant/extensions/inventory/**/*.spec.ts'],
      collectCoverageFrom: [
        '<rootDir>/modules/tenant/extensions/inventory/**/*.service.ts',
        '<rootDir>/modules/tenant/extensions/inventory/**/*.controller.ts',
        '<rootDir>/modules/tenant/extensions/inventory/**/*.webhook.service.ts',
      ],
      coverageDirectory: '../coverage/inventory-module',
      coverageThreshold: {
        global: {
          statements: 60,
          branches: 45,
          functions: 60,
          lines: 60,
        },
      },
    },
    {
      ...baseProject,
      displayName: 'other-modules',
      testMatch: [
        '<rootDir>/modules/tenant/core/storage/**/*.spec.ts',
        '<rootDir>/modules/tenant/core/queue/**/*.spec.ts',
        '<rootDir>/modules/tenant/core/authorization/**/*.spec.ts',
      ],
      collectCoverageFrom: ['<rootDir>/modules/tenant/core/storage/**/*.service.ts'],
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
