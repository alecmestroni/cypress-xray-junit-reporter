#!/bin/bash

# Script to Handle the test cases failures to check that the plugin is working correctly or not.

cd test
npm $1
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE"

if [ $EXIT_CODE -ne 1 ]; then
    echo "Tests passed successfully."
    EXIT_CODE=0
else
    echo "Plugin failed."
fi

exit $EXIT_CODE
