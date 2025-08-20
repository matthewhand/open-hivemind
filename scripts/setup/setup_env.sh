#!/bin/bash

# setup_env.sh
# A reusable script to generate a .env file based on a .env.sample file.

# Exit immediately if a command exits with a non-zero status
# Commented out to allow graceful handling of errors
# set -e

# Usage: ./setup_env.sh [--force-overwrite] [--force-invalid] [--force-insecure] [--force-defaults]

# Initialize flags
FORCE_OVERWRITE=false
FORCE_INVALID=false
FORCE_INSECURE=false
FORCE_DEFAULTS=false

# Function to display usage information
usage() {
    echo "Usage: $0 [--force-overwrite] [--force-invalid] [--force-insecure] [--force-defaults]"
    echo "  --force-overwrite : Overwrite existing .env file without prompting."
    echo "  --force-invalid   : Skip input validation for boolean and option-based variables."
    echo "  --force-insecure  : Display input for sensitive variables instead of hiding it."
    echo "  --force-defaults  : Use default values without prompting the user."
    exit 1
}

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force-overwrite)
            FORCE_OVERWRITE=true
            shift
            ;;
        --force-invalid)
            FORCE_INVALID=true
            shift
            ;;
        --force-insecure)
            FORCE_INSECURE=true
            shift
            ;;
        --force-defaults)
            FORCE_DEFAULTS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check if .env exists and handle overwriting based on the flag
if [ -f ".env" ] && [ "$FORCE_OVERWRITE" = false ]; then
    echo ".env file already exists. Use --force-overwrite to overwrite."
    exit 1
fi

echo "Generating .env file..."

# Initialize the .env file (overwrite if exists)
> .env

# Initialize COMMENT accumulator
COMMENT=""

# Initialize variable count
VAR_COUNT=0

# Read .env.sample line by line
while IFS= read -r line || [ -n "$line" ]; do
    # Trim leading and trailing whitespace
    trimmed_line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

    # Skip empty lines
    if [ -z "$trimmed_line" ]; then
        continue
    fi

    # Handle comments
    if [[ "$trimmed_line" =~ ^# ]]; then
        # Accumulate comments
        COMMENT+="$trimmed_line"$'\n'
        continue
    fi

    # Parse the variable and its default value
    if [[ "$trimmed_line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
        VAR_NAME="${BASH_REMATCH[1]}"
        DEFAULT_VALUE="${BASH_REMATCH[2]}"

        echo "Processing variable: $VAR_NAME"

        # Initialize flags for the variable
        IS_SENSITIVE=false
        IS_BOOLEAN=false
        OPTIONS=()

        # Process accumulated comments to determine variable properties
        while IFS= read -r comment_line; do
            # Check if the variable is marked as sensitive
            if [[ "$comment_line" =~ [Ss]ensitive ]]; then
                IS_SENSITIVE=true
            fi

            # Check if the variable expects a boolean value
            if [[ "$comment_line" =~ \(true\|false\) ]]; then
                IS_BOOLEAN=true
            fi

            # Check if the variable has multiple options
            if [[ "$comment_line" =~ [Oo]ptions?:[[:space:]]*(.+) ]]; then
                # Extract options and split them into an array
                IFS=', ' read -r -a OPTIONS <<< "${BASH_REMATCH[1]}"
            fi
        done <<< "$COMMENT"

        # Reset COMMENT accumulator for the next variable
        COMMENT=""

        # Construct the prompt message with variable details
        PROMPT_MESSAGE="Enter value for $VAR_NAME"
        if [ "$IS_BOOLEAN" = true ]; then
            PROMPT_MESSAGE+=" (true/false)"
        elif [ ${#OPTIONS[@]} -gt 0 ]; then
            PROMPT_MESSAGE+=" (${OPTIONS[*]})"
        fi
        PROMPT_MESSAGE+=" [${DEFAULT_VALUE}]: "

        # Function to prompt the user
        prompt_user() {
            if [ "$IS_SENSITIVE" = true ] && [ "$FORCE_INSECURE" = false ] && [ "$FORCE_DEFAULTS" = false ]; then
                read -s -p "$PROMPT_MESSAGE" USER_VALUE
                echo
            elif [ "$FORCE_DEFAULTS" = false ]; then
                read -p "$PROMPT_MESSAGE" USER_VALUE
            fi
        }

        # If FORCE_DEFAULTS is true, use default value without prompting
        if [ "$FORCE_DEFAULTS" = true ]; then
            USER_VALUE="$DEFAULT_VALUE"
            echo "Using default value for $VAR_NAME: $USER_VALUE"
        else
            # Prompt the user
            prompt_user

            # Use default value if user input is empty
            if [ -z "$USER_VALUE" ]; then
                USER_VALUE="$DEFAULT_VALUE"
                echo "Using default value for $VAR_NAME: $USER_VALUE"
            fi
        fi

        # Enforce boolean input validation unless forced invalid or forced defaults
        if [ "$IS_BOOLEAN" = true ] && [ "$FORCE_INVALID" = false ] && [ "$FORCE_DEFAULTS" = false ]; then
            while [[ "$USER_VALUE" != "true" && "$USER_VALUE" != "false" ]]; do
                echo "Invalid input. Please enter 'true' or 'false'."
                prompt_user
                if [ -z "$USER_VALUE" ]; then
                    USER_VALUE="$DEFAULT_VALUE"
                    echo "Using default value for $VAR_NAME: $USER_VALUE"
                fi
            done
        fi

        # Enforce options validation unless forced invalid or forced defaults
        if [ ${#OPTIONS[@]} -gt 0 ] && [ "$FORCE_INVALID" = false ] && [ "$FORCE_DEFAULTS" = false ]; then
            while true; do
                valid=false
                for opt in "${OPTIONS[@]}"; do
                    if [[ "$USER_VALUE" == "$opt" ]]; then
                        valid=true
                        break
                    fi
                done
                if [ "$valid" = true ]; then
                    break
                else
                    echo "Invalid input. Please choose from: ${OPTIONS[*]}"
                    prompt_user
                    if [ -z "$USER_VALUE" ]; then
                        USER_VALUE="$DEFAULT_VALUE"
                        echo "Using default value for $VAR_NAME: $USER_VALUE"
                    fi
                fi
            done
        fi

        # Write the variable and its value to the .env file
        echo "$VAR_NAME=$USER_VALUE" >> .env

        echo "Set $VAR_NAME=$USER_VALUE"

        # Increment variable count
        VAR_COUNT=$((VAR_COUNT + 1))
    else
        echo "Warning: Skipping unrecognized line: $trimmed_line" >&2
    fi

done < .env.sample

# Check if any variables were processed
if [ "$VAR_COUNT" -eq 0 ]; then
    echo "No variables were processed. Please check the .env.sample file format." >&2
    exit 1
fi

echo ".env file generated successfully."
