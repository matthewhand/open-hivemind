#!/bin/bash

echo "🚀 Running Real Integration Tests"
echo "================================="

# Check for required environment variables
MISSING_VARS=()

echo "Checking Discord credentials..."
if [ -z "$REAL_DISCORD_TOKEN" ] || [ -z "$REAL_DISCORD_CHANNEL" ]; then
  MISSING_VARS+=("Discord: REAL_DISCORD_TOKEN, REAL_DISCORD_CHANNEL")
fi

echo "Checking Slack credentials..."
if [ -z "$REAL_SLACK_TOKEN" ] || [ -z "$REAL_SLACK_CHANNEL" ] || [ -z "$REAL_SLACK_SIGNING_SECRET" ]; then
  MISSING_VARS+=("Slack: REAL_SLACK_TOKEN, REAL_SLACK_CHANNEL, REAL_SLACK_SIGNING_SECRET")
fi

echo "Checking Mattermost credentials..."
if [ -z "$REAL_MATTERMOST_URL" ] || [ -z "$REAL_MATTERMOST_TOKEN" ] || [ -z "$REAL_MATTERMOST_CHANNEL" ]; then
  MISSING_VARS+=("Mattermost: REAL_MATTERMOST_URL, REAL_MATTERMOST_TOKEN, REAL_MATTERMOST_CHANNEL")
fi

echo "Checking OpenAI credentials..."
if [ -z "$REAL_OPENAI_API_KEY" ]; then
  MISSING_VARS+=("OpenAI: REAL_OPENAI_API_KEY")
fi

echo "Checking Flowise credentials..."
if [ -z "$REAL_FLOWISE_URL" ] || [ -z "$REAL_FLOWISE_CHATFLOW_ID" ]; then
  MISSING_VARS+=("Flowise: REAL_FLOWISE_URL, REAL_FLOWISE_CHATFLOW_ID")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "⚠️  Missing credentials for:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Set environment variables to enable real integration tests"
  echo "Tests will be skipped for missing credentials"
  echo ""
fi

echo "Running real integration tests..."
NODE_CONFIG_DIR=config/test/ NODE_ENV=test npm test -- tests/integrations/**/*.real.test.ts --testTimeout=60000

echo "✅ Real integration tests completed"