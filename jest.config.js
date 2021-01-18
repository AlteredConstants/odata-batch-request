module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  errorOnDeprecated: true,
  globals: {
    "ts-jest": {
      tsconfig: "tests/tsconfig.json",
    },
  },
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "\\.txt$": "jest-raw-loader",
  },
}
