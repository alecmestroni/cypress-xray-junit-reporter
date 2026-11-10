const sanitize = require("sanitize-filename")
const path = require("path")
const { MISSING_JIRA_KEYS_MARKER, parseJiraKeyFromConfig, collectTests } = require("./jiraKey")

function isEnabled(value) {
  return value === true || value === "true"
}

// Reporter options of this reporter, used directly or through cypress-multi-reporters
function getReporterOptions(Cypress) {
  const reporterOptions = Cypress.config("reporterOptions") || {}
  return reporterOptions.cypressXrayJunitReporterReporterOptions || reporterOptions
}

function isRequiredJiraKeyEnabled(Cypress) {
  // set by the plugin when the options come from a cypress-multi-reporters configFile
  if (isEnabled(Cypress.env("cypressXrayJunitReporterRequiredJiraKey"))) {
    return true
  }
  const options = getReporterOptions(Cypress)
  const xrayMode = options.xrayMode === undefined || isEnabled(options.xrayMode)
  return xrayMode && isEnabled(options.requiredJiraKey)
}

// Fail fast: before any test of the spec runs, fail if some test has no jira key.
// The reporter recognizes the marked error and stops the run with exit code 104.
function checkRequiredJiraKeys(before) {
  before(function () {
    let rootSuite = this.test.parent
    while (rootSuite.parent) {
      rootSuite = rootSuite.parent
    }
    // isPending() also covers tests inside describe.skip (only the suite has pending = true)
    const isPending = (test) => (typeof test.isPending === "function" ? test.isPending() : test.pending)
    const missing = collectTests(rootSuite).filter((test) => !isPending(test) && !parseJiraKeyFromConfig(test).length)
    if (missing.length > 0) {
      const list = missing.map((test) => `  - ${test.fullTitle()}`).join("\n")
      throw new Error(`${MISSING_JIRA_KEYS_MARKER}\nJIRA keys are required but missing in ${missing.length} test case(s):\n${list}`)
    }
  })
}

function addParentsTitle(runnable) {
  const titles = []
  let currentRunnable = runnable

  while (currentRunnable?.parent?.title) {
    titles.unshift(sanitize(currentRunnable.parent.title))
    currentRunnable = currentRunnable.parent
  }
  return titles.join(" -- ")
}

// Full relative spec path split into folders: the reporter tries every suffix of it
// (e.g. cypress/e2e/a/b.cy.js, e2e/a/b.cy.js, a/b.cy.js, b.cy.js), so the depth of the
// spec folder does not need to be guessed here.
function getRelativeFolderArray(Cypress) {
  return `${Cypress.spec.relative.replace(/\\/g, path.sep)}`.split(path.sep).filter(Boolean)
}

function getScreenshotName(test, runnable) {
  return `${addParentsTitle(runnable)} -- ${sanitize(test.title)} (failed)`.slice(0, 250) + ".png"
}

function getScreenshotArray(screenshotName, retry) {
  const screenshots = []
  const extension = ".png"
  const baseNameWithoutExt = screenshotName.slice(0, -extension.length)

  // Add the first screenshot (attempt 1)
  screenshots.push(screenshotName)

  // Add screenshots for each retry
  for (let i = 1; i <= retry; i++) {
    if (screenshotName.length >= 250) {
      // For long names, use numbered format: "abc....abcd (1).png", "abc....abcd (2).png"
      screenshots.push(`${baseNameWithoutExt} (${i})${extension}`)
    } else {
      // For normal names, add attempt number: "fail -- fail testCase 1.1 (failed) (attempt 2).png"
      screenshots.push(`${baseNameWithoutExt} (attempt ${i + 1})${extension}`)
    }
  }

  return screenshots
}

function support(Cypress, cy, afterEach, before) {
  if (before && !Cypress.config().isInteractive && isRequiredJiraKeyEnabled(Cypress)) {
    checkRequiredJiraKeys(before)
  }

  Cypress.on("test:after:run", (test, runnable) => {
    if (test.state === "failed" && Cypress.config("screenshotOnRunFailure") === true) {
      const screenshotsFolder = Cypress.config("screenshotsFolder").replace(/\\/g, path.sep)
      const relativeFoldersArray = getRelativeFolderArray(Cypress)
      const screenshotName = getScreenshotName(test, runnable)
      const screenshotArray = getScreenshotArray(screenshotName, test.currentRetry)
      test.screenshot = test.screenshot || {} // Ensure test.screenshot is an object
      if (screenshotsFolder) test.screenshot.screenshotsFolder = screenshotsFolder
      else throw new Error(`Failed to retrieve screenshotFolder for test ${test.title}`)
      if (relativeFoldersArray) test.screenshot.relativeFoldersArray = relativeFoldersArray
      else throw new Error(`Failed to build relative screenshot path for test ${test.title}`)
      if (screenshotName) test.screenshot.screenshotName = screenshotName
      else throw new Error(`Failed to screenshot name for test ${test.title}`)
      if (screenshotArray) test.screenshot.screenshotArray = screenshotArray
      else throw new Error(`Failed to screenshot array for test ${test.title}`)
    }
  })

  if (!Cypress.config().isInteractive && Cypress.config().reporter !== "spec" && Cypress.config().betterRetries) {
    afterEach(() => {
      const test = cy.state("runnable").ctx.currentTest
      if (test.state === "failed" && Cypress.currentRetry < test._retries) {
        cy.task(
          "logColoredText",
          { color: "yellow", text: `    ${test.title} (Attempt ${Cypress.currentRetry + 1} of ${test._retries + 1})` },
          { log: false }
        )
        const errorMessage = test.err?.parsedStack?.[0]?.message || test.err?.message || "Unknown error"
        cy.task("logColoredText", { color: "red", text: `    ${errorMessage}` }, { log: false })
      }
    })
  }
}

module.exports = support
