'use strict';

const xml = require('xml');
const { reporters } = require('mocha');
const { Base } = reporters;
const fs = require('fs');
const path = require('path');
const debug = require('debug')('cypress-xray-junit-reporter');
const mkdirp = require('mkdirp');
const md5 = require('md5');
const stripAnsi = require('strip-ansi');
const createStatsCollector = require("mocha/lib/stats-collector");
const { encode } = require('base64-arraybuffer')

// Save timer references so that times are correct even if Date is stubbed.
// See https://github.com/mochajs/mocha/issues/237
const Date = global.Date;

// A subset of invalid characters as defined in http://www.w3.org/TR/xml/#charsets that can occur in e.g. stacktraces
// regex lifted from https://github.com/MylesBorins/xml-sanitizer/ (licensed MIT)
const INVALID_CHARACTERS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007f-\u0084\u0086-\u009f\uD800-\uDFFF\uFDD0-\uFDFF\uFFFF\uC008]/g; //eslint-disable-line no-control-regex

const testTotals = {
  registered: 0,
  skipped: 0,
};

function findReporterOptions(options) {
  debug('Checking for options in', options);
  if (!options) {
    debug('No options provided');
    return {};
  }
  if (options.reporterOptions) {
    debug('Command-line options for mocha@6+');
    return options.reporterOptions;
  }
  // this is require to handle .mocharc.js files
  debug('Looking for .mocharc.js options');
  return Object.keys(options).filter(function (key) { return key.startsWith('reporterOptions.'); })
    .reduce(function (reporterOptions, key) {
      reporterOptions[key.substring('reporterOptions.'.length)] = options[key];
      return reporterOptions;
    }, {});
}

function configureDefaults(options) {
  const config = findReporterOptions(options);
  debug('options', config);
  config.mochaFile = getSetting(config.mochaFile, 'test-results.xml');
  config.jenkinsMode = getSetting(config.jenkinsMode, false);
  config.xrayMode = getSetting(config.xrayMode, false);
  config.attachScreenshot = getSetting(config.attachScreenshot, false);
  config.toConsole = !!config.toConsole;
  config.rootSuiteTitle = config.rootSuiteTitle || 'Root Suite';
  config.testsuitesTitle = config.testsuitesTitle || 'Mocha Tests';
  config.suiteTitleSeparatedBy = config.suiteTitleSeparatedBy || ' ';

  if (config.jenkinsMode) {
    updateOptionsForJenkinsMode(config);
  }
  return config;
}

function updateOptionsForJenkinsMode(options) {
  if (options.useFullSuiteTitle === undefined) {
    options.useFullSuiteTitle = true;
  }
  debug('jenkins mode - testCaseSwitchClassnameAndName', options.testCaseSwitchClassnameAndName);
  if (options.testCaseSwitchClassnameAndName === undefined) {
    options.testCaseSwitchClassnameAndName = true;
  }
  if (options.suiteTitleSeparatedBy === undefined) {
    options.suiteTitleSeparatedBy = '.';
  }
}
function getSetting(value, defaultVal) {
  if (value !== undefined) {
    return value;
  }
  return defaultVal;
}

function defaultSuiteTitle(suite) {
  if (suite.root && suite.title === '') {
    return stripAnsi(this._options.rootSuiteTitle);
  }
  return stripAnsi(suite.title);
}

function fullSuiteTitle(suite) {
  let parent = suite.parent;
  const title = [suite.title];

  while (parent) {
    if (parent.root && parent.title === '') {
      title.unshift(this._options.rootSuiteTitle);
    } else {
      title.unshift(parent.title);
    }
    parent = parent.parent;
  }

  return stripAnsi(title.join(this._options.suiteTitleSeparatedBy));
}

function isInvalidSuite(suite) {
  return (!suite.root && suite.title === '') || (suite.tests.length === 0 && suite.suites.length === 0);
}

function generateSuiteProperties(options) {
  const props = options.properties;
  if (!props) {
    return [];
  }
  return Object.keys(props).reduce(function (properties, name) {
    const value = props[name];
    properties.push({ property: { _attr: { name: name, value: value } } });
    return properties;
  }, []);
}

function getJenkinsClassname(test, options) {
  debug('Building jenkins classname for', test);
  let parent = test.parent;
  const titles = [];
  while (parent) {
    parent.title && titles.unshift(parent.title);
    parent = parent.parent;
  }
  if (options.jenkinsClassnamePrefix) {
    titles.unshift(options.jenkinsClassnamePrefix);
  }
  return titles.join(options.suiteTitleSeparatedBy);
}

/**
 * JUnit reporter for mocha.js.
 * @module cypress-xray-junit-reporter
 * @param {EventEmitter} runner - the test runner
 * @param {Object} options - mocha options
 */
function CypressXrayJunitReporter(runner, options) {

  createStatsCollector(runner);

  // Reset total tests counters
  testTotals.registered = 0;
  testTotals.skipped = 0;
  this._options = configureDefaults(options);
  this._runner = runner;
  this._generateSuiteTitle = this._options.useFullSuiteTitle ? fullSuiteTitle : defaultSuiteTitle;
  this._antId = 0;
  this._Date = (options?.Date) || Date;

  const testsuites = [];
  this._testsuites = testsuites;

  function findSuite(testsuiteNum) {
    if (testsuiteNum === 'last') {
      return testsuites[testsuites.length - 1].testsuite;
    } else {
      return testsuites[testsuiteNum]?.testsuite;
    }
  }
  let testsuiteNum = 0
  const processTests = (tests) => {
    tests.forEach((test) => {
      const err = test.err;
      if (test.state !== 'skipped' && test.state !== 'pending') {
        findSuite(testsuiteNum).push(this.getTestcaseData(test, err));
      }
    });
  };
  const processSuites = (suites) => {
    suites.forEach((suite) => {
      testsuiteNum++
      if (suite.suites.length && !suite.tests.length) {
        processSuites(suite.suites);
      } else if (suite.tests.length && !suite.suites.length) {
        processTests(suite.tests);
      } else if (suite.suites.length && suite.tests.length) {
        processTests(suite.tests)
        processSuites(suite.suites);
      } else {
        throw new Error('Config Error');
      }
    });
  };

  function mapSuites(suite, testTotals) {
    const suites = suite.suites.reduce((acc, subSuite) => {
      const mappedSuites = mapSuites(subSuite, testTotals);
      if (mappedSuites) {
        acc.push(mappedSuites);
      }
      return acc;
    }, []);
    const mappedSuite = { ...suite, suites };
    return mappedSuite;
  }

  // get functionality from the Base reporter
  Base.call(this, runner);

  // remove old results
  this._runner.on('start', function () {
    if (fs.existsSync(this._options.mochaFile)) {
      debug('removing report file', this._options.mochaFile);
      fs.unlinkSync(this._options.mochaFile);
    }
  }.bind(this));

  this._onSuiteBegin = function (suite) {
    if (!isInvalidSuite(suite)) {
      testsuites.push(this.getTestsuiteData(suite));
    }
  };

  this._runner.on('suite', function (suite) {
    // allow tests to mock _onSuiteBegin
    return this._onSuiteBegin(suite);
  }.bind(this));

  this._onSuiteEnd = function (suite) {
    if (!isInvalidSuite(suite)) {
      const testsuite = findSuite('last');
      if (testsuite) {
        const start = testsuite[0]._attr.timestamp;
        testsuite[0]._attr.time = this._Date.now() - start;
      }
    }
  };
  this._runner.on('suite end', function (suite) {
    // allow tests to mock _onSuiteEnd
    return this._onSuiteEnd(suite);
  }.bind(this));

  this._runner.on('end', function () {
    const rootSuite = mapSuites(this.runner.suite, testTotals);
    processSuites(rootSuite.suites)
    this.flush(testsuites);
  }.bind(this));
}

/**
 * Produces an xml node for a test suite
 * @param  {Object} suite - a test suite
 * @return {Object}       - an object representing the xml node
 */
CypressXrayJunitReporter.prototype.getTestsuiteData = function (suite) {
  const _attr = {
    name: this._generateSuiteTitle(suite),
    timestamp: this._Date.now(),
    tests: suite.tests.length
  };
  const testSuite = { testsuite: [{ _attr: _attr }] };

  if (suite.file) {
    testSuite.testsuite[0]._attr.file = suite.file;
  }

  const properties = generateSuiteProperties(this._options);

  if (properties.length) {
    testSuite.testsuite.push({
      properties: properties
    });
  }

  return testSuite;
};

function addPropertyJiraKey(jiraKey, properties) {
  if (jiraKey.length) {
    properties.push({
      property: { _attr: { name: 'test_key', value: jiraKey } }
    })
  }
}

function parseJiraKeyFromConfig(test) {
  const testConfig = test._testConfig
  if (!testConfig) {
    return []
  }
  const jiraKey = testConfig['jiraKey'] ? testConfig.jiraKey : testConfig.unverifiedTestConfig?.jiraKey
  if (!jiraKey) {
    return []
  }
  return jiraKey
}

function addPropertyScreenshot(screenshot, properties) {
  if (screenshot) {
    const fileName = screenshot.name
    const base64 = screenshot.base64
    properties.push({
      property: [{
        _attr: { name: 'testrun_evidence' }
      }, {
        item: [{
          _attr: { name: fileName }
        }, base64]
      }]
    })
  }
}

function getErrorMsg(testcase) {
  const failures = testcase.testcase.filter(function (item) {
    if (item.failure) {
      return item.failure;
    }
  });
  if (failures.length) {
    const message = failures[0].failure._cdata;
    return message
  }
}

function addPropertyMessage(message, properties) {
  if (message) {
    properties.push({
      property: {
        _attr: { name: 'testrun_comment' },
        _cdata: '{color:#ff0000}' + message + '{color}'
      }
    })
  }
}

function getScreen(test) {
  const path = test.screenshot
  if (path && test.state !== 'passed') {
    const base64 = getBase64(path)
    const name = path.split('/').pop()
    const failureObj = { name: name, base64: base64 }
    return failureObj
  }
}

function getBase64(path) {
  const arrayBuffer = fs.readFileSync(path, { enconding: 'base64' })
  return encode(arrayBuffer)
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
  const jenkinsMode = this._options.jenkinsMode;
  const flipClassAndName = this._options.testCaseSwitchClassnameAndName;
  const name = stripAnsi(jenkinsMode ? getJenkinsClassname(test, this._options) : test.fullTitle());
  const classname = stripAnsi(test.title);
  const testcase = {
    testcase: [{
      _attr: {
        name: flipClassAndName ? classname : name,
        time: (typeof test.duration === 'undefined') ? 0 : test.duration / 1000,
        classname: flipClassAndName ? name : classname
      }
    }]
  };

  // We need to merge console.logs into one <system-out> -
  //  see JUnit schema (only accepts 1 <system-out> per test).
  let systemOutLines = [];
  if (this._options.outputs && (test.consoleOutputs && test.consoleOutputs.length > 0)) {
    systemOutLines = systemOutLines.concat(test.consoleOutputs);
  }
  if (systemOutLines.length > 0) {
    testcase.testcase.push({ 'system-out': this.removeInvalidCharacters(stripAnsi(systemOutLines.join('\n'))) });
  }

  if (this._options.outputs && (test.consoleErrors && test.consoleErrors.length > 0)) {
    testcase.testcase.push({ 'system-err': this.removeInvalidCharacters(stripAnsi(test.consoleErrors.join('\n'))) });
  }

  if (err) {
    let message;
    if (err.message && typeof err.message.toString === 'function') {
      message = err.message + '';
    } else if (typeof err.inspect === 'function') {
      message = err.inspect() + '';
    } else {
      message = '';
    }
    let failureMessage = err.stack || message;
    if (!Base.hideDiff && err.expected !== undefined) {
      const oldUseColors = Base.useColors;
      Base.useColors = false;
      failureMessage += "\n" + Base.generateDiff(err.actual, err.expected);
      Base.useColors = oldUseColors;
    }
    const failureElement = {
      _attr: {
        message: this.removeInvalidCharacters(message) || '',
        type: err.name || ''
      },
      _cdata: this.removeInvalidCharacters(failureMessage)
    };
    testcase.testcase.push({ failure: failureElement });
  }

  let properties = []

  if (xrayMode) {
    const jiraKey = parseJiraKeyFromConfig(test)
    addPropertyJiraKey(jiraKey, properties)
  }

  if (attachScreenshot) {
    const screenshot = getScreen(test)
    addPropertyScreenshot(screenshot, properties)
    const errMessage = getErrorMsg(testcase)
    addPropertyMessage(errMessage, properties)
  }

  if (properties.length) {
    testcase.testcase.push({
      properties,
    })
  }

  return testcase;
};

/**
 * @param {string} input
 * @returns {string} without invalid characters
 */
CypressXrayJunitReporter.prototype.removeInvalidCharacters = function (input) {
  if (!input) {
    return input;
  }
  return input.replace(INVALID_CHARACTERS_REGEX, '');
};

/**
 * Writes xml to disk and ouputs content if "toConsole" is set to true.
 * @param {Array.<Object>} testsuites - a list of xml configs
 */
CypressXrayJunitReporter.prototype.flush = function (testsuites) {
  this._xml = this.getXml(testsuites);

  const reportFilename = this.formatReportFilename(this._xml, testsuites);

  this.writeXmlToDisk(this._xml, reportFilename);

  if (this._options.toConsole === true) {
    console.log(this._xml); // eslint-disable-line no-console
  }
};

/**
 * Formats the report filename by replacing placeholders
 * @param {string} xml - xml string
 * @param {Array.<Object>} testsuites - a list of xml configs
 */
CypressXrayJunitReporter.prototype.formatReportFilename = function (xml, testsuites) {

  const sanitize = require('sanitize-filename');
  let reportFilename = this._options.mochaFile;

  if (reportFilename.indexOf('[hash]') !== -1) {
    reportFilename = reportFilename.replace('[hash]', md5(xml));
  }

  if (reportFilename.indexOf('[testsuitesTitle]') !== -1) {
    reportFilename = reportFilename.replace('[testsuitesTitle]', sanitize(this._options.testsuitesTitle));
  }
  if (reportFilename.indexOf('[rootSuiteTitle]') !== -1) {
    reportFilename = reportFilename.replace('[rootSuiteTitle]', sanitize(this._options.rootSuiteTitle));
  }
  if (reportFilename.indexOf('[suiteFilename]') !== -1) {
    reportFilename = reportFilename.replace('[suiteFilename]', sanitize(testsuites[0]?.testsuite[0]?._attr?.file ?? 'suiteFilename'));
  }
  if (reportFilename.indexOf('[suiteName]') !== -1) {
    reportFilename = reportFilename.replace('[suiteName]', sanitize(testsuites[1]?.testsuite[0]?._attr?.name ?? 'suiteName'));
  }

  return reportFilename;
};
/**
 * Produces an XML string from the given test data.
 * @param {Array.<Object>} testsuites - a list of xml configs
 * @returns {string}
 */
CypressXrayJunitReporter.prototype.getXml = function (testsuites) {
  let totalTests = 0;
  const stats = this._runner.stats;
  const hasProperties = (!!this._options.properties)
  const Date = this._Date;

  testsuites.forEach(function (suite) {
    const _suiteAttr = suite.testsuite[0]._attr;
    // testsuite is an array: [attrs, properties?, testcase, testcase, …]
    // we want to make sure that we are grabbing test cases at the correct index
    const _casesIndex = hasProperties ? 2 : 1;
    const _cases = suite.testsuite.slice(_casesIndex);

    // suiteTime has unrounded time as a Number of milliseconds
    const suiteTime = _suiteAttr.time;

    _suiteAttr.time = (suiteTime / 1000 || 0).toFixed(3);
    _suiteAttr.timestamp = new Date(_suiteAttr.timestamp).toISOString().slice(0, -5);
    _suiteAttr.failures = 0;
    _suiteAttr.skipped = 0;

    _cases.forEach(function (testcase) {
      const lastNode = testcase.testcase[testcase.testcase.length - 1];

      _suiteAttr.skipped += Number('skipped' in lastNode);
      _suiteAttr.failures += Number('failure' in lastNode);
      if (typeof testcase.testcase[0]._attr.time === 'number') {
        testcase.testcase[0]._attr.time = testcase.testcase[0]._attr.time.toFixed(3);
      }
    });

    if (!_suiteAttr.skipped) {
      delete _suiteAttr.skipped;
    }

    totalTests += _suiteAttr.tests;
  });

  const rootSuite = {
    _attr: {
      name: this._options.testsuitesTitle,
      time: (stats.duration / 1000 || 0).toFixed(3),
      tests: totalTests,
      failures: stats.failures
    }
  };
  if (stats.pending) {
    rootSuite._attr.skipped = stats.pending;
  }
  testsuites = [rootSuite].concat(testsuites);

  return xml({ testsuites: testsuites }, { declaration: true, indent: '  ' });
};

/**
 * Writes a JUnit test report XML document.
 * @param {string} xml - xml string
 * @param {string} filePath - path to output file
 */
CypressXrayJunitReporter.prototype.writeXmlToDisk = function (xml, filePath) {
  if (filePath) {
    debug('writing file to', filePath);
    mkdirp.sync(path.dirname(filePath));

    try {
      fs.writeFileSync(filePath, xml, 'utf-8');
    } catch (exc) {
      debug('problem writing results: ' + exc);
    }
    debug('results written successfully');
  }
};

module.exports = CypressXrayJunitReporter;