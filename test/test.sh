#!/bin/bash

# Script to Handle the test cases failures to check that the plugin is working correctly or not.

cd test
npm $1
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE"

# 16 tests should fail when running npm test
# 104 is the exit code when requiredJiraKey is set to true in config and some test miss the jiraKey
if [ $EXIT_CODE -eq 16 ] || [ $EXIT_CODE -eq 104 ]; then
    echo "Tests passed successfully."
    EXIT_CODE=0
else
    echo "Plugin failed."
fi

exit $EXIT_CODE
