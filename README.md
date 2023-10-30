# Cypress Reporter | A Cypress reporter for writing xml report compatible with XRay

[![Build Status][travis-badge]][travis-build]
[![npm][npm-badge]][npm-listing]
[npm-badge]: https://img.shields.io/npm/v/cypress-xray-junit-reporter.svg?maxAge=2592000
[npm-listing]: https://www.npmjs.com/package/cypress-xray-junit-reporter

Produces XRay compatible JUnit-style XML test results for cypress capable to attach screenshot on test failures.

## Installation

```shell
$ npm install cypress-xray-junit-reporter --save-dev
```

or as a global module

```shell
$ npm install -g cypress-xray-junit-reporter
```

## Configurations

### Full configuration options

| Parameter                      | Default            | Effect                                                                                          |
| ------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| rootSuiteTitle                 | `Root Suite`       | the name for the root suite. (defaults to 'Root Suite')                                         |
| testsuitesTitle                | `Mocha Tests`      | the name for the `testsuites` tag (defaults to 'Mocha Tests')                                   |
| mochaFile                      | `test-results.xml` | configures the file-name to write reports to                                                    |
| toConsole                      | `false`            | if set to a truthy value the produced XML will be logged to the console                         |
| useFullSuiteTitle              | `false`            | if set to a truthy value nested suites' titles will show the suite lineage                      |
| suiteTitleSeparatedBy          | ` ` (space)        | the character to use to separate nested suite titles. (defaults to ' ', '.' if in jenkins mode) |
| outputs                        | `false`            | if set to truthy value will include console output and console error output                     |
| jenkinsMode                    | `false`            | if set to truthy value will return xml that will display nice results in Jenkins                |
| jenkinsClassnamePrefix         | `undefined`        | adds a prefix to a classname when running in `jenkinsMode`                                      |
| testCaseSwitchClassnameAndName | `false`            | set to a truthy value to switch name and classname values                                       |
| xrayMode                       | `false`            | if set to truthy value will return xml xray compatible with JiraKey                             |
| attachScreenshot               | `false`            | If set to true, the xml report will contain the attached screenshot files for the failed tests  |

### Configuration in cypress.config.js

```javascript
var mocha = new Mocha({
	reporter: 'cypress-xray-junit-reporter',
	reporterOptions: {
		mochaFile: './report/[suiteName].xml',
		useFullSuiteTitle: false,
		jenkinsMode: true,
		xrayMode: true, // if JiraKey are setted correctly inside the test the xml report will contain the JiraKey value
		attachScreenshot: true, // if a test fails, the screenshot will be attached to the xml report and imported into xray
	},
})
```

### Naming the output file

By default if a report already exists will be overwritten.
So the mochaFile option can contain placeholders, e.g. `./path_to_your/test-results.[hash].xml`.
`[hash]` enables support of parallel execution of multiple `cypress-xray-junit-reporter`'s writing test results in separate files.
In addition to `[hash]`, this these can also be used:

| placeholder         | output                                            |
| ------------------- | ------------------------------------------------- |
| `[testsuitesTitle]` | will be replaced by the `testsuitesTitle` setting |
| `[rootSuiteTitle]`  | will be replaced by the `rootSuiteTitle` setting  |
| `[suiteFilename]`   | will be replaced by the filename of the spec file |
| `[suiteName]`       | will be replaced by the name the first test suite |
| `[hash]`            | will be replaced by MD5 hash of test results XML. |

### XRay Mode

TODO

### switch classname and name

If you want to **switch classname and name** of the generated testCase XML entries, you can use the `testCaseSwitchClassnameAndName` reporter option.

```javascript
var mocha = new Mocha({
	reporter: 'cypress-xray-junit-reporter',
	reporterOptions: {
		testCaseSwitchClassnameAndName: true,
	},
})
```

Here is an example of the XML output when using the `testCaseSwitchClassnameAndName` option:

| value             | XML output                                                                              |
| ----------------- | --------------------------------------------------------------------------------------- |
| `true`            | `<testcase name="should behave like so" classname="Super Suite should behave like so">` |
| `false` (default) | `<testcase name="Super Suite should behave like so" classname="should behave like so">` |

You can also configure the `testsuites.name` attribute by setting `reporterOptions.testsuitesTitle` and the root suite's `name` attribute by setting `reporterOptions.rootSuiteTitle`.

### System out and system err

The JUnit format defines a pair of tags - `<system-out/>` and `<system-err/>` - for describing a test's generated output
and error streams, respectively. It is possible to pass the test outputs/errors as an array of text lines:

```js
it('should report output', function () {
	this.test.consoleOutputs = ['line 1 of output', 'line 2 of output']
})
it('should report error', function () {
	this.test.consoleErrors = ['line 1 of errors', 'line 2 of errors']
})
```

Since this module is only a reporter and not a self-contained test runner, it does not perform
output capture itself. Thus, the author of the tests is responsible for providing a mechanism
via which the outputs/errors array will be populated.

If capturing only console.log/console.error is an option, a simple (if a bit hack-ish) solution is to replace
the implementations of these functions globally, like so:

```js
var util = require('util')

describe('my console tests', function () {
	var originalLogFunction = console.log
	var originalErrorFunction = console.error
	beforeEach(function _mockConsoleFunctions() {
		var currentTest = this.currentTest
		console.log = function captureLog() {
			var formattedMessage = util.format.apply(util, arguments)
			currentTest.consoleOutputs = (currentTest.consoleOutputs || []).concat(formattedMessage)
		}
		console.error = function captureError() {
			var formattedMessage = util.format.apply(util, arguments)
			currentTest.consoleErrors = (currentTest.consoleErrors || []).concat(formattedMessage)
		}
	})
	afterEach(function _restoreConsoleFunctions() {
		console.log = originalLogFunction
		console.error = originalErrorFunction
	})
	it('should output something to the console', function () {
		// This should end up in <system-out>:
		console.log('hello, %s', 'world')
	})
})
```

Remember to run with `--reporter-options outputs=true` if you want test outputs in XML.
