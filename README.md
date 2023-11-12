# Writing XML report compatible with XRAY & JIRA

<h3 align="center">
  <img src="https://www.getxray.app/hubfs/Marketing/Blog/Blog%20images/Images%202023/Cypress%20Tutorial/Xray-Cypress-Tutorial.png" alt="Cypress Xray Junit Reporter" width="45%" align="center"/>
</h3>

<h3 align="center">
  <a href="https://www.npmjs.com/package/cypress-xray-junit-reporter">
    <img src="https://img.shields.io/npm/v/cypress-xray-junit-reporter" align="center" />
  </a>
  <a href="https://www.npmjs.com/package/cypress-xray-junit-reporter">
    <img src="https://img.shields.io/npm/dm/cypress-xray-junit-reporter"  align="center" />
  </a>
    <a href="https://paypal.me/AlecMestroni?country.x=IT&locale.x=it_IT">
    <img src="https://raw.githubusercontent.com/alecmestroni/cypress-xray-junit-reporter/main/img/badge.svg" align="center" />
  </a>
</h3>

##

Cypress Xray Junit Reporter is a custom-reporter capable to produce XRAY compatible JUnit-style XML test results that can also attach screenshots of test failures to the report.  
This reporter is tailor-made on the XRAY's guide ["Taking advantage of JUnit XML reports"](https://docs.getxray.app/display/XRAY/Taking+advantage+of+JUnit+XML+reports) and on the Cypress guide ["Custom reporter"](https://docs.cypress.io/guides/tooling/reporters#Custom-reporter).  
XML cypress custom reporter based on Mocha to be compatible with:

- [XRAY | Native Test Management for Jira](https://www.getxray.app/)
- [CYPRESS V10+ | Testing framework](https://www.cypress.io/)

**This plugin will also add support for two new cypress features:**

- deleteVideoOnPassed (delete the videos of passed specs)
- betterRetries (logs cypress errors on retries)

See [here](https://www.npmjs.com/package/cypress-xray-junit-reporter#extra-features) for more information

## Execution

https://github.com/alecmestroni/cypress-xray-junit-reporter/assets/62354989/4e8b1067-59bd-48ef-9f1a-183cfb049864

## Install

```shell
$ npm install cypress-xray-junit-reporter --save-dev
```

or as a global module

```shell
$ npm install -g cypress-xray-junit-reporter
```

## XRAY Mode

With this custom report will be easy for you to connect your tests with your JIRA test issue, creating test execution report compatible with XRAY.

### 1. Naming the output file

By default if a file test-report.xml already exists it will be overwritten.  
The use of placeholders enables support of parallel execution of multiple test,`cypress-xray-junit-reporter` will write test results in separate files.  
The mochaFile option can contain placeholders, e.g. `./path_to_your/test-results.[hash].xml`.  
In addition to `[hash]`, these can also be used:

| placeholder         | output                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `[testsuitesTitle]` | will be replaced by the `testsuitesTitle` setting                                        |
| `[rootSuiteTitle]`  | will be replaced by the `rootSuiteTitle` setting                                         |
| `[suiteFilename]`   | will be replaced by the filename of the spec file, auto remove .cy.js from the file name |
| `[suiteName]`       | will be replaced by the name the first test suite                                        |
| `[hash]`            | will be replaced by MD5 hash of test results XML.                                        |

### 2. Cypress configuration

#### 2.1 Inside `cypress.config.js`

This example shows how to install the plugin for e2e testing type. Read Cypress configuration docs for further info.

```javascript
const { defineConfig } = require('cypress')
module.exports = defineConfig({
	deleteVideoOnPass: true,
	betterRetries: true,
	reporter: 'cypress-xray-junit-reporter',
	reporterOptions: {
		mochaFile: './report/[suiteName].xml',
		useFullSuiteTitle: false,
		jenkinsMode: true,
		xrayMode: true, // if JiraKey are set correctly inside the test the XML report will contain the JiraKey value
		attachScreenshot: true, // if a test fails, the screenshot will be attached to the XML report and imported into xray
	},
	e2e: {
		setupNodeEvents(on, config) {
			require('cypress-xray-junit-reporter/plugin')(on, config, {}) // also needed
			return config
		},
	},
})
```

#### 2.2 Inside `cypress/support/e2e.js`

At the top of your support file (usually cypress/support/e2e.js for e2e testing type):

```javascript
import 'cypress-xray-junit-reporter/support'
```

### 3. Setting up your jiraKeys

`cypress/e2e/myFirstTest.cy.js`

```javascript
describe('My First Test', () => {
	it('Does not do much!', { jiraKey: 'CALC-1234' }, () => {
		expect(true).to.equal(true)
	})
})
```

### 4. Run the test

```shell
npx cypress run
```

### 5. Enjoy the generated test-execution report

Report file generated at '<Cypress_project_root>/cypress/results'.

`my-test-output-828a1c4885dc687b1a19e11e24b9437e.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Mocha Tests" time="0.1070" tests="1" failures="0">
  <testsuite name="Root Suite" timestamp="2023-01-27T13:51:23" tests="0" file="cypress\e2e\test.cy.js" time="0.0000" failures="0">
  </testsuite>
  <testsuite name="My First Test" timestamp="2023-01-27T13:51:23" tests="1" time="0.0700" failures="0">
    <testcase name="My First Test Does not do much!" time="0.0820" classname="Does not do much!">
      <properties>
        <property name="test_key" value="CALC-1234"/>
      </properties>
    </testcase>
  </testsuite>
</testsuites>
```

As you can see the property has been added and now could be read correctly by XRAY.

```xml
<properties>
  <property name="test_key" value="CALC-1234"/>
</properties>
```

Now just upload the report to XRAY and the card in Jira will be updated automatically

## Other Options

### Attach screenshot on failure

If you want to **attach the screenshot** of the failed testCase into the XML, you can use the `attachScreenshot` reporter option.
The screenshot will be automatically converted into base64 and attached to the XML report.

```xml
<property name="testrun_evidence">
    <item name="image1.png">base64Here</item>
</property>
```

The testRun will include the screenshot as following:

![testRunEvidence](https://raw.githubusercontent.com/alecmestroni/cypress-xray-junit-reporter/main/img/testRunEvidence.png)

### Switch classname and name

If you want to **switch classname and name** of the generated testCase XML entries, you can use the `testCaseSwitchClassnameAndName` reporter option.

Here is an example of the XML output when using the `testCaseSwitchClassnameAndName` option:

| value             | XML output                                                                              |
| ----------------- | --------------------------------------------------------------------------------------- |
| `false` (default) | `<testcase name="Super Suite should behave like so" classname="should behave like so">` |
| `true`            | `<testcase name="should behave like so" classname="Super Suite should behave like so">` |

You can also configure the `testsuites.name` attribute by setting `reporterOptions.testsuitesTitle` and the root suite's `name` attribute by setting `reporterOptions.rootSuiteTitle`.

## Complete reporterOptions list

| Parameter                      | Default            | Effect                                                                                         |
| ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| mochaFile                      | `test-results.xml` | configures the file-name of the report, compatible with placeholders (see next section)        |
| xrayMode                       | `true`             | if set to true, the XML report will contains the jiraKey property in XRAY format               |
| attachScreenshot               | `false`            | if set to true, the XML report will contains the test failure screenshot in XRAY format        |
| testCaseSwitchClassnameAndName | `false`            | if set to true, to switch name and classname values                                            |
| testsuitesTitle                | `"Mocha Tests"`    | if set, changes the name for the XML testsuites tag, can be used a mochaFile name placeholder  |
| rootSuiteTitle                 | `"Root Suite"`     | if set, changes the name for the XML rootsuites tag, can be used a mochaFile name placeholder  |
| useFullSuiteTitle              | `false`            | if set to true, nested suites' titles will show the suite lineage                              |
| suiteTitleSeparatedBy          | ` ` (space)        | the character to use to separate nested suite titles (defaults to ' ', '.' if in jenkins mode) |
| jenkinsMode                    | `false`            | if set to true, will return XML that will display nice results in Jenkins                      |
| jenkinsClassnamePrefix         | `undefined`        | if set, adds a prefix to a classname when running in `jenkinsMode`                             |
| outputs                        | `false`            | if set to true, will include console output and console error output into XML                  |
| toConsole                      | `false`            | if set to true, the produced XML will be logged to the console                                 |

## Results

### Correct configuration

**Description**  
No testCase is skipped or pending, and every testCase has a jiraKey configured correctly.

```shell
────────────────────────────────────────────────────────────────────────────────────────────────────

  Running:  myFirstTest.cy.js                                                               (1 of 1)

  testSuite 1
    testSuite 2
      √ testCase 2.1
      √ testCase 2.2
    testSuite 3
      √ testCase 3.1
      √ testCase 3.2

 4 passing (475ms)

====================================================================================================

  Cypress Xray Junit Reporter | Creating XML report
  -------------------------------------------------

    ⏳ Retrieving suites information...

    〰 Founded one testsuite(s), keep scraping..
      〰 Analyzing 1st testsuite: testSuite 1
      🔍 Looking for testsuite or testcase...

      〰 Founded two testsuite(s), keep scraping..
        〰 Analyzing 2nd testsuite: testSuite 2
        🔍 Looking for testsuite or testcase...
          〰 Properly analyzed 1st testcase: testCase 2.1
          〰 Properly analyzed 2nd testcase: testCase 2.2
        ✔  Successfully analyzed two testcase(s)
        〰 End of testsuite: testSuite 2

        〰 Analyzing 3rd testsuite: testSuite 3
        🔍 Looking for testsuite or testcase...
          〰 Properly analyzed 1st testcase: testCase 3.1
          〰 Properly analyzed 2nd testcase: testCase 3.2
        ✔  Successfully analyzed two testcase(s)
        〰 End of testsuite: testSuite 3

      〰 End of testsuite: testSuite 1

    ------------------------------------
    All suites has been parsed correctly!

====================================================================================================
```

### Missing jiraKeys

**Description**  
Jira keys are missing in testCase 1.2 & testCase 1.3

```shell
────────────────────────────────────────────────────────────────────────────────────────────────────

  Running:  myFirstTest.cy.js                                                               (1 of 1)

  testSuite 1
    √ testCase 1.1
    √ testCase 1.2
    √ testCase 1.3

 3 passing (185ms)

====================================================================================================

  Cypress Xray Junit Reporter | Creating XML report
  -------------------------------------------------

    ⏳ Retrieving suites information...

    〰 Founded one testsuite(s), keep scraping..
      〰 Analyzing 1st testsuite: testSuite 1
      🔍 Looking for testsuite or testcase...
        〰 Properly analyzed 1st testcase: testCase 1.1
        ⚠️ Missing jira key in testcase: testCase 1.2
        〰 Skipping 2nd testcase: testCase 1.2
        ⚠️ Missing jira key in testcase: testCase 1.3
        〰 Skipping 3rd testcase: testCase 1.3
      ✔  Successfully analyzed three testcase(s)
      ❗ Missing jira key in at least one testcase
      〰 End of testsuite: testSuite 1

  ------------------------------------
  All suites has been parsed correctly!

====================================================================================================
```

### Skipped or Pending tests

**Description**
Properties: secretName & region are mandatory

```shell
────────────────────────────────────────────────────────────────────────────────────────────────────

  Running:  myFirstTest.cy.js                                                               (1 of 1)

  testSuite 1
    1) testCase 1.1
    - testCase 1.2
    - testCase 1.3

 0 passing (398ms)
  2 pending
  1 failing

  1) testSuite 1
       testCase 1.1:
     AssertionError: expected true to equal false
      at Context.eval (webpack://plain-iqpfe-cypresstest/./cypress/e2e/tests/myFirstTest.cy.js:6:18)

====================================================================================================

  Cypress Xray Junit Reporter | Creating XML report
  -------------------------------------------------

    ⏳ Retrieving suites information...

    〰 Founded one testsuite(s), keep scraping..
      〰 Analyzing 1st testsuite: testSuite 1
      🔍 Looking for testsuite or testcase...
        〰 Properly analyzed 1st testcase: testCase 1.1
        〰 Skipping 2nd testcase: testCase 1.2
        〰 Skipping 3rd testcase: testCase 1.3
      ✔  Successfully analyzed three testcase(s)
      〰 End of testsuite: testSuite 1

  ------------------------------------
  All suites has been parsed correctly!

  ====================================================================================================
```

### Module dependencies error

**Description**  
Try reinstall the latest version of the library

```shell
────────────────────────────────────────────────────────────────────────────────────────────────────

  Running:  myFirstTest.cy.js                                                               (1 of 1)
"cypress-xray-junit-reporter" reporter not found
Reporter not found! cypress-xray-junit-reporter

  testSuite 1
    √ testCase 1.1

 1 passing (142ms)

====================================================================================================
```

## Extra Features

Set them as other cypress options inside the `cypress.config.js`:

```javascript
const { defineConfig } = require('cypress')
module.exports = defineConfig({
	deleteVideoOnPass: true,
	betterRetries: true,
})
```

### deleteVideoOnPass

Deletes the videos of passed specs

```bash
====================================================================================================

Test-Run "myFirstTest": SUCCESS!
Deleting video output

====================================================================================================
```

### betterRetries

Cypress doesn't automatically logs **retries errors** but log only the last one.  
 In some cases you need to know the error on each attempt because it can change.  
**Before betterRetries:**

```bash
────────────────────────────────────────────────────────────────────────────────────────────────────

  Running:  myFirstTest.cy.js                                                               (1 of 1)

  testSuite 1
    1) testCase 1.1

 0 passing (1s)
  1 failing

  1) testSuite 1
       testCase 1.1:
     AssertionError: expected true to equal false
      at Context.eval (webpack://plain-iqpfe-cypresstest/./cypress/e2e/tests/myFirstTest.cy.js:6:18)


====================================================================================================
```

**After betterRetries:**

```bash
────────────────────────────────────────────────────────────────────────────────────────────────────

  Running:  myFirstTest.cy.js                                                               (1 of 1)

  testSuite 1
    (Attempt 1 of 3) testCase 1.1
    AssertionError: expected true to equal false
    (Attempt 2 of 3) testCase 1.1
    AssertionError: expected true to equal false
    1) testCase 1.1
    (Attempt 3 of 3) testCase 1.1

 0 passing (1s)
  1 failing

  1) testSuite 1
       testCase 1.1:
     AssertionError: expected true to equal false
      at Context.eval (webpack://plain-iqpfe-cypresstest/./cypress/e2e/tests/myFirstTest.cy.js:6:18)


====================================================================================================
```

## THE JOB IS DONE!

Happy testing to everyone!

ALEC-JS

<h3 align="center">
🙌 Donate to support my work & further development! 🙌
</h3>

<h3 align="center">
  <a href="https://paypal.me/AlecMestroni?country.x=IT&locale.x=it_IT">
    <img src="https://raw.githubusercontent.com/alecmestroni/cypress-xray-junit-reporter/main/img/badge.svg" width="111" align="center" />
  </a>
</h3>
