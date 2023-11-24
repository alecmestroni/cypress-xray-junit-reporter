const fs = require('fs')
const chalk = require("chalk");

module.exports = (on, config) => {
    // Expose plugin tasks
    if (config.betterRetries) {
        on("task", {
            logColoredText(args) {
                const color = args.color;
                const text = args.text;
                // Check if the specified color is a valid Chalk color
                if (!chalk[color] || !color) {
                    console.log(color)
                    console.error('Invalid or missing color!');
                    throw new Error('Invalid or missing color!');
                }
                // Log the colored text to the console
                const print = Array.isArray(text) ? text : [text]
                console.log(chalk[color](print));
                return null
            },
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
            console.log(chalk.grey('Test-Run "' + chalk.cyan(spec.fileName) + '": ' + chalk.green("SUCCESS!") + '\nDeleting video output'));
            console.log(separator);
            fs.unlinkSync(results.video);
        })
    }
    return config;
};