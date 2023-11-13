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
        console.log('  ------------------------------------');
        console.log(chalk.green('  All suites have been parsed correctly!\n'));
        console.log(`${separator}`);
    },
    warning: (suitesNum, message) => {
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.black('⚠️  ' + message)}`);
    },
    skippedTestcase: (suitesNum, title) => {
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.black('〰 Skipping testcase: ')} ${chalk.white(title)}`);
    },
    analyzedTestcase: (suitesNum, title) => {
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.black('〰 Properly analyzed testcase:')} ${chalk.white(title)}`);
    },
    error: (suitesNum,) => {
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.red('‼ Missing jira key in at least one testcase, it/them will be skipped')}`);
    },
    foundingSuite: (suitesNum, suitesQuantity) => {
        console.log(`\n${whitespace.repeat(suitesNum + tabNum)}${chalk.black('〰 Founded ' + chalk.yellow(converter.toWords(suitesQuantity)) + ' testsuite(s), keep scraping..')}`);
    },
    analyzingSuite: (suitesNum, title) => {
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.cyanBright('〰 Analyzing testsuite: ') + chalk.white(title)}`);
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.white('🔍 Looking for testsuite or testcase...')}`);
    },
    endSuite: (suitesNum, title) => {
        console.log(`${whitespace.repeat(suitesNum + tabNum)}${chalk.green('✔ Successfully analyzed suite:')} ${chalk.white(title)}\n`)
    },
};

module.exports = logMessages;
