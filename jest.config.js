module.exports = {
  transform: {
    '\\.m?jsx?$': 'jest-esm-transformer'
  },
  // setupFilesAfterEnv, not the setupTestFrameworkScriptFile deprecated in jest 24.
  setupFilesAfterEnv: ['./jest.setup.js'],
  testEnvironment: 'node'
  // The `reporters` block used to name jest-html-reporter, which appears in neither
  // package.json nor package-lock.json. Jest resolves reporters before running anything, so
  // `npm test` could not start at all: it failed on the missing module. Removed rather than
  // adding a dependency, since the default reporter is what this project needs.
}
