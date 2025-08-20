#!/bin/bash

# Parse .env file directly without source
echo "# New Multi-Instance Configuration"
echo "# Generated from current .env - DO NOT COPY DIRECTLY, REVIEW VALUES FIRST"
echo ""

# Function to extract values from .env
get_env_value() {
    local key="$1"
    grep "^${key}=" .env | sed "s/^${key}=//" | sed 's/^"//' | sed 's/"$//' | head -1
}

# Read values directly
DISCORD_BOT_TOKEN=$(get_env_value "DISCORD_BOT_TOKEN")
DISCORD_CLIENT_ID=$(get_env_value "DISCORD_CLIENT_ID")
DISCORD_GUILD_ID=$(get_env_value "DISCORD_GUILD_ID")
DISCORD_CHANNEL_ID=$(get_env_value "DISCORD_CHANNEL_ID")
DISCORD_VOICE_CHANNEL_ID=$(get_env_value "DISCORD_VOICE_CHANNEL_ID")

SLACK_BOT_TOKEN=$(get_env_value "SLACK_BOT_TOKEN")
SLACK_APP_TOKEN=$(get_env_value "SLACK_APP_TOKEN")
SLACK_SIGNING_SECRET=$(get_env_value "SLACK_SIGNING_SECRET")
SLACK_DEFAULT_CHANNEL_ID=$(get_env_value "SLACK_DEFAULT_CHANNEL_ID")
SLACK_JOIN_CHANNELS=$(get_env_value "SLACK_JOIN_CHANNELS")

OPENAI_API_KEY=$(get_env_value "OPENAI_API_KEY")
OPENAI_BASE_URL=$(get_env_value "OPENAI_BASE_URL")
OPENAI_MODEL=$(get_env_value "OPENAI_MODEL")

FLOWISE_API_KEY=$(get_env_value "FLOWISE_API_KEY")
FLOWISE_API_ENDPOINT=$(get_env_value "FLOWISE_API_ENDPOINT")

PORT=$(get_env_value "PORT")
FORCE_REPLY=$(get_env_value "FORCE_REPLY")
SLACK_MODE=$(get_env_value "SLACK_MODE")
MESSAGE_USERNAME_OVERRIDE=$(get_env_value "MESSAGE_USERNAME_OVERRIDE")

# Process Discord tokens
if [ -n "$DISCORD_BOT_TOKEN" ]; then
    echo "# Discord Bots"
    IFS=',' read -ra DISCORD_TOKENS <<< "$DISCORD_BOT_TOKEN"
    IFS=',' read -ra DISCORD_CLIENTS <<< "$DISCORD_CLIENT_ID"
    IFS=',' read -ra DISCORD_GUILDS <<< "$DISCORD_GUILD_ID"
    IFS=',' read -ra DISCORD_CHANNELS <<< "$DISCORD_CHANNEL_ID"
    IFS=',' read -ra DISCORD_VOICE_CHANNELS <<< "$DISCORD_VOICE_CHANNEL_ID"
    
    for i in "${!DISCORD_TOKENS[@]}"; do
        token=$(echo "${DISCORD_TOKENS[$i]}" | xargs) # trim whitespace
        [ -z "$token" ] && continue
        
        bot_name="discord-bot-$((i+1))"
        echo "BOTS_${bot_name^^}_NAME=$bot_name"
        echo "BOTS_${bot_name^^}_MESSAGE_PROVIDER=discord"
        echo "BOTS_${bot_name^^}_LLM_PROVIDER=openai"
        echo "BOTS_${bot_name^^}_DISCORD_BOT_TOKEN=$token"
        
        [ -n "${DISCORD_CLIENTS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_CLIENT_ID=$(echo "${DISCORD_CLIENTS[$i]}" | xargs)"
        [ -n "${DISCORD_GUILDS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_GUILD_ID=$(echo "${DISCORD_GUILDS[$i]}" | xargs)"
        [ -n "${DISCORD_CHANNELS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_CHANNEL_ID=$(echo "${DISCORD_CHANNELS[$i]}" | xargs)"
        [ -n "${DISCORD_VOICE_CHANNELS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_VOICE_CHANNEL_ID=$(echo "${DISCORD_VOICE_CHANNELS[$i]}" | xargs)"
        
        [ -n "$OPENAI_API_KEY" ] && echo "BOTS_${bot_name^^}_OPENAI_API_KEY=$OPENAI_API_KEY"
        [ -n "$OPENAI_BASE_URL" ] && echo "BOTS_${bot_name^^}_OPENAI_BASE_URL=$OPENAI_BASE_URL"
        [ -n "$OPENAI_MODEL" ] && echo "BOTS_${bot_name^^}_OPENAI_MODEL=$OPENAI_MODEL"
        echo ""
    done
fi

# Process Slack tokens
if [ -n "$SLACK_BOT_TOKEN" ]; then
    echo "# Slack Bots"
    IFS=',' read -ra SLACK_TOKENS <<< "$SLACK_BOT_TOKEN"
    IFS=',' read -ra SLACK_APPS <<< "$SLACK_APP_TOKEN"
    IFS=',' read -ra SLACK_SECRETS <<< "$SLACK_SIGNING_SECRET"
    IFS=',' read -ra SLACK_CHANNELS <<< "$SLACK_DEFAULT_CHANNEL_ID"
    IFS=',' read -ra SLACK_JOIN <<< "$SLACK_JOIN_CHANNELS"
    
    for i in "${!SLACK_TOKENS[@]}"; do
        token=$(echo "${SLACK_TOKENS[$i]}" | xargs) # trim whitespace
        [ -z "$token" ] && continue
        
        bot_name="slack-bot-$((i+1))"
        echo "BOTS_${bot_name^^}_NAME=$bot_name"
        echo "BOTS_${bot_name^^}_MESSAGE_PROVIDER=slack"
        echo "BOTS_${bot_name^^}_LLM_PROVIDER=flowise"
        echo "BOTS_${bot_name^^}_SLACK_BOT_TOKEN=$token"
        
        [ -n "${SLACK_APPS[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_APP_TOKEN=$(echo "${SLACK_APPS[$i]}" | xargs)"
        [ -n "${SLACK_SECRETS[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_SIGNING_SECRET=$(echo "${SLACK_SECRETS[$i]}" | xargs)"
        [ -n "${SLACK_CHANNELS[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_DEFAULT_CHANNEL_ID=$(echo "${SLACK_CHANNELS[$i]}" | xargs)"
        [ -n "${SLACK_JOIN[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_JOIN_CHANNELS=$(echo "${SLACK_JOIN[$i]}" | xargs)"
        
        [ -n "$FLOWISE_API_KEY" ] && echo "BOTS_${bot_name^^}_FLOWISE_API_KEY=$FLOWISE_API_KEY"
        [ -n "$FLOWISE_API_ENDPOINT" ] && echo "BOTS_${bot_name^^}_FLOWISE_API_BASE_URL=$FLOWISE_API_ENDPOINT"
        echo ""
    done
fi

# Build BOTS list
BOTS_LIST=""
if [ -n "$DISCORD_BOT_TOKEN" ]; then
    IFS=',' read -ra DISCORD_TOKENS <<< "$DISCORD_BOT_TOKEN"
    for i in "${!DISCORD_TOKENS[@]}"; do
        token=$(echo "${DISCORD_TOKENS[$i]}" | xargs)
        [ -n "$token" ] && BOTS_LIST="${BOTS_LIST}discord-bot-$((i+1)),"
    done
fi
if [ -n "$SLACK_BOT_TOKEN" ]; then
    IFS=',' read -ra SLACK_TOKENS <<< "$SLACK_BOT_TOKEN"
    for i in "${!SLACK_TOKENS[@]}"; do
        token=$(echo "${SLACK_TOKENS[$i]}" | xargs)
        [ -n "$token" ] && BOTS_LIST="${BOTS_LIST}slack-bot-$((i+1)),"
    done
fi

# Remove trailing comma
BOTS_LIST=${BOTS_LIST%,}

if [ -n "$BOTS_LIST" ]; then
    echo "# Main BOTS configuration"
    echo "BOTS=$BOTS_LIST"
    echo ""
fi

echo "# Global settings (unchanged)"
[ -n "$PORT" ] && echo "PORT=$PORT"
[ -n "$FORCE_REPLY" ] && echo "FORCE_REPLY=$FORCE_REPLY"
[ -n "$SLACK_MODE" ] && echo "SLACK_MODE=$SLACK_MODE"
[ -n "$MESSAGE_USERNAME_OVERRIDE" ] && echo "MESSAGE_USERNAME_OVERRIDE=$MESSAGE_USERNAME_OVERRIDE"
