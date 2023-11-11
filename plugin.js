const fs = require('fs')
const chalk = require("chalk");

module.exports = (on, config) => {
    // Expose plugin tasks
    if (config.betterRetries) {
        on("task", {
            logYellow(param) {
                const log = Array.isArray(param) ? param : [param]
                console.log(chalk.yellow(log))
                return null
            },
            logRed(param) {
                const log = Array.isArray(param) ? param : [param]
                console.log(chalk.red(log))
                return null
            }
        });
    }

    if (config.deleteVideoOnPassed) {
        on('after:spec', (spec, results) => {
            if (!results.video || results.stats.failures || results.stats.skipped) {
                // No video available, nothing to delete
                // Either failures or skipped tests, do not delete the video
                return;
            }
            // If we reached this point, the spec passed, and no tests failed or skipped
            const separator = chalk.grey('\n====================================================================================================\n');
            console.log(separator);
            console.log(chalk.grey('Test-Run "' + chalk.cyan(spec.fileName) + '": ' + chalk.green("SUCCESS!") + '\nDeleting video output'));
            console.log(separator);
            fs.unlinkSync(results.video);
        })
    }
    return config;
};