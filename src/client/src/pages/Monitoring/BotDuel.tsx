import React, { useState, useEffect } from 'react';
import { Alert } from '../DaisyUI/Alert';
import Card from '../DaisyUI/Card';
import { apiService, type Bot, type StatusResponse } from '../../services/api';

interface DuelResult {
  content: string;
  latency: number;
  tokens?: number;
  cost?: number;
  error?: string;
}

const BotDuel: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [bot1Id, setBot1Id] = useState('');
  const [bot2Id, setBot2Id] = useState('');
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<[DuelResult | null, DuelResult | null]>([null, null]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const config = await apiService.getConfig();
        setBots(config.bots || []);
      } catch (err) {
        setError('Failed to fetch bots');
      }
    };
    fetchBots();
  }, []);

  const runDuel = async () => {
    if (!bot1Id || !bot2Id || !prompt) return;
    setLoading(true);
    setResults([null, null]);
    setError(null);

    const callBot = async (botId: string): Promise<DuelResult> => {
      const start = Date.now();
      try {
        const botConfig = bots.find(b => b.id === botId);
        if (!botConfig) throw new Error('Bot config not found');

        const res = await fetch('/api/bots/test-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botConfig: botConfig,
            message: prompt
          }),
        });
        
        const data = await res.json();
        const end = Date.now();

        if (!data.success) {
           throw new Error(data.message || 'API Error');
        }

        return {
          content: data.data.response || JSON.stringify(data.data),
          latency: end - start,
          tokens: Math.ceil(data.data.response?.length / 4) || 0, // heuristic
          cost: (Math.ceil(data.data.response?.length / 4) || 0) * 0.000005, // heuristic
        };
      } catch (err) {
        return { content: '', latency: 0, error: String(err) };
      }
    };

    try {
       const [r1, r2] = await Promise.all([callBot(bot1Id), callBot(bot2Id)]);
       setResults([r1, r2]);
    } catch (e) {
       setError('Failed to run duel');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">⚔️ Bot A/B Comparison (Duel)</h1>
        <p className="opacity-60 text-sm">Compare two bots side-by-side to evaluate prompts, models, and response quality.</p>
      </div>
      
      {error && <Alert status="error" message={error} />}

      <Card className="bg-base-100 shadow-xl border border-base-300">
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="form-control md:col-span-3">
            <label className="label"><span className="label-text font-bold text-primary">Bot A (Blue Corner)</span></label>
            <select className="select select-bordered w-full" value={bot1Id} onChange={e => setBot1Id(e.target.value)}>
              <option value="">Select Bot A</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name} ({b.llmProvider})</option>)}
            </select>
          </div>
          
          <div className="form-control md:col-span-3">
            <label className="label"><span className="label-text font-bold text-secondary">Bot B (Red Corner)</span></label>
            <select className="select select-bordered w-full" value={bot2Id} onChange={e => setBot2Id(e.target.value)}>
              <option value="">Select Bot B</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name} ({b.llmProvider})</option>)}
            </select>
          </div>

          <div className="form-control md:col-span-4">
            <label className="label"><span className="label-text font-bold">The Challenge Prompt</span></label>
            <input 
              type="text" 
              className="input input-bordered w-full" 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g., Explain quantum computing..."
              onKeyDown={(e) => e.key === 'Enter' && runDuel()}
            />
          </div>

          <div className="md:col-span-2">
             <button 
               className={`btn btn-accent w-full shadow-lg ${loading ? 'loading' : ''}`}
               onClick={runDuel}
               disabled={loading || !bot1Id || !bot2Id || !prompt}
             >
               {!loading && '⚔️ Duel!'}
             </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[0, 1].map(idx => {
          const isBotA = idx === 0;
          const botId = isBotA ? bot1Id : bot2Id;
          const botInfo = bots.find(b => b.id === botId);
          const res = results[idx];

          return (
            <div key={idx} className="space-y-4">
              <div className="flex items-center justify-between border-b border-base-300 pb-2">
                 <h2 className={`text-xl font-bold flex items-center gap-2 ${isBotA ? 'text-primary' : 'text-secondary'}`}>
                   {botInfo ? `${botInfo.name}` : 'Waiting for selection...'}
                 </h2>
                 {botInfo && <span className="badge badge-outline text-xs">{botInfo.llmProvider}</span>}
              </div>
              
              <div className="bg-base-200/50 rounded-2xl p-6 min-h-[400px] border border-base-300 flex flex-col">
                <div className="chat chat-end mb-4">
                  <div className="chat-bubble chat-bubble-neutral text-sm opacity-80">{prompt || '...'}</div>
                </div>
                
                {loading && !res && (
                  <div className="chat chat-start mt-4 flex-1">
                    <div className="chat-bubble bg-base-300 text-base-content flex items-center gap-2">
                       <span className="loading loading-dots loading-sm"></span> Generating...
                    </div>
                  </div>
                )}

                {res && (
                  <div className="chat chat-start mt-4 flex-1">
                    <div className={`chat-bubble shadow-md whitespace-pre-wrap text-sm ${isBotA ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                      {res.error ? `🚨 Error: ${res.error}` : res.content}
                    </div>
                  </div>
                )}

                {res && !res.error && (
                  <div className="mt-6 pt-4 border-t border-base-300/50">
                    <div className="grid grid-cols-3 gap-2 text-center">
                       <div className="bg-base-100 rounded-lg p-2 border border-base-300">
                          <p className="text-[10px] uppercase opacity-50 font-bold tracking-wider">Latency</p>
                          <p className="font-mono">{res.latency}ms</p>
                       </div>
                       <div className="bg-base-100 rounded-lg p-2 border border-base-300">
                          <p className="text-[10px] uppercase opacity-50 font-bold tracking-wider">Tokens (Est)</p>
                          <p className="font-mono">{res.tokens}</p>
                       </div>
                       <div className="bg-base-100 rounded-lg p-2 border border-base-300">
                          <p className="text-[10px] uppercase opacity-50 font-bold tracking-wider">Cost (Est)</p>
                          <p className="font-mono text-success">${res.cost?.toFixed(5)}</p>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BotDuel;
