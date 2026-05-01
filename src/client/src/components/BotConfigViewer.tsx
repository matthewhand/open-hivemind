import React, { useState } from 'react';

interface BotConfig {
  id: string;
  name: string;
  llmProvider: string;
  messageProvider: string;
  model?: string;
  persona?: string;
  isActive: boolean;
  lastActivity?: Date;
  stats?: {
    messagesProcessed: number;
    tokensUsed: number;
    uptime: string;
  };
}

interface BotConfigViewerProps {
  bot: BotConfig;
  className?: string;
  showStats?: boolean;
  showJson?: boolean;
}

const BotConfigViewer: React.FC<BotConfigViewerProps> = ({
  bot,
  className = '',
  showStats = true,
  showJson = false
}) => {
  const [viewMode, setViewMode] = useState<'terminal' | 'json'>('terminal');

  const formatUptime = (uptime: string) => {
    return uptime || '2h 34m 12s';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-success' : 'text-error';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'ONLINE' : 'OFFLINE';
  };

  const renderTerminalView = () => (
    <div className="mockup-code bg-base-300">
      <pre data-prefix="$" className="text-primary">
        <code>hivemind inspect --bot {bot.name}</code>
      </pre>
      
      <pre data-prefix=">" className="text-info">
        <code>Bot Configuration Details</code>
      </pre>
      
      <pre data-prefix="├─" className="text-base-content">
        <code>ID: {bot.id}</code>
      </pre>
      
      <pre data-prefix="├─" className="text-base-content">
        <code>Name: "{bot.name}"</code>
      </pre>
      
      <pre data-prefix="├─" className="text-base-content">
        <code>LLM Provider: {bot.llmProvider}</code>
      </pre>
      
      {bot.model && (
        <pre data-prefix="├─" className="text-base-content">
          <code>Model: {bot.model}</code>
        </pre>
      )}
      
      <pre data-prefix="├─" className="text-base-content">
        <code>Platform: {bot.messageProvider}</code>
      </pre>
      
      {bot.persona && (
        <pre data-prefix="├─" className="text-base-content">
          <code>Persona: {bot.persona}</code>
        </pre>
      )}
      
      <pre data-prefix="├─" className={getStatusColor(bot.isActive)}>
        <code>Status: {getStatusText(bot.isActive)}</code>
      </pre>
      
      {bot.lastActivity && (
        <pre data-prefix="└─" className="text-base-content/60">
          <code>Last Activity: {bot.lastActivity.toLocaleString()}</code>
        </pre>
      )}
      
      {showStats && bot.stats && (
        <>
          <pre data-prefix="$" className="text-primary mt-2">
            <code>hivemind stats --bot {bot.name}</code>
          </pre>
          
          <pre data-prefix="📊" className="text-info">
            <code>Performance Metrics</code>
          </pre>
          
          <pre data-prefix="├─" className="text-success">
            <code>Messages Processed: {bot.stats.messagesProcessed.toLocaleString()}</code>
          </pre>
          
          <pre data-prefix="├─" className="text-warning">
            <code>Tokens Used: {bot.stats.tokensUsed.toLocaleString()}</code>
          </pre>
          
          <pre data-prefix="└─" className="text-info">
            <code>Uptime: {formatUptime(bot.stats.uptime)}</code>
          </pre>
        </>
      )}
    </div>
  );

  const renderJsonView = () => (
    <div className="mockup-code bg-base-300">
      <pre data-prefix="$" className="text-primary">
        <code>cat config/bots/{bot.name}.json</code>
      </pre>
      
      <pre data-prefix="1"><code>&#123;</code></pre>
      <pre data-prefix="2"><code>  "id": "{bot.id}",</code></pre>
      <pre data-prefix="3"><code>  "name": "{bot.name}",</code></pre>
      <pre data-prefix="4"><code>  "llmProvider": "{bot.llmProvider}",</code></pre>
      {bot.model && (
        <pre data-prefix="5"><code>  "model": "{bot.model}",</code></pre>
      )}
      <pre data-prefix="6"><code>  "messageProvider": "{bot.messageProvider}",</code></pre>
      {bot.persona && (
        <pre data-prefix="7"><code>  "persona": "{bot.persona}",</code></pre>
      )}
      <pre data-prefix="8" className={getStatusColor(bot.isActive)}>
        <code>  "isActive": {bot.isActive ? 'true' : 'false'},</code>
      </pre>
      {showStats && bot.stats && (
        <>
          <pre data-prefix="9"><code>  "stats": &#123;</code></pre>
          <pre data-prefix="10"><code>    "messagesProcessed": {bot.stats.messagesProcessed},</code></pre>
          <pre data-prefix="11"><code>    "tokensUsed": {bot.stats.tokensUsed},</code></pre>
          <pre data-prefix="12"><code>    "uptime": "{bot.stats.uptime}"</code></pre>
          <pre data-prefix="13"><code>  &#125;</code></pre>
        </>
      )}
      <pre data-prefix="14"><code>&#125;</code></pre>
    </div>
  );

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-header px-6 py-4 border-b border-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h3 className="card-title text-lg">Bot Configuration</h3>
              <p className="text-sm text-base-content/60">{bot.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`badge badge-sm ${bot.isActive ? 'badge-success' : 'badge-error'}`}>
              {getStatusText(bot.isActive)}
            </div>
            
            {showJson && (
              <div className="btn-group">
                <button 
                  className={`btn btn-xs ${viewMode === 'terminal' ? 'btn-active' : 'btn-ghost'}`}
                  onClick={() => setViewMode('terminal')}
                  aria-pressed={viewMode === 'terminal'}
                >
                  Terminal
                </button>
                <button 
                  className={`btn btn-xs ${viewMode === 'json' ? 'btn-active' : 'btn-ghost'}`}
                  onClick={() => setViewMode('json')}
                  aria-pressed={viewMode === 'json'}
                >
                  JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        {viewMode === 'terminal' ? renderTerminalView() : renderJsonView()}
        
        <div className="flex items-center justify-between mt-4 text-xs text-base-content/60">
          <span>Configuration loaded from: config/bots/{bot.name}.json</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default BotConfigViewer;