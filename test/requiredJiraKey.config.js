const { defineConfig } = require("cypress")

module.exports = defineConfig({
  betterRetries: true,
  deleteVideoOnPassed: true,
  video: false,
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: "spec, cypress-xray-junit-reporter",
    cypressXrayJunitReporterReporterOptions: {
      mochaFile: "./report/[suiteFilename].xml",
      useFullSuiteTitle: false,
      jenkinsMode: true,
      xrayMode: true,
      attachScreenshot: true,
      shortenLogMode: true,
      requiredJiraKey: true, // JIRA keys are mandatory
    },
  },
  e2e: {
    specPattern: "cypress/e2e/**/*.cy.js",
    setupNodeEvents(on, config) {
      require("cypress-xray-junit-reporter/plugin")(on, config)
      on("task", {
        log(text) {
          console.log(text)
          return null
        },
      })
      // implement node event listeners here
      return config
    },
  },
})
