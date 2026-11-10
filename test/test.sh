#!/bin/bash

# Runs an npm command inside ./test and checks that it exits with the expected code.
# Usage: sh test/test.sh "<npm args>" <expected exit code>
#   e.g. sh test/test.sh test 16               -> 16 failing tests in the sample specs
#        sh test/test.sh "run requiredJiraKey" 104 -> reporter exits with 104 on missing jira keys

NPM_ARGS=$1
EXPECTED_EXIT_CODE=${2:-0}

cd "$(dirname "$0")" || exit 1
npm $NPM_ARGS
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: $EXPECTED_EXIT_CODE)"

if [ "$EXIT_CODE" -eq "$EXPECTED_EXIT_CODE" ]; then
    echo "Tests passed successfully."
    exit 0
fi

echo "Plugin failed."
exit 1
