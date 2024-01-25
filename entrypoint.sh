#!/bin/bash

# Generate a random delay between 0 and 60 seconds
delay=$((RANDOM % 60))

echo "Waiting for $delay seconds before starting..."
sleep $delay

# Start your Node.js application
node index.js
