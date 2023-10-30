# Writing XML report compatible with XRAY & JIRA

<h3 align="center">
  <img src="https://www.getxray.app/hubfs/Marketing/Blog/Blog%20images/Images%202023/Cypress%20Tutorial/Xray-Cypress-Tutorial.png" alt="Cypress Xray Junit Reporter" width="50%" align="center"/>
</h3>

<h3 align="center">
🙌 Donate to support my work & further development! 🙌
</h3>

<h3 align="center">
  <a href="https://paypal.me/AlecMestroni?country.x=IT&locale.x=it_IT">
    <img src="https://raw.githubusercontent.com/alecmestroni/cypress-xray-junit-reporter/main/img/badge.svg" width="111" align="center" />
  </a>
</h3>
<h3 align="center">
  <a href="https://www.npmjs.com/package/cypress-xray-junit-reporter">
    <img src="https://img.shields.io/npm/v/cypress-xray-junit-reporter" align="center" />
  </a>
  <a href="https://www.npmjs.com/package/cypress-xray-junit-reporter">
    <img src="https://img.shields.io/npm/dm/cypress-xray-junit-reporter"  align="center" />
  </a>
</h3>

##

Cypress Xray Junit Reporter is a custom-reporter capable to produce XRAY compatible JUnit-style XML test results that can also attach screenshots of test failures to the report.  
This reporter is tailor-made on the XRAY's guide ["Taking advantage of JUnit XML reports"](https://docs.getxray.app/display/XRAY/Taking+advantage+of+JUnit+XML+reports) and on the Cypress guide ["Custom reporter"](https://docs.cypress.io/guides/tooling/reporters#Custom-reporter).  
XML cypress custom reporter based on Mocha to be compatible with:

- [XRAY | Native Test Management for Jira](https://www.getxray.app/)
- [CYPRESS | Testing framework](https://www.cypress.io/)

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

| placeholder         | output                                            |
| ------------------- | ------------------------------------------------- |
| `[testsuitesTitle]` | will be replaced by the `testsuitesTitle` setting |
| `[rootSuiteTitle]`  | will be replaced by the `rootSuiteTitle` setting  |
| `[suiteFilename]`   | will be replaced by the filename of the spec file |
| `[suiteName]`       | will be replaced by the name the first test suite |
| `[hash]`            | will be replaced by MD5 hash of test results XML. |

### 2. Cypress configuration

```javascript
// cypress.config.js
const { defineConfig } = require('cypress')
module.exports = defineConfig({
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
			// implement node event listeners here
		},
	},
})
```

### 3. Setting up your jiraKeys

```shell
describe('My First Test', () => {
  it('Does not do much!', {jiraKey:"CALC-1234"}, () => {
    expect(true).to.equal(true);
  })
})
```

### 4. Run the test

```shell
npx cypress run
```

### 5. Enjoy the generated test-execution report

Report file generated at '<Cypress_project_root>/cypress/results'.

"my-test-output-828a1c4885dc687b1a19e11e24b9437e.xml"

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
