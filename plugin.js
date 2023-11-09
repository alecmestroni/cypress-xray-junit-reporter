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
            if (results.video) {
                // Do we have failures for any retry attempts?
                if (!results.stats.failures && !results.stats.skipped) {
                    // delete the video if the spec passed and no tests retried
                    const separator = chalk.grey('\n====================================================================================================\n')
                    console.log(separator)
                    console.log(chalk.grey('Test-Run "' + chalk.cyan(spec.fileName) + '": ' + chalk.green("SUCCESS!") + '\nDeleting video output'))
                    console.log(separator)
                    fs.unlinkSync(results.video)
                }
            }
        })
    }
    return config;
};