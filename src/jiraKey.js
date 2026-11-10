// Shared between the reporter (Node) and the support file (browser): keep it dependency free.

// Prefix of the error thrown by the support file when requiredJiraKey is enabled and some tests
// have no jira key. The reporter recognizes it and exits with MISSING_JIRA_KEYS before any test runs.
const MISSING_JIRA_KEYS_MARKER = "[cypress-xray-junit-reporter] MISSING_JIRA_KEYS"

/**
 * Reads the jira key set with it("title", { jiraKey: "ABC-123" }, fn)
 * @returns {string|Array} the jira key, or an empty array when missing
 */
function parseJiraKeyFromConfig(test) {
  const testConfig = test._testConfig
  if (!testConfig) {
    return []
  }
  const jiraKey = testConfig.jiraKey ? testConfig.jiraKey : testConfig.unverifiedTestConfig?.jiraKey
  if (!jiraKey) {
    return []
  }
  return jiraKey
}

function collectTests(suite) {
  return suite.tests.concat(...suite.suites.map(collectTests))
}

module.exports = { MISSING_JIRA_KEYS_MARKER, parseJiraKeyFromConfig, collectTests }
