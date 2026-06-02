#!/bin/bash

# Usage: ./start-with-delay.sh [delay-in-seconds] [node-app-path]
# Example: ./start-with-delay.sh 60 /path/to/your/app.js

# Default delay in seconds before exiting (60 seconds)
DELAY_BEFORE_EXIT=${1:-60}

# Path to the Node.js application
NODE_APP_PATH=${2}

# Function to handle exit
handle_exit() {
    echo "Application exiting in $DELAY_BEFORE_EXIT seconds..."
    sleep $DELAY_BEFORE_EXIT
    exit 1
}

# Trap common exit signals and call handle_exit
trap handle_exit SIGINT SIGTERM

# Start the Node.js application
if [ -z "$NODE_APP_PATH" ]; then
    echo "Error: No Node.js application path provided."
    echo "Usage: $0 [delay-in-seconds] [node-app-path]"
    exit 1
fi

node "$NODE_APP_PATH"
