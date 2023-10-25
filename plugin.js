const fs = require('fs')
const chalk = require("chalk");

module.exports = (on, config) => {
    // Expose plugin tasks
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

    on('after:spec', (spec, results) => {
        if (results.video) {
            // Do we have failures for any retry attempts?
            if (!results.stats.failures && !results.stats.skipped) {
                // delete the video if the spec passed and no tests retried
                console.log('\x1B[37m====================================================================================================\n')
                console.log('\x1B[37mTest-Run "' + spec.fileName + '": \x1B[32mSUCCESS! \n\x1B[37mDeleting video output\n')
                console.log('\x1B[37m====================================================================================================\n')
                fs.unlinkSync(results.video)
            }
        }
    })
    return config;
};