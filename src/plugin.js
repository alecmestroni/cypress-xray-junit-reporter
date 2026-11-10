const fs = require("fs")
const path = require("path")
const chalk = require("chalk")

// Only real chalk colors can be used by the logColoredText task (no arbitrary property access on chalk)
const ALLOWED_COLORS = new Set([
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "gray",
  "grey",
  "blackBright",
  "redBright",
  "greenBright",
  "yellowBright",
  "blueBright",
  "magentaBright",
  "cyanBright",
  "whiteBright",
])

// Name of the Cypress env variable used to pass requiredJiraKey to the support file
const REQUIRED_JIRA_KEY_ENV = "cypressXrayJunitReporterRequiredJiraKey"

// With cypress-multi-reporters `reporterOptions.configFile`, the reporter options live in a JSON file
// the browser cannot read: read them here, so that the support file can run the fail-fast check.
function readReporterConfigFile(config) {
  const configFile = config.reporterOptions?.configFile
  if (!configFile || typeof configFile !== "string") {
    return undefined
  }
  const filePath = path.resolve(config.projectRoot || process.cwd(), configFile)
  try {
    const options = JSON.parse(fs.readFileSync(filePath, "utf8"))
    return options.cypressXrayJunitReporterReporterOptions
  } catch (error) {
    console.log(chalk.yellow(`cypress-xray-junit-reporter: cannot read reporter configFile ${filePath}: ${error.message}`))
    return undefined
  }
}

function isEnabled(value) {
  return value === true || value === "true"
}

function exposeRequiredJiraKey(config) {
  const options = readReporterConfigFile(config)
  if (!options) {
    return
  }
  const xrayMode = options.xrayMode === undefined || isEnabled(options.xrayMode)
  config.env = config.env || {}
  config.env[REQUIRED_JIRA_KEY_ENV] = xrayMode && isEnabled(options.requiredJiraKey)
}

module.exports = (on, config) => {
  exposeRequiredJiraKey(config)

  // Expose plugin tasks
  if (config.betterRetries) {
    on("task", {
      logColoredText(args) {
        const color = args.color
        const text = args.text
        // Check if the specified color is a valid Chalk color
        if (!ALLOWED_COLORS.has(color)) {
          throw new Error(`Invalid or missing color: ${String(color)}`)
        }
        // Log the colored text to the console
        const print = Array.isArray(text) ? text.join("\n") : text
        console.log(chalk[color](print))
        return null
      },
    })
  }

  if (config.deleteVideoOnPassed && config.video) {
    on("after:spec", (spec, results) => {
      const separator = chalk.grey("\n====================================================================================================\n")
      try {
        if (results.video && !results.stats.failures && !results.stats.skipped) {
          // If we reached this point, the spec passed, and no tests failed or skipped
          // Delete the original video file
          if (fs.existsSync(results.video)) {
            fs.unlinkSync(results.video)
          }

          // Also delete the compressed version if it exists
          const compressedVideo = results.video.replace(".mp4", "-compressed.mp4")
          if (fs.existsSync(compressedVideo)) {
            fs.unlinkSync(compressedVideo)
          }

          console.log(chalk.grey('Test-Run "' + chalk.cyan(spec.fileName) + '": ' + chalk.green("SUCCESS!") + "\nDeleting video output"))
          console.log(separator)
        }
      } catch (e) {
        /* 
                Handling firefox error on capturing videos:
                "Warning: We failed capturing this video.
                This error will not affect or change the exit code."
                */
        console.log(chalk.grey('\nNo video found for Test-Run: "' + chalk.cyan(spec.fileName) + '"'))
        console.log(separator)
        return
      }
    })
  }
  return config
}
