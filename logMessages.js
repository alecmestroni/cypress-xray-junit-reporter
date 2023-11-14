const converter = require('number-to-words');
const chalk = require('chalk');

const separator = '===================================================================================================='
const whitespace = "  "
let tabNum = 2

const logMessages = {
    startingPlugin: () => {
        console.log(separator);
        console.log(chalk.white('\n  Cypress Xray Junit Reporter | Creating XML report'));
        console.log(chalk.white('  -------------------------------------------------\n'));
        console.log(chalk.white('    ⏳ Retrieving suites information from Root Suite... '));
    },
    endPlugin: () => {
        console.log(`\n${whitespace.repeat(tabNum)}------------------------------------`);
        console.log(`${whitespace.repeat(tabNum)}${chalk.green('All suites have been parsed correctly!\n')}`);
        console.log(`${separator}`);
    },
    warning: (shortenLogMode, suitesNum, message) => {
        if (!shortenLogMode) {
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.black('⚠️  ' + message)}`);
        } else {
            console.log(`${whitespace.repeat(tabNum)}${chalk.black('⚠️  ' + message)}`);
        }
    },
    missingError: (shortenLogMode, suitesNum,) => {
        const message = '‼ Missing jira key in at least one testcase'
        if (!shortenLogMode) {
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.red(message)}`);
        } else {
            console.log(`${whitespace.repeat(tabNum)}${chalk.red(message)}`);
        }
    },
    skippedError: (shortenLogMode, testArray) => {
        let wsNum
        if (shortenLogMode) {
            wsNum = tabNum
            const message = `‼ Skipping testcases:\n${whitespace.repeat(wsNum)}` + chalk.cyan('- ' + testArray.join(`,\n${whitespace.repeat(wsNum)}- `))
            console.log(`${whitespace.repeat(wsNum)}${chalk.red(message)}`);
        }
    },
    skippedTestcase: (shortenLogMode, suitesNum, title) => {
        if (!shortenLogMode) {
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.black('〰 Skipping testcase: ')} ${chalk.white(title)}`);
        }
    },
    analyzedTestcase: (shortenLogMode, suitesNum, title) => {
        if (!shortenLogMode) {
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.black('〰 Properly analyzed testcase:')} ${chalk.white(title)}`);
        }
    },
    foundingSuite: (shortenLogMode, suitesNum, suitesQuantity) => {
        if (!shortenLogMode) {
            console.log(`\n${whitespace.repeat(suitesNum + tabNum)}${chalk.black('〰 Founded ' + chalk.yellow(converter.toWords(suitesQuantity)) + ' testsuite(s), keep scraping..')}`);
        }
    },
    analyzingSuite: (shortenLogMode, suitesNum, title) => {
        if (!shortenLogMode) {
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.cyanBright('〰 Analyzing testsuite: ') + chalk.white(title)}`);
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.white('🔍 Looking for testsuite or testcase...')}`);
        }
    },
    endSuite: (shortenLogMode, suitesNum, title) => {
        if (!shortenLogMode) {
            console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.green('✔ Successfully analyzed suite:')} ${chalk.white(title)}\n`)
        }
    },
};

module.exports = logMessages;
