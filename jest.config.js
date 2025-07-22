const { createDefaultPreset } = require("ts-jest")

const tsJestTransform = createDefaultPreset({
  tsconfig: "./tests/tsconfig.json",
}).transform

/** @type {import("jest").Config} **/
module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  errorOnDeprecated: true,
  testEnvironment: "node",
  transform: {
    ...tsJestTransform,
    "\\.txt$": "./tests/raw-transformer.js",
  },
}
