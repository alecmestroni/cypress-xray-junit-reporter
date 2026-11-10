// Using strict mode is a suggested practice because it helps to write more robust code
"use strict"

const xml = require("xml")
const { reporters } = require("mocha")
const { Base } = reporters
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const debug = require("debug")("cypress-xray-junit-reporter")
const stripAnsi = require("strip-ansi")
const statsCollector = require("mocha/lib/stats-collector")
const logMessages = require("./src/logMessages")
const { EXIT_CODES } = require("./src/exitCodes")
const { MISSING_JIRA_KEYS_MARKER, parseJiraKeyFromConfig } = require("./src/jiraKey")
const { createRedactor, escapeJiraMarkup } = require("./src/sanitize")

// mocha <= 11 exports the function itself (CommonJS), mocha 12 is ESM and exports it by name
const createStatsCollector =
  typeof statsCollector === "function" ? statsCollector : statsCollector.createStatsCollector || statsCollector.default

// Save timer references so that times are correct even if Date is stubbed.
// See https://github.com/mochajs/mocha/issues/237
const startTime = global.Date

// A subset of invalid characters as defined in http://www.w3.org/TR/xml/#charsets that can occur in e.g. stacktraces
// originally lifted from https://github.com/MylesBorins/xml-sanitizer/ (licensed MIT)
// Characters not allowed in XML 1.0: control characters, lone surrogates (emoji and other astral
// characters, i.e. valid surrogate pairs, are kept), and the noncharacters U+FDD0-U+FDEF, U+FFFE, U+FFFF
const INVALID_CHARACTERS_REGEX =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007f-\u0084\u0086-\u009f\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g //eslint-disable-line no-control-regex

// number of whitespace indentation characters
let wsNum = 0

let testOrderedByUUID = []

let skippedTestcase = []

// Test objects (not titles, which may be duplicated across suites) that have no jira key
let missingJiraKey = new Set()

function findReporterOptions(options) {
  debug("Checking for options in", options)
  if (!options) {
    debug("No options provided")
    return {}
  }
  if (options.reporterOptions) {
    debug("Command-line options for mocha@6+")
    return options.reporterOptions
  }
  // this is require to handle .mocharc.js files
  debug("Looking for .mocharc.js options")
  return Object.keys(options)
    .filter(function (key) {
      return key.startsWith("reporterOptions.")
    })
    .reduce(function (reporterOptions, key) {
      reporterOptions[key.substring("reporterOptions.".length)] = options[key]
      return reporterOptions
    }, {})
}

function configureDefaults(options) {
  const config = findReporterOptions(options)
  debug("options", config)
  config.mochaFile = getSetting(config.mochaFile, "test-results.xml")
  config.jenkinsMode = getSetting(config.jenkinsMode, false)
  config.xrayMode = getSetting(config.xrayMode, true)
  config.requiredJiraKey = getSetting(config.requiredJiraKey, false)
  config.shortenLogMode = getSetting(config.shortenLogMode, false)
  config.attachScreenshot = getSetting(config.attachScreenshot, false)
  config.toConsole = !!config.toConsole
  config.redactSecrets = getSetting(config.redactSecrets, true)
  config.redactPatterns = getSetting(config.redactPatterns, [])
  config.rootSuiteTitle = config.rootSuiteTitle || "Root Suite"
  config.testsuitesTitle = config.testsuitesTitle || "Mocha Tests"

  if (config.jenkinsMode) {
    updateOptionsForJenkinsMode(config)
  }
  // Apply the generic default only after jenkins mode had a chance to set its own ("." separator)
  config.suiteTitleSeparatedBy = config.suiteTitleSeparatedBy || " "
  return config
}

function updateOptionsForJenkinsMode(options) {
  if (options.useFullSuiteTitle === undefined) {
    options.useFullSuiteTitle = true
  }
  debug("jenkins mode - testcaseSwitchClassnameAndName", options.testcaseSwitchClassnameAndName)
  if (options.testcaseSwitchClassnameAndName === undefined) {
    options.testcaseSwitchClassnameAndName = true
  }
  if (options.suiteTitleSeparatedBy === undefined) {
    options.suiteTitleSeparatedBy = "."
  }
}

function getSetting(value, defaultVal) {
  if (value !== undefined) {
    return value
  }
  return defaultVal
}

function defaultSuiteTitle(suite) {
  if (suite.root && suite.title === "") {
    return stripAnsi(this._options.rootSuiteTitle)
  }
  return stripAnsi(suite.title)
}

function fullSuiteTitle(suite) {
  let parent = suite.parent
  const title = [suite.title]

  while (parent) {
    if (parent.root && parent.title === "") {
      title.unshift(this._options.rootSuiteTitle)
    } else {
      title.unshift(parent.title)
    }
    parent = parent.parent
  }

  return stripAnsi(title.join(this._options.suiteTitleSeparatedBy))
}

function isInvalidSuite(suite) {
  return (!suite.root && suite.title === "") || (suite.tests.length === 0 && suite.suites.length === 0)
}

function generateSuiteProperties(options) {
  const props = options.properties
  if (!props) {
    return []
  }
  return Object.keys(props).reduce(function (properties, name) {
    const value = props[name]
    properties.push({ property: { _attr: { name: name, value: value } } })
    return properties
  }, [])
}

function getJenkinsClassname(test, options) {
  debug("Building jenkins classname for", test)
  let parent = test.parent
  const titles = []
  while (parent) {
    parent.title && titles.unshift(parent.title)
    parent = parent.parent
  }
  if (options.jenkinsClassnamePrefix) {
    titles.unshift(options.jenkinsClassnamePrefix)
  }
  return titles.join(options.suiteTitleSeparatedBy)
}

/**
 * JUnit reporter for mocha.js.
 * A class extending Base: mocha 12 Base is an ES class and cannot be called as a function.
 * @module cypress-xray-junit-reporter
 * @param {EventEmitter} runner - the test runner
 * @param {Object} options - mocha options
 */
class CypressXrayJunitReporter extends Base {
  constructor(runner, options) {
    createStatsCollector(runner)
    // get functionality from the Base reporter
    super(runner)
    initReporter.call(this, runner, options)
  }
}

function initReporter(runner, options) {
  this._options = configureDefaults(options)
  const shortenLogMode = this._options.shortenLogMode
  const xrayMode = this._options.xrayMode
  const requiredJiraKey = this._options.requiredJiraKey
  this._runner = runner
  this._generateSuiteTitle = this._options.useFullSuiteTitle ? fullSuiteTitle : defaultSuiteTitle
  this._Date = options?.Date || startTime
  this._redact = createRedactor(this._options.redactSecrets, this._options.redactPatterns)

  const testsuites = []
  this._testsuites = testsuites

  // testsuites and testOrderedByUUID are always pushed together, so they share indexes
  const findSuite = (suite) => {
    const index = testOrderedByUUID.indexOf(suite.uuid)
    if (index === -1) {
      return undefined
    }
    return testsuites[index].testsuite
  }

  const registerSuite = (suite) => {
    const uuidSuite = crypto.randomUUID()
    suite.uuid = uuidSuite
    testOrderedByUUID.push(uuidSuite)
    testsuites.push(this.getTestsuiteData(suite))
  }

  const processTests = (tests) => {
    wsNum++

    tests.forEach((test) => {
      if (test.state === "skipped" || test.state === "pending") {
        logMessages.skippedTestcase(shortenLogMode, wsNum, test.title)
        skippedTestcase.push(test.title)
        return
      }

      const testCase = this.getTestcaseData(test, test.err)
      if (missingJiraKey.has(test)) {
        logMessages.warning(shortenLogMode, wsNum, `Missing jira key in testcase: ${test.title}`)
        logMessages.skippedTestcase(shortenLogMode, wsNum, test.title)
        skippedTestcase.push(test.title)
        return
      }

      if (!test.parent.uuid) {
        if (test.state !== "failed") {
          throw new Error(`XRAY_CONFIG_ERROR (${EXIT_CODES.XRAY_CONFIG_ERROR}): suite not initialized for testcase <${test.title}>`)
        }
        // if test.parent.uuid is missing the suite hasn't been initialized correctly:
        // a failure here is caused by a before/beforeEach hook failing
        registerSuite(test.parent)
      }

      const testsuite = findSuite(test.parent)
      if (!testsuite) {
        throw new Error(`XRAY_CONFIG_ERROR (${EXIT_CODES.XRAY_CONFIG_ERROR}): suite not found for testcase <${test.title}>`)
      }
      logMessages.analyzedTestcase(shortenLogMode, wsNum, test.title)
      testsuite.push(testCase)
    })
    wsNum--

    if (missingJiraKey.size > 0) {
      logMessages.missingError(shortenLogMode, wsNum)
      if (requiredJiraKey) {
        // Fallback when the support file is not loaded: the spec has already run, exit before writing its report
        exitOnMissingJiraKeys([...missingJiraKey])
      }
      missingJiraKey.clear()
    }
    if (skippedTestcase.length > 0) {
      logMessages.skippedError(shortenLogMode, skippedTestcase)
      skippedTestcase = []
    }
  }
  const processSuites = (suites) => {
    logMessages.foundingSuite(shortenLogMode, wsNum, suites.length)

    wsNum++
    suites.forEach((suite) => {
      logMessages.analyzingSuite(shortenLogMode, wsNum, suite.title)

      // Skip invalid/empty suites (e.g., describe blocks with no tests or nested suites)
      if (!isInvalidSuite(suite)) {
        if (suite.tests.length) {
          processTests(suite.tests)
        }
        if (suite.suites.length) {
          processSuites(suite.suites)
        }
      }

      logMessages.endSuite(shortenLogMode, wsNum, suite.title)
    })
    wsNum--
  }

  // Fail fast: Cypress only sends the test config (jiraKey) to the reporter after each test ends,
  // so the check before any test runs is done by the support file (root before hook), which fails
  // with a marked error. Exit as soon as that failure arrives.
  this._runner.on("fail", function (runnable, err) {
    const message = err && String(err.message)
    if (xrayMode && requiredJiraKey && message && message.includes(MISSING_JIRA_KEYS_MARKER)) {
      // Drop the marker and the "Because this error occurred during a `before all` hook..." note added by Cypress
      const details = message.replace(MISSING_JIRA_KEYS_MARKER, "").split("Because this error occurred")[0].trim()
      exitWithError(
        ["", ...details.split("\n").map((line) => `   ${line}`), MISSING_JIRA_KEYS_HINT],
        EXIT_CODES.MISSING_JIRA_KEYS
      )
    }
  })

  // remove old results
  this._runner.on(
    "start",
    function () {
      wsNum = 0
      testOrderedByUUID = []
      skippedTestcase = []
      missingJiraKey = new Set()
      if (fs.existsSync(this._options.mochaFile)) {
        debug("removing report file", this._options.mochaFile)
        fs.unlinkSync(this._options.mochaFile)
      }
    }.bind(this)
  )

  this._onSuiteBegin = function (suite) {
    if (!isInvalidSuite(suite)) {
      registerSuite(suite)
    }
  }

  this._runner.on(
    "suite",
    function (suite) {
      // allow tests to mock _onSuiteBegin
      return this._onSuiteBegin(suite)
    }.bind(this)
  )

  this._onSuiteEnd = function (suite) {
    if (!isInvalidSuite(suite) && suite.tests.length !== 0) {
      const testsuite = findSuite(suite)
      if (testsuite) {
        const start = testsuite[0]._attr.timestamp
        testsuite[0]._attr.time = this._Date.now() - start
      }
    }
  }
  this._runner.on(
    "suite end",
    function (suite) {
      // allow tests to mock _onSuiteEnd
      return this._onSuiteEnd(suite)
    }.bind(this)
  )

  this._runner.on(
    "end",
    function () {
      logMessages.startingPlugin(xrayMode)
      processSuites(this.runner.suite.suites)
      logMessages.endPlugin()
      this.flush(testsuites)
    }.bind(this)
  )
}

/**
 
 * Produces an xml node for a test suite
 * @param  {Object} suite - a test suite
 * @return {Object}       - an object representing the xml node
 */
CypressXrayJunitReporter.prototype.getTestsuiteData = function (suite) {
  const _attr = {
    name: this.removeInvalidCharacters(this._generateSuiteTitle(suite)),
    timestamp: this._Date.now(),
    tests: suite.tests.length,
  }
  const testsuite = { testsuite: [{ _attr: _attr }] }

  if (suite.file) {
    if (suite.file.includes("\\") || suite.file.includes("/")) {
      const separator = suite.file.includes("\\") ? "\\" : "/"
      testsuite.testsuite[0]._attr.file = suite.file.split(separator).pop()
    } else {
      testsuite.testsuite[0]._attr.file = suite.file
    }
  }

  const properties = generateSuiteProperties(this._options)

  if (properties.length) {
    testsuite.testsuite.push({
      properties: properties,
    })
  }

  return testsuite
}

function exitOnMissingJiraKeys(tests) {
  exitWithError(
    [
      "",
      `   JIRA keys are required but missing in ${tests.length} test case(s):`,
      ...tests.map((test) => `     - ${stripAnsi(test.fullTitle())}`),
      MISSING_JIRA_KEYS_HINT,
    ],
    EXIT_CODES.MISSING_JIRA_KEYS
  )
}

const MISSING_JIRA_KEYS_HINT = `   Set requiredJiraKey: false in reporter options to disable this check. Exiting with code ${EXIT_CODES.MISSING_JIRA_KEYS}...`

// process.exit() can drop pending asynchronous console writes (e.g. pipes on Windows), and Cypress
// does not relay the stderr of its server process: write to stdout synchronously before exiting.
function exitWithError(lines, exitCode) {
  const text = lines.join("\n") + "\n"
  try {
    fs.writeSync(1, text)
  } catch (e) {
    console.error(text)
  }
  process.exit(exitCode)
}

function addPropertyJiraKey(jiraKey, properties) {
  properties.push({
    property: { _attr: { name: "test_key", value: String(jiraKey).replace(INVALID_CHARACTERS_REGEX, "") } },
  })
}

function addPropertyMultipleScreenshots(screenshots, properties) {
  if (!screenshots || screenshots.length === 0) {
    return
  }

  const items = screenshots.map((screenshot) => ({
    item: [
      {
        _attr: { name: screenshot.name },
      },
      screenshot.base64,
    ],
  }))

  properties.push({
    property: [
      {
        _attr: { name: "testrun_evidence" },
      },
      ...items,
    ],
  })
}

function getErrorMsg(testcase) {
  const failures = testcase.testcase.filter(function (item) {
    if (item.failure) {
      return item.failure
    }
  })
  if (failures.length) {
    const message = failures[0].failure._cdata
    return message
  }
}

function addPropertyMessage(message, properties) {
  if (message) {
    properties.push({
      property: {
        _attr: { name: "testrun_comment" },
        // The comment is rendered as Jira wiki markup: escape it so the message cannot inject links, images or macros
        _cdata: "{color:#ff0000}" + escapeJiraMarkup(message) + "{color}",
      },
    })
  }
}

function createFailureObject(filePath) {
  const base64 = getBase64(filePath)
  const name = filePath.split(path.sep).pop()
  return { name, base64 }
}

// A single folder name: no separators and no drive letters.
// ".." is allowed (specs outside the project root): every candidate path is checked with isInsideFolder
function isSafePathSegment(segment) {
  return typeof segment === "string" && segment !== "" && !/[\\/:\0]/.test(segment)
}

// A file name: like a folder name, but "." and ".." are not allowed
function isSafeFileName(name) {
  return isSafePathSegment(name) && name !== "." && name !== ".."
}

// The resolved path must stay inside the screenshots folder
function isInsideFolder(folder, filePath) {
  const relative = path.relative(path.resolve(folder), path.resolve(filePath))
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
}

// The screenshot location comes from the browser (support file): only read .png files inside the screenshots folder
function isSafeScreenshotLocation(screenshotsFolder, relativeFoldersArray, screenshotName) {
  return (
    typeof screenshotsFolder === "string" &&
    path.isAbsolute(screenshotsFolder) &&
    Array.isArray(relativeFoldersArray) &&
    relativeFoldersArray.every(isSafePathSegment) &&
    isSafeFileName(screenshotName) &&
    screenshotName.toLowerCase().endsWith(".png")
  )
}

function getFailureObject(screenshot, screenshotName, state) {
  if (screenshot?.relativeFoldersArray && screenshot?.screenshotsFolder && screenshot?.screenshotName && state !== "passed") {
    const { relativeFoldersArray, screenshotsFolder } = screenshot
    if (!isSafeScreenshotLocation(screenshotsFolder, relativeFoldersArray, screenshotName)) {
      logMessages.warning(false, 0, `Ignoring screenshot with an unexpected path: ${screenshotName}`)
      return
    }
    for (let i = 0; i < relativeFoldersArray.length; i++) {
      const pathParts = [screenshotsFolder, ...relativeFoldersArray.slice(i), screenshotName]
      const screenshotPath = path.join(...pathParts)
      if (!isInsideFolder(screenshotsFolder, screenshotPath)) {
        continue
      }
      try {
        return createFailureObject(screenshotPath)
      } catch (error) {
        if (error.code === "ENOENT") {
          continue
        } else {
          throw error
        }
      }
    }
    // No file was found
    logMessages.warning(false, 0, `Missing screenshot: ${screenshot.screenshotName}`)
  }
}

function getBase64(path) {
  return fs.readFileSync(path, { encoding: "base64" })
}

/**
 * Produces an xml config for a given test case.
 * @param {object} test - test case
 * @param {object} err - if test failed, the failure object
 * @returns {object}
 */
CypressXrayJunitReporter.prototype.getTestcaseData = function (test, err) {
  const xrayMode = this._options.xrayMode
  const attachScreenshot = this._options.attachScreenshot
  const jenkinsMode = this._options.jenkinsMode
  const flipClassAndName = this._options.testcaseSwitchClassnameAndName
  const name = this.removeInvalidCharacters(stripAnsi(jenkinsMode ? getJenkinsClassname(test, this._options) : test.fullTitle()))
  const classname = this.removeInvalidCharacters(stripAnsi(test.title))
  const testcase = {
    testcase: [
      {
        _attr: {
          name: flipClassAndName ? classname : name,
          time: typeof test.duration === "undefined" ? 0 : test.duration / 1000,
          classname: flipClassAndName ? name : classname,
        },
      },
    ],
  }

  // We need to merge console.logs into one <system-out> -
  //  see JUnit schema (only accepts 1 <system-out> per test).
  let systemOutLines = []
  if (this._options.outputs && test.consoleOutputs && test.consoleOutputs.length > 0) {
    systemOutLines = systemOutLines.concat(test.consoleOutputs)
  }
  if (systemOutLines.length > 0) {
    testcase.testcase.push({ "system-out": this.cleanText(stripAnsi(systemOutLines.join("\n"))) })
  }

  if (this._options.outputs && test.consoleErrors && test.consoleErrors.length > 0) {
    testcase.testcase.push({ "system-err": this.cleanText(stripAnsi(test.consoleErrors.join("\n"))) })
  }

  if (err) {
    let message
    if (err.message && typeof err.message.toString === "function") {
      message = err.message + ""
    } else if (typeof err.inspect === "function") {
      message = err.inspect() + ""
    } else {
      message = ""
    }
    let failureMessage = err.stack || message
    if (!Base.hideDiff && err.expected !== undefined) {
      const oldUseColors = Base.useColors
      Base.useColors = false
      failureMessage += "\n" + Base.generateDiff(err.actual, err.expected)
      Base.useColors = oldUseColors
    }
    const failureElement = {
      _attr: {
        message: this.cleanText(message) || "",
        type: this.removeInvalidCharacters(err.name) || "",
      },
      _cdata: this.cleanText(failureMessage),
    }
    testcase.testcase.push({ failure: failureElement })
  }

  let properties = []

  if (xrayMode) {
    const jiraKey = parseJiraKeyFromConfig(test)
    if (jiraKey.length) {
      addPropertyJiraKey(jiraKey, properties)
    } else {
      missingJiraKey.add(test)
    }
  }

  if (attachScreenshot && test.screenshot?.screenshotArray) {
    const failureObjects = []
    // Move the last screenshot to the front of the array so the thumbnail displays the last screen capture.
    for (let i = test.screenshot.screenshotArray.length - 1; i >= 0; i--) {
      const testName = test.screenshot.screenshotArray[i]
      const failureObj = getFailureObject(test.screenshot, testName, test.state)
      if (failureObj) failureObjects.push(failureObj)
    }
    if (failureObjects.length > 0) {
      addPropertyMultipleScreenshots(failureObjects, properties)
    }
    const errMessage = getErrorMsg(testcase)
    addPropertyMessage(errMessage, properties)
  }

  if (properties.length) {
    testcase.testcase.push({
      properties,
    })
  }
  return testcase
}

function countTest(item, array) {
  // Use the reduce() method to count the occurrences of the item property
  return array.reduce((count, element) => {
    // Increment the count if the object has the item property
    return count + (item in element ? 1 : 0)
  }, 0)
}

/**
 * @param {string} input
 * @returns {string} without invalid characters
 */
CypressXrayJunitReporter.prototype.removeInvalidCharacters = function (input) {
  if (!input) {
    return input
  }
  return String(input).replace(INVALID_CHARACTERS_REGEX, "")
}

/**
 * Text coming from the tests (error messages, stack traces, console output): secrets are redacted
 * (see the redactSecrets / redactPatterns options) and invalid XML characters removed.
 * @param {string} input
 * @returns {string}
 */
CypressXrayJunitReporter.prototype.cleanText = function (input) {
  return this.removeInvalidCharacters(this._redact(input))
}

/**
 * Writes xml to disk and ouputs content if "toConsole" is set to true.
 * @param {Array.<Object>} testsuites - a list of xml configs
 */
CypressXrayJunitReporter.prototype.flush = function (testsuites) {
  try {
    this._xml = this.getXml(testsuites)
  } catch (exc) {
    exitWithError(["XML generation error: Failed to generate XML content", `Details: ${exc.message}`], EXIT_CODES.XML_GENERATION_ERROR)
  }

  const reportFilename = this.formatReportFilename(this._xml, testsuites)

  this.writeXmlToDisk(this._xml, reportFilename)

  if (this._options.toConsole === true) {
    console.log(this._xml) // eslint-disable-line no-console
  }
}

/**
 * Formats the report filename by replacing placeholders
 * @param {string} xml - xml string
 * @param {Array.<Object>} testsuites - a list of xml configs
 */
CypressXrayJunitReporter.prototype.formatReportFilename = function (xml, testsuites) {
  const sanitize = require("sanitize-filename")
  let reportFilename = this._options.mochaFile

  if (reportFilename.indexOf("[hash]") !== -1) {
    // md5 only makes the file name unique, it is not used for security
    reportFilename = reportFilename.replace("[hash]", crypto.createHash("md5").update(xml).digest("hex"))
  }
  if (reportFilename.indexOf("[testsuitesTitle]") !== -1) {
    reportFilename = reportFilename.replace("[testsuitesTitle]", sanitize(this._options.testsuitesTitle))
  }
  if (reportFilename.indexOf("[rootSuiteTitle]") !== -1) {
    reportFilename = reportFilename.replace("[rootSuiteTitle]", sanitize(this._options.rootSuiteTitle))
  }
  if (reportFilename.indexOf("[suiteFilename]") !== -1) {
    reportFilename = reportFilename.replace(
      "[suiteFilename]",
      testsuites[0]?.testsuite[0]?._attr?.file ? sanitize(testsuites[0]?.testsuite[0]?._attr?.file) : "suiteFilename"
    )
  }
  if (reportFilename.indexOf("[suiteFilenameNoExt]") !== -1) {
    reportFilename = reportFilename.replace(
      "[suiteFilenameNoExt]",
      testsuites[0]?.testsuite[0]?._attr?.file ? sanitize(testsuites[0]?.testsuite[0]?._attr?.file).split(".")[0] : "suiteFilename"
    )
  }
  if (reportFilename.indexOf("[suiteName]") !== -1) {
    reportFilename = reportFilename.replace(
      "[suiteName]",
      testsuites[1]?.testsuite[0]?._attr?.name ? sanitize(testsuites[1]?.testsuite[0]?._attr?.name) : "suiteName"
    )
  }

  return reportFilename
}
/**
 * Produces an XML string from the given test data.
 * @param {Array.<Object>} testsuites - a list of xml configs
 * @returns {string}
 */
CypressXrayJunitReporter.prototype.getXml = function (testsuites) {
  let totalTests = 0
  let totalFailures = 0
  const stats = this._runner.stats
  const startTime = this._Date

  testsuites.forEach(function (suite) {
    const _suiteAttr = suite.testsuite[0]._attr
    // testsuite is an array: [attrs, properties?, testcase, testcase, …]
    const _cases = suite.testsuite.filter((item) => "testcase" in item)

    // suiteTime has unrounded time as a Number of milliseconds
    const suiteTime = _suiteAttr.time
    _suiteAttr.time = (suiteTime / 1000 || 0).toFixed(3)
    _suiteAttr.timestamp = new startTime(_suiteAttr.timestamp).toISOString().slice(0, -5)
    _suiteAttr.failures = 0

    _cases.forEach(function (testcase) {
      _suiteAttr.failures += countTest("failure", testcase.testcase)
      if (typeof testcase.testcase[0]._attr.time === "number") {
        testcase.testcase[0]._attr.time = testcase.testcase[0]._attr.time.toFixed(3)
      }
    })

    // Count only the testcases actually written to the report:
    // skipped/pending tests and tests without a jira key are excluded from it
    _suiteAttr.tests = _cases.length

    totalTests += _suiteAttr.tests
    totalFailures += _suiteAttr.failures
  })

  const rootSuite = {
    _attr: {
      name: this._options.testsuitesTitle,
      time: (stats.duration / 1000 || 0).toFixed(3),
      tests: totalTests,
      failures: totalFailures,
    },
  }
  // skipped/pending tests are not written as testcases: report how many there were
  if (stats.pending) {
    rootSuite._attr.skipped = stats.pending
  }
  testsuites = [rootSuite].concat(testsuites)

  return xml({ testsuites: testsuites }, { declaration: true, indent: "  " })
}

/**
 * Writes a JUnit test report XML document.
 * @param {string} xml - xml string
 * @param {string} filePath - path to output file
 */
CypressXrayJunitReporter.prototype.writeXmlToDisk = function (xml, filePath) {
  if (filePath) {
    debug("writing file to", filePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })

    try {
      fs.writeFileSync(filePath, xml, "utf-8")
    } catch (exc) {
      exitWithError([`XML generation error: Failed to write report to ${filePath}`, `Details: ${exc.message}`], EXIT_CODES.XML_GENERATION_ERROR)
    }
    debug("results written successfully")
  }
}

module.exports = CypressXrayJunitReporter
