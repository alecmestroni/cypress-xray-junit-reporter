export = CypressXrayJunitReporter;
/**
 * JUnit reporter for mocha.js.
 * @module cypress-xray-junit-reporter
 * @param {EventEmitter} runner - the test runner
 * @param {Object} options - mocha options
 */
declare function CypressXrayJunitReporter(runner: EventEmitter, options: any): void;
declare class CypressXrayJunitReporter {
    /**
     * JUnit reporter for mocha.js.
     * @module cypress-xray-junit-reporter
     * @param {EventEmitter} runner - the test runner
     * @param {Object} options - mocha options
     */
    constructor(runner: EventEmitter, options: any);
    _options: any;
    _runner: EventEmitter;
    _generateSuiteTitle: typeof fullSuiteTitle;
    _antId: number;
    _Date: any;
    _testsuites: any[];
    _onSuiteBegin: (suite: any) => void;
    _onSuiteEnd: (suite: any) => void;
    /**
     
     * Produces an xml node for a test suite
     * @param  {Object} suite - a test suite
     * @return {Object}       - an object representing the xml node
     */
    getTestsuiteData(suite: any): any;
    /**
     * Produces an xml config for a given test case.
     * @param {object} test - test case
     * @param {object} err - if test failed, the failure object
     * @returns {object}
     */
    getTestcaseData(test: object, err: object): object;
    /**
     * @param {string} input
     * @returns {string} without invalid characters
     */
    removeInvalidCharacters(input: string): string;
    /**
     * Writes xml to disk and ouputs content if "toConsole" is set to true.
     * @param {Array.<Object>} testsuites - a list of xml configs
     */
    flush(testsuites: Array<any>): void;
    _xml: string;
    /**
     * Formats the report filename by replacing placeholders
     * @param {string} xml - xml string
     * @param {Array.<Object>} testsuites - a list of xml configs
     */
    formatReportFilename(xml: string, testsuites: Array<any>): any;
    /**
     * Produces an XML string from the given test data.
     * @param {Array.<Object>} testsuites - a list of xml configs
     * @returns {string}
     */
    getXml(testsuites: Array<any>): string;
    /**
     * Writes a JUnit test report XML document.
     * @param {string} xml - xml string
     * @param {string} filePath - path to output file
     */
    writeXmlToDisk(xml: string, filePath: string): void;
}
declare function fullSuiteTitle(suite: any): string;
