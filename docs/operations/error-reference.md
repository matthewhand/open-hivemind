# Error Reference Guide

Navigation: [Docs Index](../README.md) | [Troubleshooting](troubleshooting-decision-trees.md) | [FAQ](../getting-started/faq.md)

---

## Overview

This guide provides detailed explanations of common errors in Open-Hivemind with specific remediation steps. Each error includes the cause, symptoms, and step-by-step solutions.

---

## LLM Provider Errors

### Error: "No valid LLM providers initialized"

**Severity**: Critical - Bot cannot respond to messages

**Cause**: No LLM provider is properly configured or credentials are missing.

**Symptoms**:
- Bot connects but doesn't respond
- Logs show "No LLM provider configured"
- Health check shows LLM provider as "unavailable"

**Remediation Steps**:

1. **Verify LLM provider variable**:
   ```bash
   # Check current provider
   echo $LLM_PROVIDER

   # Common values: openai, flowise, openwebui, openswarm
   ```

2. **Check provider credentials**:
   ```bash
   # For OpenAI
   echo $OPENAI_API_KEY

   # For Flowise
   echo $FLOWISE_BASE_URL

   # For OpenWebUI
   echo $OPENWEBUI_BASE_URL
   ```

3. **Verify credentials are correct**:
   ```bash
   # Test OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"

   # Test Flowise
   curl http://localhost:3000/api/v1/chatflows
   ```

4. **Restart server**:
   ```bash
   # Stop and restart
   npm run dev
   ```

---

### Error: "channelId is missing from metadata"

**Severity**: High - Flowise integration not working

**Cause**: Using Flowise without providing required channel context.

**Symptoms**:
- Error only occurs with Flowise provider
- Works in REST mode but fails in SDK mode
- Chatflow receives no context

**Remediation Steps**:

1. **Use REST mode (recommended)**:
   ```bash
   FLOWISE_USE_REST=true
   # Remove FLOWISE_CONVERSATION_CHATFLOW_ID
   ```

2. **Or provide chatflow ID**:
   ```bash
   FLOWISE_USE_REST=false
   FLOWISE_CONVERSATION_CHATFLOW_ID=your-published-chatflow-id
   ```

3. **Verify chatflow is published**:
   - Open Flowise UI
   - Find your chatflow
   - Click "Publish" button

4. **Test connection**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/chatflows \
     -H "Content-Type: application/json" \
     -d '{"question": "test"}'
   ```

---

### Error: "API key is invalid" (OpenAI)

**Severity**: Critical - Cannot connect to OpenAI

**Cause**: Invalid or expired OpenAI API key.

**Symptoms**:
- 401 status code in logs
- "Invalid authentication" error
- Key starts with "sk-" but rejected

**Remediation Steps**:

1. **Verify key format**:
   - OpenAI keys start with `sk-`
   - Should be 40+ characters

2. **Check key in dashboard**:
   - Go to https://platform.openai.com/api-keys
   - Verify key is active
   - Check organization access

3. **Check billing**:
   - Go to https://platform.openai.com/account/billing
   - Verify payment method
   - Check usage limits

4. **Generate new key**:
   - Dashboard → API Keys → Create new secret key
   - Update environment variable
   - Restart server

---

### Error: "Connection timeout"

**Severity**: High - Provider unreachable

**Cause**: Network issues or slow provider response.

**Symptoms**:
- Request hangs then fails
- Timeout error in logs
- Works intermittently

**Remediation Steps**:

1. **Increase timeout**:
   ```bash
   OPENAI_TIMEOUT=60000        # 60 seconds
   FLOWISE_TIMEOUT=60000
   OPENWEBUI_TIMEOUT=120000
   ```

2. **Test network**:
   ```bash
   # Test connection
   curl -I --max-time 10 https://api.openai.com

   # Test DNS
   nslookup api.openai.com

   # Test with verbose
   curl -v https://api.openai.com
   ```

3. **Check firewall**:
   - Ensure outbound HTTPS (443) allowed
   - Check corporate proxies
   - Verify no geographic restrictions

4. **Check provider status**:
   - OpenAI: https://status.openai.com
   - Flowise: Check local server logs

---

## Discord Errors

### Error: "Invalid Discord bot token"

**Severity**: Critical - Bot cannot connect

**Cause**: Malformed or incorrect Discord bot token.

**Symptoms**:
- Bot shows "offline" in Discord
- Error: "Authentication failed" in logs
- 401 or 403 HTTP responses

**Remediation Steps**:

1. **Get correct token**:
   - Go to Discord Developer Portal
   - Select Application → Bot
   - Click "Reset Token" if needed
   - Copy new token

2. **Verify token format**:
   - Should be a long string (not URL)
   - Does not contain spaces
   - Should start with random characters (not "Bot ")

3. **Check token in .env**:
   ```bash
   # No "Bot " prefix
   DISCORD_BOT_TOKEN=your.actual.token.here

   # Verify no spaces
   grep DISCORD_BOT_TOKEN .env
   ```

---

### Error: "Missing Intent" (GUILD_MESSAGES)

**Severity**: High - Bot cannotCause**: Required read messages

** Discord Gateway Intent not enabled.

**Symptoms**:
- Bot online but doesn't respond
- No messages received
- "Missing Access" error in logs

**Remediation Steps**:

1. **Enable intents**:
   - Go to Discord Developer Portal
   - Select Application → Bot
   - Scroll to "Privileged Gateway Intents"
   - Enable **Message Content Intent**
   - Enable **Guild Messages** (if needed)

2. **Save changes**

3. **Restart bot**:
   ```bash
   # Restart the application
   npm run dev
   ```

---

### Error: "Missing Permissions"

**Severity**: Medium - Limited functionality

**Cause**: Bot lacks required Discord permissions.

**Symptoms**:
- Some features work, others don't
- Error in channel
- Partial functionality

**Remediation Steps**:

1. **Check required permissions**:
   - Send Messages
   - Read Message History
   - Embed Links
   - Attach Files (for image generation)

2. **Update permissions**:
   - Server Settings → Apps → Your Bot
   - Or use OAuth2 URL generator
   - Select required scopes and permissions

3. **Re-invite bot**:
   - Generate new invite link with permissions
   - Kick and re-add bot

---

## Configuration Errors

### Error: "Configuration schema validation failed"

**Severity**: High - Configuration rejected

**Cause**: Invalid value type or format in configuration.

**Symptoms**:
- Server fails to start
- Error shows validation details
- Configuration not applied

**Remediation Steps**:

1. **Check error details**:
   ```bash
   # Run with debug
   DEBUG=app:config* npm run dev
   ```

2. **Common issues**:

   | Issue | Solution |
   |-------|----------|
   | Boolean as string | Use `true`/`false`, not `"true"` |
   | Number as string | Use `10`, not `"10"` |
   | Invalid enum | Use allowed values only |
   | Missing required | Add missing field |

3. **Validate .env format**:
   ```bash
   # Correct
   MESSAGE_RATE_LIMIT_PER_CHANNEL=10
   MESSAGE_ONLY_WHEN_SPOKEN_TO=false

   # Incorrect
   MESSAGE_RATE_LIMIT_PER_CHANNEL="10"
   MESSAGE_ONLY_WHEN_SPOKEN_TO="false"
   ```

---

### Error: "Port already in use"

**Severity**: Medium - Server won't start

**Cause**: Another process using port 3028.

**Symptoms**:
- Server fails to start
- Error mentions EADDRINUSE

**Remediation Steps**:

1. **Find process using port**:
   ```bash
   # Linux
   lsof -i :3028

   # macOS
   lsof -i :3028

   # Windows
   netstat -ano | findstr :3028
   ```

2. **Stop the process**:
   ```bash
   # Kill by PID
   kill -9 <PID>

   # Or stop npm/node processes
   pkill -f "node.*open-hivemind"
   ```

3. **Or use different port**:
   ```bash
   PORT=3030 npm run dev
   ```

---

## Database Errors

### Error: "Database locked"

**Severity**: Medium - Write operations fail

**Cause**: SQLite database has lock contention.

**Symptoms**:
- Intermittent write failures
- "Database is locked" error
- Often in high-concurrency scenarios

**Remediation Steps**:

1. **Wait and retry**:
   - SQLite locks are temporary
   - Add retry logic

2. **Use WAL mode**:
   ```bash
   # Enable WAL for better concurrency
   # In SQLite config
   PRAGMA journal_mode=WAL;
   ```

3. **Consider PostgreSQL**:
   - For production, use PostgreSQL
   - Better concurrent access

---

### Error: "Connection refused" (Database)

**Severity**: Critical - Cannot connect to database

**Cause**: Database server not running or unreachable.

**Symptoms**:
- Server won't start
- Connection timeout errors

**Remediation Steps**:

1. **Check database running**:
   ```bash
   # For SQLite
   ls -la data/database.sqlite

   # For PostgreSQL
   pg_isready -h localhost -p 5432
   ```

2. **Verify connection string**:
   ```bash
   # Check environment
   echo $DATABASE_URL
   ```

3. **For SQLite**:
   ```bash
   # Recreate database
   rm data/database.sqlite
   npm run migrate
   ```

---

## MCP Server Errors

### Error: "MCP server connection failed"

**Severity**: Medium - Tools unavailable

**Cause**: Cannot connect to MCP server.

**Symptoms**:
- MCP tools not available
- Connection timeout or refused

**Remediation Steps**:

1. **Verify server URL**:
   ```bash
   # Test connectivity
   curl http://localhost:3001
   ```

2. **Check server status**:
   - Verify MCP server is running
   - Check server logs

3. **Verify API key**:
   - Ensure correct authentication
   - Check key hasn't expired

4. **Retry connection**:
   - Disconnect and reconnect in WebUI
   - Or restart MCP server

---

## Memory & Resource Errors

### Error: "JavaScript heap out of memory"

**Severity**: Critical - Process crashes

**Cause**: Node.js process exhausted available memory.

**Symptoms**:
- Process crashes unexpectedly
- OOM in logs

**Remediation Steps**:

1. **Increase Node.js memory**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```

2. **Or in package.json**:
   ```json
   {
     "scripts": {
       "dev": "node --max-old-space-size=4096 node_modules/.bin/nodemon..."
     }
   }
   ```

3. **Reduce memory usage**:
   - Reduce number of bots
   - Limit message history
   - Use lighter LLM models

4. **Add swap space**:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

---

## Rate Limiting Errors

### Error: "Discord API rate limit exceeded"

**Severity**: Medium - Temporary failure

**Cause**: Too many requests to Discord API.

**Symptoms**:
- 429 status codes
- "Rate limited" messages
- Temporary message failures

**Remediation Steps**:

1. **Reduce message volume**:
   ```bash
   MESSAGE_RATE_LIMIT_PER_CHANNEL=10
   ```

2. **Add delays**:
   ```bash
   MESSAGE_MIN_DELAY_MS=1000
   ```

3. **Use multiple bots**:
   - Distribute across bot tokens
   - Different bots for different channels

4. **Wait and retry**:
   - Rate limits are temporary (usually 5-15 seconds)
   - Implement exponential backoff

---

## Quick Error Diagnosis

| Error Pattern | Likely Cause | First Action |
|--------------|--------------|--------------|
| Bot won't connect | Token invalid | Check Discord portal |
| No responses | LLM not configured | Check provider settings |
| Slow responses | LLM latency | Check provider status |
| Intermittent failures | Rate limits | Add delays |
| Crashes | Memory | Increase NODE_OPTIONS |
| Config not applying | Cache | Restart server |
