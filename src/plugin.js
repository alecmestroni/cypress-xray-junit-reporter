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

    if (config.deleteVideoOnPassed && config.video) {
        on('after:spec', (spec, results) => {
            const separator = chalk.grey('\n====================================================================================================\n');
            try {
                if (results.video && !results.stats.failures && !results.stats.skipped) {
                    // If we reached this point, the spec passed, and no tests failed or skipped
                    fs.unlinkSync(results.video);
                    console.log(chalk.grey('Test-Run "' + chalk.cyan(spec.fileName) + '": ' + chalk.green("SUCCESS!") + '\nDeleting video output'));
                    console.log(separator);
                }
            } catch (e) {
                /* 
                Handling firefox error on capturing videos:
                "Warning: We failed capturing this video.
                This error will not affect or change the exit code."
                */
                console.log(chalk.grey('\nNo video found for Test-Run: "' + chalk.cyan(spec.fileName) + '"'));
                console.log(separator);
                return
            }
        })
    }
    return config;
};