# DaisyUI Mockup-Code Usage Guide

The DaisyUI `mockup-code` component is perfect for giving a "hacker" aesthetic to various configuration and system information displays. Here are the best areas to implement it:

## 🎯 High-Impact Areas

### 1. **System Announcements & Status**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>system.status --check</code></pre>
  <pre data-prefix=">" className="text-warning"><code>Bot Manager: 3 active instances</code></pre>
  <pre data-prefix=">" className="text-success"><code>LLM Providers: OpenAI, Anthropic online</code></pre>
  <pre data-prefix=">" className="text-info"><code>Memory: 2.1GB used / 8GB total</code></pre>
  <pre data-prefix=">" className="text-error"><code>Warning: Rate limit approaching (85%)</code></pre>
</div>
```

### 2. **Bot Configuration Display**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>hivemind config --show bot-{botId}</code></pre>
  <pre data-prefix="1"><code>name: "{botName}"</code></pre>
  <pre data-prefix="2"><code>provider: "{llmProvider}"</code></pre>
  <pre data-prefix="3"><code>platform: "{messageProvider}"</code></pre>
  <pre data-prefix="4"><code>persona: "{personaName}"</code></pre>
  <pre data-prefix="5"><code>status: {isActive ? "ACTIVE" : "INACTIVE"}</code></pre>
</div>
```

### 3. **API Key Validation Results**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>validate-keys --all</code></pre>
  <pre data-prefix="✓" className="text-success"><code>OPENAI_API_KEY: Valid (gpt-4 access)</code></pre>
  <pre data-prefix="✓" className="text-success"><code>DISCORD_BOT_TOKEN: Connected</code></pre>
  <pre data-prefix="✗" className="text-error"><code>SLACK_BOT_TOKEN: Invalid or expired</code></pre>
  <pre data-prefix="⚠" className="text-warning"><code>ANTHROPIC_API_KEY: Not configured</code></pre>
</div>
```

### 4. **Real-time Activity Log**
```tsx
<div className="mockup-code max-h-64 overflow-y-auto">
  <pre data-prefix="[12:34:56]"><code>User @john sent message in #general</code></pre>
  <pre data-prefix="[12:35:02]" className="text-info"><code>Bot responded with 156 tokens</code></pre>
  <pre data-prefix="[12:35:15]"><code>Memory updated: conversation context</code></pre>
  <pre data-prefix="[12:35:23]" className="text-warning"><code>Rate limit: 45 requests remaining</code></pre>
  <pre data-prefix="[12:35:30]" className="text-success"><code>Health check: All systems operational</code></pre>
</div>
```

### 5. **Environment Variables Display**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>env | grep HIVEMIND</code></pre>
  <pre data-prefix=">" className="text-success"><code>NODE_ENV=production</code></pre>
  <pre data-prefix=">" className="text-info"><code>BOTS=alice,bob,charlie</code></pre>
  <pre data-prefix=">" className="text-warning"><code>DEBUG_MODE=false</code></pre>
  <pre data-prefix=">" className="text-muted"><code>SESSION_SECRET=***hidden***</code></pre>
</div>
```

### 6. **Installation/Setup Commands**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>npm install open-hivemind</code></pre>
  <pre data-prefix=">" className="text-info"><code>Installing dependencies...</code></pre>
  <pre data-prefix=">" className="text-success"><code>✓ Packages installed successfully</code></pre>
  <pre data-prefix="$"><code>hivemind init --interactive</code></pre>
  <pre data-prefix="?" className="text-warning"><code>Enter your OpenAI API key:</code></pre>
</div>
```

### 7. **Error Logs & Debugging**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>tail -f logs/error.log</code></pre>
  <pre data-prefix="ERROR" className="text-error"><code>[Bot-Alice] Failed to connect to Discord</code></pre>
  <pre data-prefix="WARN" className="text-warning"><code>[LLM] Token limit exceeded, truncating</code></pre>
  <pre data-prefix="INFO" className="text-info"><code>[Memory] Conversation saved to database</code></pre>
  <pre data-prefix="DEBUG" className="text-base-content/60"><code>[WebSocket] Client connected from 192.168.1.100</code></pre>
</div>
```

### 8. **Performance Metrics**
```tsx
<div className="mockup-code">
  <pre data-prefix="$"><code>hivemind stats --realtime</code></pre>
  <pre data-prefix="CPU"><code>Usage: 23% (4 cores)</code></pre>
  <pre data-prefix="MEM"><code>RAM: 2.1GB / 8GB (26%)</code></pre>
  <pre data-prefix="NET"><code>Requests: 1,247/hour</code></pre>
  <pre data-prefix="BOT"><code>Messages: 89 sent, 156 received</code></pre>
  <pre data-prefix="LLM"><code>Tokens: 45,231 consumed today</code></pre>
</div>
```

## 🎨 Styling Variations

### Terminal-style with Colors
```tsx
<div className="mockup-code bg-base-300 text-base-content">
  <pre data-prefix="~" className="text-primary"><code>hivemind@server:/$</code></pre>
  <pre data-prefix=">" className="text-success"><code>System online ✓</code></pre>
</div>
```

### JSON Configuration Display
```tsx
<div className="mockup-code">
  <pre data-prefix="1"><code>&#123;</code></pre>
  <pre data-prefix="2"><code>  "botName": "Assistant",</code></pre>
  <pre data-prefix="3"><code>  "llmProvider": "openai",</code></pre>
  <pre data-prefix="4"><code>  "model": "gpt-4",</code></pre>
  <pre data-prefix="5"><code>  "temperature": 0.7</code></pre>
  <pre data-prefix="6"><code>&#125;</code></pre>
</div>
```

## 🚀 Implementation Examples

### Dashboard Announcements Component
```tsx
const SystemAnnouncements = () => {
  const announcements = [
    { type: 'info', message: 'New bot "Charlie" deployed successfully' },
    { type: 'warning', message: 'Scheduled maintenance in 2 hours' },
    { type: 'success', message: 'All systems operational' }
  ];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-header">
        <h2 className="card-title">🖥️ System Status</h2>
      </div>
      <div className="card-body">
        <div className="mockup-code">
          <pre data-prefix="$"><code>hivemind status --live</code></pre>
          {announcements.map((ann, i) => (
            <pre 
              key={i} 
              data-prefix=">" 
              className={`text-${ann.type === 'warning' ? 'warning' : ann.type === 'error' ? 'error' : 'success'}`}
            >
              <code>{ann.message}</code>
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Bot Configuration Viewer
```tsx
const BotConfigViewer = ({ bot }) => (
  <div className="mockup-code">
    <pre data-prefix="$"><code>cat config/bots/{bot.name}.json</code></pre>
    <pre data-prefix="1"><code>&#123;</code></pre>
    <pre data-prefix="2"><code>  "name": "{bot.name}",</code></pre>
    <pre data-prefix="3"><code>  "provider": "{bot.llmProvider}",</code></pre>
    <pre data-prefix="4"><code>  "platform": "{bot.messageProvider}",</code></pre>
    <pre data-prefix="5"><code>  "active": {bot.isActive ? 'true' : 'false'}</code></pre>
    <pre data-prefix="6"><code>&#125;</code></pre>
  </div>
);
```

## 🎯 Best Practices

1. **Use appropriate prefixes**: `$` for commands, `>` for output, line numbers for configs
2. **Color coding**: Success (green), warnings (yellow), errors (red), info (blue)
3. **Keep it readable**: Don't overcrowd with too much information
4. **Make it interactive**: Consider adding copy buttons for commands
5. **Responsive design**: Use `max-h-64 overflow-y-auto` for long outputs

This gives the entire admin interface a professional "hacker terminal" aesthetic while maintaining usability! 🚀