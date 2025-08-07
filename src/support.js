const sanitize = require("sanitize-filename")
const path = require("path")

function addParentsTitle(runnable) {
  const titles = []
  let currentRunnable = runnable

  while (currentRunnable?.parent?.title) {
    titles.unshift(sanitize(currentRunnable.parent.title))
    currentRunnable = currentRunnable.parent
  }
  return titles.join(" -- ")
}

function getRelativeFolderArray(Cypress) {
  return `${Cypress.spec.relative.replace(/\\/g, path.sep)}`.split(path.sep).slice(2)
}

function getScreenshotName(test, runnable) {
  return `${addParentsTitle(runnable)} -- ${sanitize(test.title)} (failed)`.slice(0, 250) + ".png"
}

function support(Cypress, cy, afterEach) {
  Cypress.on("test:after:run", (test, runnable) => {
    if (test.state === "failed" && Cypress.config("screenshotOnRunFailure") === true) {
      const screenshotsFolder = Cypress.config("screenshotsFolder").replace(/\\/g, path.sep)
      const relativeFoldersArray = getRelativeFolderArray(Cypress)
      const screenshotName = getScreenshotName(test, runnable)
      test.screenshot = test.screenshot || {} // Ensure test.screenshot is an object
      if (screenshotsFolder) test.screenshot.screenshotsFolder = screenshotsFolder
      else throw new Error(`Failed to retrieve screenshotFolder for test ${test.title}`)
      if (relativeFoldersArray) test.screenshot.relativeFoldersArray = relativeFoldersArray
      else throw new Error(`Failed to build relative screenshot path for test ${test.title}`)
      if (screenshotName) test.screenshot.screenshotName = screenshotName
      else throw new Error(`Failed to screenshot name for test ${test.title}`)
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
        cy.task("logColoredText", { color: "red", text: `    ${test.err.parsedStack[0].message}` }, { log: false })
      }
    })
  }
}

module.exports = support
