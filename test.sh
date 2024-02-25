#!/bin/bash

# Define the test cases
declare -a testStrings=(
    "!flowise:pinecone blue and black?"
    "!image http://example.com/image.jpg"
    "@bot !help"
    "!mute 123456789 10m"
    "!execute console.log('Hello World!')"
    "!python:run import sys; print(sys.version)"
    "!report This is a test report"
    "!flowise:gpt4 What is the meaning of life?"
    "!quivr:philosophic Discuss Plato's allegory of the cave"
    "!http GET https://api.example.com/data"
    "@bot !perplexity How complex is this sentence?"
    "!alias newAlias = !existingCommand"
)

# Regex pattern
regex='(?:@bot\s+)?^!(\w+)(?::(\w+))?\s*(.*)'

# Loop through each test string
for testString in "${testStrings[@]}"; do
    echo "Testing: $testString"
    node -e "
        const regex = /$regex/;
        const testString = '$testString';
        const match = testString.match(regex);
        
        if (match) {
            console.log('Command:', match[1], 'Action:', match[2], 'Args:', match[3]);
        } else {
            console.log('No match found.');
        }
    "
    echo "---------------------------------------------"
done

