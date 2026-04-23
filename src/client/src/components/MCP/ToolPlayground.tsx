import React, { useState, useEffect } from 'react';
import Card from '../DaisyUI/Card';
import Button from '../DaisyUI/Button';
import List, { ListRow, ListColGrow, ListColWrap } from '../DaisyUI/List';
import Mockup from '../DaisyUI/Mockup';
import Badge from '../DaisyUI/Badge';
import { LoadingSpinner } from '../DaisyUI/Loading';
import { Alert } from '../DaisyUI/Alert';
import {
  Play,
  Terminal,
  Settings,
  Puzzle,
  ChevronRight,
  RefreshCw,
  Search,
  Code,
} from 'lucide-react';
import Input from '../DaisyUI/Input';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPServer {
  name: string;
  connected: boolean;
  tools?: MCPTool[];
}

const ToolPlayground: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [args, setArgs] = useState<string>('{}');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/servers');
      const json = await response.json();
      const allServers = json.data?.servers || [];
      setServers(allServers);
      
      if (selectedServer) {
        const updated = allServers.find((s: any) => s.name === selectedServer.name);
        if (updated) setSelectedServer(updated);
      }
    } catch (err) {
      setError('Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleExecute = async () => {
    if (!selectedServer || !selectedTool) return;
    
    setExecuting(true);
    setResult(null);
    setError(null);
    
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(args);
      } catch (e) {
        throw new Error('Invalid JSON arguments');
      }

      const response = await fetch(`/api/mcp/servers/${selectedServer.name}/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: selectedTool.name,
          arguments: parsedArgs
        })
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error);
      
      setResult(json.data?.result || json.result);
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  if (loading && servers.length === 0) return <div className="p-8 text-center"><LoadingSpinner lg /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Server & Tool Selection */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="bg-base-100 border border-base-300 shadow-sm">
           <Card.Body className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
                  <Puzzle className="w-4 h-4" /> Servers
                </h3>
                <button onClick={fetchServers} className="btn btn-xs btn-ghost btn-square" aria-label="Refresh Servers" title="Refresh Servers"><RefreshCw className="w-3 h-3" /></button>
              </div>

              <div className="space-y-2">
                 {servers.map(server => (
                   <button
                     key={server.name}
                     onClick={() => { setSelectedServer(server); setSelectedTool(null); }}
                     className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                       selectedServer?.name === server.name 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-base-200 border-transparent hover:border-base-300'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${server.connected ? 'bg-success animate-pulse' : 'bg-base-content/20'}`} />
                        <span className="font-medium text-sm">{server.name}</span>
                     </div>
                     <ChevronRight className="w-4 h-4 opacity-30" />
                   </button>
                 ))}
              </div>
           </Card.Body>
        </Card>

        {selectedServer && (
          <Card className="bg-base-100 border border-base-300 shadow-sm animate-in fade-in slide-in-from-left-4 duration-300">
             <Card.Body className="p-4">
                <h3 className="font-bold text-sm uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Available Tools
                </h3>
                
                {!selectedServer.connected ? (
                  <Alert status="warning" size="sm" message="Server disconnected" />
                ) : !selectedServer.tools || selectedServer.tools.length === 0 ? (
                  <p className="text-xs opacity-50 italic py-4 text-center">No tools exposed by this server</p>
                ) : (
                  <div className="space-y-1">
                     {selectedServer.tools.map(tool => (
                       <button
                         key={tool.name}
                         onClick={() => setSelectedTool(tool)}
                         className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
                           selectedTool?.name === tool.name
                            ? 'bg-secondary/10 text-secondary font-bold'
                            : 'hover:bg-base-200'
                         }`}
                       >
                         {tool.name}
                       </button>
                     ))}
                  </div>
                )}
             </Card.Body>
          </Card>
        )}
      </div>

      {/* Main: Execution Playground */}
      <div className="lg:col-span-8 space-y-6">
        {selectedTool ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
             <Card className="bg-base-100 border border-base-300 shadow-sm overflow-hidden">
                <div className="bg-secondary/5 p-4 border-b border-base-300 flex justify-between items-center">
                   <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-secondary" />
                        {selectedTool.name}
                      </h2>
                      <p className="text-xs opacity-60 mt-1">{selectedTool.description}</p>
                   </div>
                   <Button 
                     variant="secondary" 
                     className="gap-2 shadow-lg"
                     onClick={handleExecute}
                     loading={executing}
                   >
                      <Play className="w-4 h-4 fill-current" /> Execute Tool
                   </Button>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                         <Code className="w-3 h-3" /> Input Arguments (JSON)
                      </h4>
                      <div className="h-64 rounded-xl overflow-hidden border border-base-300">
                         <textarea
                           value={args}
                           onChange={(e) => setArgs(e.target.value)}
                           className="w-full h-full p-4 font-mono text-sm bg-neutral text-neutral-content focus:outline-none"
                           spellCheck={false}
                         />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                         <Search className="w-3 h-3" /> Schema Explorer
                      </h4>
                      <Mockup 
                        type="code" 
                        content={JSON.stringify(selectedTool.inputSchema, null, 2)}
                        className="h-64 bg-base-300 text-[11px] overflow-auto"
                      />
                   </div>
                </div>
             </Card>

             {error && <Alert status="error" message={error} />}

             {result && (
               <Card className="bg-base-100 border border-success/30 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                  <Card.Body className="p-4">
                     <h3 className="text-sm font-bold text-success uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Execution Result
                     </h3>
                     <Mockup 
                       type="code" 
                       content={JSON.stringify(result, null, 2)}
                       className="bg-neutral text-neutral-content rounded-xl"
                     />
                  </Card.Body>
               </Card>
             )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 text-center space-y-4">
             <div className="p-6 bg-base-300 rounded-full">
                <Terminal className="w-12 h-12" />
             </div>
             <div>
                <h3 className="text-xl font-bold">Tool Playground</h3>
                <p>Select a connected server and a tool to start testing</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolPlayground;

const CheckCircle = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
