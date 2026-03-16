/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",

  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],

  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
        },
      },
    ],
  },

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/src/__mocks__/fileMock.js",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/src/__mocks__/fileMock.js",
  },

  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/__tests__/**/*.spec.ts",
    "**/__tests__/**/*.spec.tsx",
  ],

  collectCoverageFrom: [
    "src/pages/admin/AdminDashboard.tsx",
    "src/pages/admin/CompanyManagement.tsx",
    "src/pages/admin/UserManagement.tsx",
    "src/pages/admin/TransactionsAudit.tsx",
    "src/pages/admin/PlatformAdminLogin.tsx",
    "src/components/admin/ReasonModal.tsx",
    "src/components/admin/ConfirmModal.tsx",
    "src/components/admin/PlatformAdminSidebar.tsx",
    "src/api/platformAdminApi.ts",
    "!src/**/*.d.ts",
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};