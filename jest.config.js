module.exports = {
  transform: {
    "\\.m?jsx?$": "jest-esm-transformer"
  },
  // setupTestFrameworkScriptFile has been deprecated in
  // favor of setupFilesAfterEnv in jest 24
  setupFilesAfterEnv: ['./jest.setup.js'],
  reporters: [
    'default',
    ['./node_modules/jest-html-reporter', {
        pageTitle: 'Test Report'
    }]
]
};