#!/bin/bash

# Read current .env file
source .env

echo "# New Multi-Instance Configuration"
echo "# Generated from current .env - DO NOT COPY DIRECTLY, REVIEW VALUES FIRST"
echo ""

# Detect Discord tokens (comma-separated)
if [ -n "$DISCORD_BOT_TOKEN" ]; then
    IFS=',' read -ra DISCORD_TOKENS <<< "$DISCORD_BOT_TOKEN"
    IFS=',' read -ra DISCORD_CLIENTS <<< "$DISCORD_CLIENT_ID"
    IFS=',' read -ra DISCORD_GUILDS <<< "$DISCORD_GUILD_ID"
    IFS=',' read -ra DISCORD_CHANNELS <<< "$DISCORD_CHANNEL_ID"
    IFS=',' read -ra DISCORD_VOICE_CHANNELS <<< "$DISCORD_VOICE_CHANNEL_ID"
    
    echo "# Discord Bots"
    for i in "${!DISCORD_TOKENS[@]}"; do
        bot_name="discord-bot-$((i+1))"
        echo "BOTS_${bot_name^^}_NAME=$bot_name"
        echo "BOTS_${bot_name^^}_MESSAGE_PROVIDER=discord"
        echo "BOTS_${bot_name^^}_LLM_PROVIDER=openai"
        echo "BOTS_${bot_name^^}_DISCORD_BOT_TOKEN=${DISCORD_TOKENS[$i]}"
        [ -n "${DISCORD_CLIENTS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_CLIENT_ID=${DISCORD_CLIENTS[$i]}"
        [ -n "${DISCORD_GUILDS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_GUILD_ID=${DISCORD_GUILDS[$i]}"
        [ -n "${DISCORD_CHANNELS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_CHANNEL_ID=${DISCORD_CHANNELS[$i]}"
        [ -n "${DISCORD_VOICE_CHANNELS[$i]}" ] && echo "BOTS_${bot_name^^}_DISCORD_VOICE_CHANNEL_ID=${DISCORD_VOICE_CHANNELS[$i]}"
        echo "BOTS_${bot_name^^}_OPENAI_API_KEY=$OPENAI_API_KEY"
        [ -n "$OPENAI_BASE_URL" ] && echo "BOTS_${bot_name^^}_OPENAI_BASE_URL=$OPENAI_BASE_URL"
        [ -n "$OPENAI_MODEL" ] && echo "BOTS_${bot_name^^}_OPENAI_MODEL=$OPENAI_MODEL"
        echo ""
    done
fi

# Detect Slack tokens (comma-separated)
if [ -n "$SLACK_BOT_TOKEN" ]; then
    IFS=',' read -ra SLACK_TOKENS <<< "$SLACK_BOT_TOKEN"
    IFS=',' read -ra SLACK_APPS <<< "$SLACK_APP_TOKEN"
    IFS=',' read -ra SLACK_SECRETS <<< "$SLACK_SIGNING_SECRET"
    IFS=',' read -ra SLACK_CHANNELS <<< "$SLACK_DEFAULT_CHANNEL_ID"
    IFS=',' read -ra SLACK_JOIN <<< "$SLACK_JOIN_CHANNELS"
    
    echo "# Slack Bots"
    for i in "${!SLACK_TOKENS[@]}"; do
        bot_name="slack-bot-$((i+1))"
        echo "BOTS_${bot_name^^}_NAME=$bot_name"
        echo "BOTS_${bot_name^^}_MESSAGE_PROVIDER=slack"
        echo "BOTS_${bot_name^^}_LLM_PROVIDER=flowise"
        echo "BOTS_${bot_name^^}_SLACK_BOT_TOKEN=${SLACK_TOKENS[$i]}"
        [ -n "${SLACK_APPS[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_APP_TOKEN=${SLACK_APPS[$i]}"
        [ -n "${SLACK_SECRETS[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_SIGNING_SECRET=${SLACK_SECRETS[$i]}"
        [ -n "${SLACK_CHANNELS[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_DEFAULT_CHANNEL_ID=${SLACK_CHANNELS[$i]}"
        [ -n "${SLACK_JOIN[$i]}" ] && echo "BOTS_${bot_name^^}_SLACK_JOIN_CHANNELS=${SLACK_JOIN[$i]}"
        echo "BOTS_${bot_name^^}_FLOWISE_API_KEY=$FLOWISE_API_KEY"
        [ -n "$FLOWISE_API_ENDPOINT" ] && echo "BOTS_${bot_name^^}_FLOWISE_API_BASE_URL=$FLOWISE_API_ENDPOINT"
        echo ""
    done
fi

# Build BOTS list
BOTS_LIST=""
if [ -n "$DISCORD_BOT_TOKEN" ]; then
    IFS=',' read -ra DISCORD_TOKENS <<< "$DISCORD_BOT_TOKEN"
    for i in "${!DISCORD_TOKENS[@]}"; do
        BOTS_LIST="${BOTS_LIST}discord-bot-$((i+1)),"
    done
fi
if [ -n "$SLACK_BOT_TOKEN" ]; then
    IFS=',' read -ra SLACK_TOKENS <<< "$SLACK_BOT_TOKEN"
    for i in "${!SLACK_TOKENS[@]}"; do
        BOTS_LIST="${BOTS_LIST}slack-bot-$((i+1)),"
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
echo "PORT=$PORT"
echo "FORCE_REPLY=$FORCE_REPLY"
echo "SLACK_MODE=$SLACK_MODE"
echo "MESSAGE_USERNAME_OVERRIDE=$MESSAGE_USERNAME_OVERRIDE"
