const { defineConfig } = require("cypress");

module.exports = defineConfig({
  video: false,
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'spec, cypress-xray-junit-reporter',
    cypressXrayJunitReporterReporterOptions: {
      mochaFile: './report/[suiteName].xml',
      useFullSuiteTitle: false,
      jenkinsMode: true,
    },
  },
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        log(text) {
          console.log(text)
          return null
        },
      })
      // implement node event listeners here
      return config;
    },
  },
});
