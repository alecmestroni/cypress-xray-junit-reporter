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
    return config;
};