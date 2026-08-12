// Pinned to a NON-UTC zone, and that is the whole point.
//
// markup.js formats a date-only string with getUTCMonth()/getUTCDate(). The bug it replaced
// used the local getters, and `new Date('2021-03-15')` is parsed as UTC midnight, so the local
// getters report 14 March anywhere west of UTC. In the UTC zone the local and UTC getters agree
// by definition, so no assertion can tell the two implementations apart: reverting the fix
// passed all 84 tests under TZ=UTC and failed only because this machine happens to be
// America/Los_Angeles. A UTC CI runner, which is the default nearly everywhere, would never
// have caught it.
//
// So pinning UTC here would be the intuitive choice and exactly wrong: it would make the
// timezone test permanently blind to the bug it exists to catch.
//
// This must live in the config, not in setupFilesAfterEach. Setting process.env.TZ from
// jest.setup.js is too late on Node 24 and has no effect: measured, the poisoned fix still
// passed 84/84 under TZ=UTC with the setup file pinning New York.
process.env.TZ = 'America/New_York'

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
