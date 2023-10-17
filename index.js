'use strict';

var xml = require('xml');
var Base = require('mocha').reporters.Base;
var fs = require('fs');
var path = require('path');
var debug = require('debug')('mocha-junit-reporter');
var mkdirp = require('mkdirp');
var md5 = require('md5');
var stripAnsi = require('strip-ansi');
const utils = require('mocha-junit-reporterV2/utils');
const conf = require('mocha-junit-reporterV2/config');

const testTotals = {
  registered: 0,
  skipped: 0,
};
const { log, mapSuites } = utils;

// Save timer references so that times are correct even if Date is stubbed.
// See https://github.com/mochajs/mocha/issues/237
var Date = global.Date;

var createStatsCollector;
var mocha6plus;

try {
  var json = JSON.parse(
    fs.readFileSync(path.dirname(require.resolve('mocha')) + "/package.json", "utf8")
  );
  var version = json.version;
  if (version >= "6") {
    createStatsCollector = require("mocha/lib/stats-collector");
    mocha6plus = true;
  } else {
    mocha6plus = false;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("Couldn't determine Mocha version");
}
module.exports = MochaJUnitReporter;

// A subset of invalid characters as defined in http://www.w3.org/TR/xml/#charsets that can occur in e.g. stacktraces
// regex lifted from https://github.com/MylesBorins/xml-sanitizer/ (licensed MIT)
var INVALID_CHARACTERS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007f-\u0084\u0086-\u009f\uD800-\uDFFF\uFDD0-\uFDFF\uFFFF\uC008]/g; //eslint-disable-line no-control-regex

function findReporterOptions(options) {
  debug('Checking for options in', options);
  if (!options) {
    debug('No options provided');
    return {};
  }
  if (!mocha6plus) {
    debug('Options for pre mocha@6');
    return options.reporterOptions || {};
  }
  if (options.reporterOptions) {
    debug('Command-line options for mocha@6+');
    return options.reporterOptions;
  }
  // this is require to handle .mocharc.js files
  debug('Looking for .mocharc.js options');
  return Object.keys(options).filter(function (key) { return key.indexOf('reporterOptions.') === 0; })
    .reduce(function (reporterOptions, key) {
      reporterOptions[key.substring('reporterOptions.'.length)] = options[key];
      return reporterOptions;
    }, {});
}

function configureDefaults(options) {
  var config = findReporterOptions(options);
  debug('options', config);
  config.mochaFile = getSetting(config.mochaFile, 'MOCHA_FILE', 'test-results.xml');
  config.attachments = getSetting(config.attachments, 'ATTACHMENTS', false);
  config.antMode = getSetting(config.antMode, 'ANT_MODE', false);
  config.jenkinsMode = getSetting(config.jenkinsMode, 'JENKINS_MODE', false);
  config.properties = getSetting(config.properties, 'PROPERTIES', null, parsePropertiesFromEnv);
  config.toConsole = !!config.toConsole;
  config.rootSuiteTitle = config.rootSuiteTitle || 'Root Suite';
  config.testsuitesTitle = config.testsuitesTitle || 'Mocha Tests';

  if (config.antMode) {
    updateOptionsForAntMode(config);
  }

  if (config.jenkinsMode) {
    updateOptionsForJenkinsMode(config);
  }

  config.suiteTitleSeparatedBy = config.suiteTitleSeparatedBy || ' ';

  return config;
}

function updateOptionsForAntMode(options) {
  options.antHostname = getSetting(options.antHostname, 'ANT_HOSTNAME', process.env.HOSTNAME);

  if (!options.properties) {
    options.properties = {};
  }
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

/**
 * Determine an option value.
 * 1. If `key` is present in the environment, then use the environment value
 * 2. If `value` is specified, then use that value
 * 3. Fall back to `defaultVal`
 * @module mocha-junit-reporter
 * @param {Object} value - the value from the reporter options
 * @param {String} key - the environment variable to check
 * @param {Object} defaultVal - the fallback value
 * @param {function} transform - a transformation function to be used when loading values from the environment
 */
function getSetting(value, key, defaultVal, transform) {
  if (process.env[key] !== undefined) {
    var envVal = process.env[key];
    return (typeof transform === 'function') ? transform(envVal) : envVal;
  }
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
  var parent = suite.parent;
  var title = [suite.title];

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

function parsePropertiesFromEnv(envValue) {
  if (envValue) {
    debug('Parsing from env', envValue);
    return envValue.split(',').reduce(function (properties, prop) {
      var property = prop.split(':');
      properties[property[0]] = property[1];
      return properties;
    }, []);
  }

  return null;
}

function generateProperties(options) {
  var props = options.properties;
  if (!props) {
    return [];
  }
  return Object.keys(props).reduce(function (properties, name) {
    var value = props[name];
    properties.push({ property: { _attr: { name: name, value: value } } });
    return properties;
  }, []);
}

function getJenkinsClassname(test, options) {
  debug('Building jenkins classname for', test);
  var parent = test.parent;
  var titles = [];
  while (parent) {
    parent.title && titles.unshift(parent.title);
    parent = parent.parent;
  }
  if (options.jenkinsClassnamePrefix) {
    titles.unshift(options.jenkinsClassnamePrefix);
  }
  return titles.join(options.suiteTitleSeparatedBy);
}

function setJiraKey(jiraKey, properties) {
  if (jiraKey.length) {
    properties.push({
      property: { _attr: { name: 'test_key', value: jiraKey } }
    })
  }
}
function generateJiraID(test) {
  let jiraKey
  const testConfig = test._testConfig.unverifiedTestConfig
  const errorMsg = "REPORTER OUTDATED CONFIGURATION! \nYou have installed the junit-xray-cypress-reporter v1.0.0, \nwithout update the configuration in this test\nHowever the import will be successful, but see the docs: \nhttps://www.npmjs.com/package/junit-xray-cypress-reporter?activeTab=readme \nto align the module with NEWEST CONFIGURATIONS\n"
  if (testConfig?.env) {
    console.error(errorMsg)
    jiraKey = testConfig?.env.jiraID
  } else if (testConfig?.xray) {
    console.error(errorMsg)
    jiraKey = testConfig?.xray.jiraID
  } else if (testConfig?.jiraKey) {
    jiraKey = testConfig?.jiraKey
  } else if (testConfig?.jiraID) {
    jiraKey = testConfig?.jiraID
  } else {
    return []
  }
  return jiraKey
}
function setScreenshot(screenshot, properties) {
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
function setMessage(message, properties) {
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
  if (path) {
    const base64 = getBase64(path)
    const name = path.split('\\').pop()
    const failureObj = { name: name, base64: base64 }
    return failureObj
  }
}
function getBase64(path) {
  const fs = require('fs')
  const image = fs.readFileSync(path, { enconding: 'base64' })
  function base64ArrayBuffer(arrayBuffer) {
    var base64 = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    var bytes = new Uint8Array(arrayBuffer)
    var byteLength = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength = byteLength - byteRemainder

    var a, b, c, d
    var chunk

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4 // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2 // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
  }
  return base64ArrayBuffer(image)
}

/**
 * JUnit reporter for mocha.js.
 * @module mocha-junit-reporter
 * @param {EventEmitter} runner - the test runner
 * @param {Object} options - mocha options
 */
function MochaJUnitReporter(runner, options) {
  if (mocha6plus) {
    createStatsCollector(runner);
  }
  // Reset total tests counters
  testTotals.registered = 0;
  testTotals.skipped = 0;
  this._options = configureDefaults(options);
  this._runner = runner;
  this._generateSuiteTitle = this._options.useFullSuiteTitle ? fullSuiteTitle : defaultSuiteTitle;
  this._antId = 0;
  this._Date = (options || {}).Date || Date;

  var testsuites = [];
  this._testsuites = testsuites;

  function lastSuite() {
    return testsuites[testsuites.length - 1].testsuite;
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
      var testsuite = lastSuite();
      if (testsuite) {
        var start = testsuite[0]._attr.timestamp;
        testsuite[0]._attr.time = this._Date.now() - start;
      }
    }
  };
  this._runner.on('end', function () {
    this.config = conf(options);
    const rootSuite = mapSuites(this.runner.suite, testTotals, this.config);
    rootSuite.suites.forEach((suite) => {
      suite.tests.forEach((test) => {
        const err = test.err
        lastSuite().push(this.getTestcaseData(test, err))
      })
    })
    this.flush(testsuites);
  }.bind(this));


}

/**
 * Produces an xml node for a test suite
 * @param  {Object} suite - a test suite
 * @return {Object}       - an object representing the xml node
 */
MochaJUnitReporter.prototype.getTestsuiteData = function (suite) {
  var antMode = this._options.antMode;

  var _attr = {
    name: this._generateSuiteTitle(suite),
    timestamp: this._Date.now(),
    tests: suite.tests.length
  };
  var testSuite = { testsuite: [{ _attr: _attr }] };


  if (suite.file) {
    testSuite.testsuite[0]._attr.file = suite.file;
  }

  var properties = generateProperties(this._options);
  if (properties.length || antMode) {
    testSuite.testsuite.push({
      properties: properties
    });
  }

  if (antMode) {
    _attr.package = _attr.name;
    _attr.hostname = this._options.antHostname;
    _attr.id = this._antId;
    _attr.errors = 0;
    this._antId += 1;
  }

  return testSuite;
};

/**
 * Produces an xml config for a given test case.
 * @param {object} test - test case
 * @param {object} err - if test failed, the failure object
 * @returns {object}
 */
MochaJUnitReporter.prototype.getTestcaseData = function (test, err) {
  var jenkinsMode = this._options.jenkinsMode;
  var flipClassAndName = this._options.testCaseSwitchClassnameAndName;
  var name = stripAnsi(jenkinsMode ? getJenkinsClassname(test, this._options) : test.fullTitle());
  var classname = stripAnsi(test.title);
  var testcase = {
    testcase: [{
      _attr: {
        name: flipClassAndName ? classname : name,
        time: (typeof test.duration === 'undefined') ? 0 : test.duration / 1000,
        classname: flipClassAndName ? name : classname
      }
    }]
  };

  // We need to merge console.logs and attachments into one <system-out> -
  //  see JUnit schema (only accepts 1 <system-out> per test).
  var systemOutLines = [];
  if (this._options.outputs && (test.consoleOutputs && test.consoleOutputs.length > 0)) {
    systemOutLines = systemOutLines.concat(test.consoleOutputs);
  }
  if (this._options.attachments && test.attachments && test.attachments.length > 0) {
    systemOutLines = systemOutLines.concat(test.attachments.map(
      function (file) {
        return '[[ATTACHMENT|' + file + ']]';
      }
    ));
  }
  if (systemOutLines.length > 0) {
    testcase.testcase.push({ 'system-out': this.removeInvalidCharacters(stripAnsi(systemOutLines.join('\n'))) });
  }

  if (this._options.outputs && (test.consoleErrors && test.consoleErrors.length > 0)) {
    testcase.testcase.push({ 'system-err': this.removeInvalidCharacters(stripAnsi(test.consoleErrors.join('\n'))) });
  }

  if (err) {
    var message;
    if (err.message && typeof err.message.toString === 'function') {
      message = err.message + '';
    } else if (typeof err.inspect === 'function') {
      message = err.inspect() + '';
    } else {
      message = '';
    }
    var failureMessage = err.stack || message;
    if (!Base.hideDiff && err.expected !== undefined) {
      var oldUseColors = Base.useColors;
      Base.useColors = false;
      failureMessage += "\n" + Base.generateDiff(err.actual, err.expected);
      Base.useColors = oldUseColors;
    }
    var failureElement = {
      _attr: {
        message: this.removeInvalidCharacters(message) || '',
        type: err.name || ''
      },
      _cdata: this.removeInvalidCharacters(failureMessage)
    };

    testcase.testcase.push({ failure: failureElement });
  }

  let properties = []
  const jiraKey = generateJiraID(test)
  setJiraKey(jiraKey, properties)
  const screenshot = getScreen(test)
  setScreenshot(screenshot, properties)
  const errMessage = getErrorMsg(testcase)
  setMessage(errMessage, properties)
  testcase.testcase.push({
    properties,
  })
  return testcase;
};

/**
 * @param {string} input
 * @returns {string} without invalid characters
 */
MochaJUnitReporter.prototype.removeInvalidCharacters = function (input) {
  if (!input) {
    return input;
  }
  return input.replace(INVALID_CHARACTERS_REGEX, '');
};

/**
 * Writes xml to disk and ouputs content if "toConsole" is set to true.
 * @param {Array.<Object>} testsuites - a list of xml configs
 */
MochaJUnitReporter.prototype.flush = function (testsuites) {
  this._xml = this.getXml(testsuites);

  var reportFilename = this.formatReportFilename(this._xml, testsuites);

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
MochaJUnitReporter.prototype.formatReportFilename = function (xml, testsuites) {

  var reportFilename = this._options.mochaFile;

  if (reportFilename.indexOf('[hash]') !== -1) {
    reportFilename = reportFilename.replace('[hash]', md5(xml));
  }

  if (reportFilename.indexOf('[testsuitesTitle]') !== -1) {
    reportFilename = reportFilename.replace('[testsuitesTitle]', this._options.testsuitesTitle);
  }
  if (reportFilename.indexOf('[rootSuiteTitle]') !== -1) {
    reportFilename = reportFilename.replace('[rootSuiteTitle]', this._options.rootSuiteTitle);
  }
  if (reportFilename.indexOf('[suiteFilename]') !== -1) {
    reportFilename = reportFilename.replace('[suiteFilename]', testsuites[0]?.testsuite[0]?._attr?.file ?? 'suiteFilename');
  }
  if (reportFilename.indexOf('[suiteName]') !== -1) {
    reportFilename = reportFilename.replace('[suiteName]', testsuites[1]?.testsuite[0]?._attr?.name ?? 'suiteName');
  }

  return reportFilename;
};

/**
 * Produces an XML string from the given test data.
 * @param {Array.<Object>} testsuites - a list of xml configs
 * @returns {string}
 */
MochaJUnitReporter.prototype.getXml = function (testsuites) {
  var totalTests = 0;
  var stats = this._runner.stats;
  var antMode = this._options.antMode;
  var hasProperties = (!!this._options.properties) || antMode;
  var Date = this._Date;

  testsuites.forEach(function (suite) {
    var _suiteAttr = suite.testsuite[0]._attr;
    // testsuite is an array: [attrs, properties?, testcase, testcase, …]
    // we want to make sure that we are grabbing test cases at the correct index
    var _casesIndex = hasProperties ? 2 : 1;
    var _cases = suite.testsuite.slice(_casesIndex);
    var missingProps;

    // suiteTime has unrounded time as a Number of milliseconds
    var suiteTime = _suiteAttr.time;

    _suiteAttr.time = (suiteTime / 1000 || 0).toFixed(3);
    _suiteAttr.timestamp = new Date(_suiteAttr.timestamp).toISOString().slice(0, -5);
    _suiteAttr.failures = 0;
    _suiteAttr.skipped = 0;

    _cases.forEach(function (testcase) {
      var lastNode = testcase.testcase[testcase.testcase.length - 1];

      _suiteAttr.skipped += Number('skipped' in lastNode);
      _suiteAttr.failures += Number('failure' in lastNode);
      if (typeof testcase.testcase[0]._attr.time === 'number') {
        testcase.testcase[0]._attr.time = testcase.testcase[0]._attr.time.toFixed(3);
      }
    });

    if (antMode) {
      missingProps = ['system-out', 'system-err'];
      suite.testsuite.forEach(function (item) {
        missingProps = missingProps.filter(function (prop) {
          return !item[prop];
        });
      });
      missingProps.forEach(function (prop) {
        var obj = {};
        obj[prop] = [];
        suite.testsuite.push(obj);
      });
    }

    if (!_suiteAttr.skipped) {
      delete _suiteAttr.skipped;
    }

    totalTests += _suiteAttr.tests;
  });


  if (!antMode) {
    var rootSuite = {
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
  }

  return xml({ testsuites: testsuites }, { declaration: true, indent: '  ' });
};

/**
 * Writes a JUnit test report XML document.
 * @param {string} xml - xml string
 * @param {string} filePath - path to output file
 */
MochaJUnitReporter.prototype.writeXmlToDisk = function (xml, filePath) {
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
