// Exit codes for cypress-xray-junit-reporter
// Using 100+ range to avoid conflicts with Cypress exit codes (which equal the number of failed tests)
const EXIT_CODES = {
  SUCCESS: 0,
  XRAY_CONFIG_ERROR: 102, // Xray configuration errors
  XML_GENERATION_ERROR: 103, // XML generation errors
  MISSING_JIRA_KEYS: 104, // Missing JIRA keys in test cases
}

module.exports = { EXIT_CODES }
