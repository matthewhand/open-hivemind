const fs = require('fs');
const file = 'src/client/src/components/MCP/MCPProviderManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const diff = `<<<<<<< SEARCH
              {provider.description && (
                <p className="text-sm text-base-content/70 mb-3">{provider.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-1 text-xs text-base-content/60">
                  <FaTerminal className="w-3 h-3" />
                  <span>{provider.command}</span>
                  {provider.args && (
                    <span className="text-base-content/40">{Array.isArray(provider.args) ? provider.args.join(' ') : provider.args}</span>
                  )}
                </div>

                {provider.status?.processId && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaCog className="w-3 h-3" />
                    <span>PID: {provider.status.processId}</span>
                  </div>
                )}

                {provider.status?.uptime !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaClock className="w-3 h-3" />
                    <span>Uptime: {Math.floor(provider.status.uptime / 60)}m</span>
                  </div>
                )}
              </div>
=======
              {provider.description && (
                <p className="text-sm text-base-content/70 mb-3">{provider.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-1 text-xs text-base-content/60">
                  <FaTerminal className="w-3 h-3" />
                  <span>{provider.command}</span>
                  {provider.args && (
                    <span className="text-base-content/40">{Array.isArray(provider.args) ? provider.args.join(' ') : provider.args}</span>
                  )}
                </div>

                {provider.status?.processId && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaCog className="w-3 h-3" />
                    <span>PID: {provider.status.processId}</span>
                  </div>
                )}

                {provider.status?.uptime !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaClock className="w-3 h-3" />
                    <span>Uptime: {Math.floor(provider.status.uptime / 60)}m</span>
                  </div>
                )}

                {provider.status?.lastCheck && (
                  <div className="flex items-center gap-1 text-xs text-base-content/60">
                    <FaClock className="w-3 h-3" />
                    <span>Last Connected: {
                      (() => {
                        const seconds = Math.floor((new Date().getTime() - new Date(provider.status.lastCheck).getTime()) / 1000);
                        if (seconds < 60) return "just now";
                        const minutes = Math.floor(seconds / 60);
                        if (minutes < 60) return \`\${minutes} mins ago\`;
                        const hours = Math.floor(minutes / 60);
                        if (hours < 24) return \`\${hours} hours ago\`;
                        return \`\${Math.floor(hours / 24)} days ago\`;
                      })()
                    }</span>
                  </div>
                )}

                {testResult?.toolsAvailable && (
                  <Badge variant="info" size="sm" className="ml-1 opacity-80" title="Tools Available">
                    {testResult.toolsAvailable.length} Tools
                  </Badge>
                )}
              </div>
>>>>>>> REPLACE
<<<<<<< SEARCH
              {provider.status?.status === 'running' ? (
                <Button
                  size="sm"
                  color="error"
                  onClick={() => handleStopProvider(provider.id)}
                  disabled={provider.isStopping}
                >
                  {provider.isStopping ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaStop className="w-3 h-3" />
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  color="success"
                  onClick={() => handleStartProvider(provider.id)}
                  disabled={provider.isStarting}
                >
                  {provider.isStarting ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaPlay className="w-3 h-3" />
                  )}
                </Button>
              )}
=======
              {provider.status?.status === 'running' ? (
                <Button
                  size="sm"
                  color="error"
                  onClick={() => handleStopProvider(provider.id)}
                  disabled={provider.isStopping}
                  title="Stop Provider"
                >
                  {provider.isStopping ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaStop className="w-3 h-3" />
                  )}
                </Button>
              ) : provider.status?.status === 'error' || provider.status?.status === 'disconnected' ? (
                <Button
                  size="sm"
                  color="warning"
                  onClick={() => handleStartProvider(provider.id)}
                  disabled={provider.isStarting}
                  title="Reconnect Provider"
                >
                  {provider.isStarting ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaRedo className="w-3 h-3" />
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  color="success"
                  onClick={() => handleStartProvider(provider.id)}
                  disabled={provider.isStarting}
                  title="Start Provider"
                >
                  {provider.isStarting ? (
                    <FaCog className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaPlay className="w-3 h-3" />
                  )}
                </Button>
              )}
>>>>>>> REPLACE
<<<<<<< SEARCH
      <Card key={provider.id} className="bg-base-100 shadow-lg mb-4">
=======
      <Card
        key={provider.id}
        className={\`bg-base-100 shadow-lg mb-4 \${provider.status?.status === 'error' || provider.status?.status === 'disconnected' ? 'border border-error/50 bg-error/5' : ''}\`}
      >
>>>>>>> REPLACE`;

const fsMerge = require('fs');

function applyMergeDiff(content, mergeDiff) {
    const searchBlocks = mergeDiff.split('<<<<<<< SEARCH\n').slice(1).map(block => {
        const parts = block.split('=======\n');
        const search = parts[0];
        const replace = parts[1].split('>>>>>>> REPLACE')[0];
        return { search, replace };
    });

    let modifiedContent = content;
    searchBlocks.forEach(({ search, replace }) => {
        if (!modifiedContent.includes(search)) {
            console.error('Could not find search block:');
            console.error(search);
            process.exit(1);
        }
        modifiedContent = modifiedContent.replace(search, replace);
    });
    return modifiedContent;
}

const newContent = applyMergeDiff(content, diff);
fs.writeFileSync(file, newContent, 'utf8');
console.log('Patched correctly');
