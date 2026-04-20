import React, { useState, useEffect } from 'react';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import { Alert } from '../DaisyUI/Alert';
import { LoadingSpinner } from '../DaisyUI/Loading';
import Mockup from '../DaisyUI/Mockup';
import Button from '../DaisyUI/Button';
import { 
  Bug, 
  Play, 
  Pause, 
  Terminal, 
  RefreshCw, 
  MessageSquare,
  ChevronRight,
  Bot
} from 'lucide-react';
import { apiService } from '../../services/api';

interface Breakpoint {
  id: string;
  stage: string;
  context: any;
  timestamp: string;
}

const PipelineDebugger: React.FC = () => {
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [pausedStages, setPausedStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuring] = useState<string | null>(null);
  const [editableContext, setEditableContext] = useState<string>('');

  const fetchState = async () => {
    try {
      const response: any = await apiService.get('/api/admin/monitoring/pipeline/breakpoints');
      setBreakpoints(response.breakpoints || []);
      setPausedStages(response.pausedStages || []);
    } catch (err) {
      console.error('Failed to fetch debugger state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleBreakpoint = async (stage: string) => {
    try {
      await apiService.post('/api/admin/monitoring/pipeline/breakpoints/toggle', { stage });
      fetchState();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleResume = async (id: string) => {
    setResuring(id);
    try {
      let updatedContext = null;
      if (editableContext) {
        try {
          updatedContext = JSON.parse(editableContext);
        } catch (e) {
          alert('Invalid JSON in context editor');
          setResuring(null);
          return;
        }
      }

      await apiService.post(`/api/admin/monitoring/pipeline/resume/${id}`, { updatedContext });
      setBreakpoints(prev => prev.filter(b => b.id !== id));
      setEditableContext('');
    } catch (err) {
      console.error('Resume failed', err);
    } finally {
      setResuring(null);
    }
  };

  const selectBreakpoint = (bp: Breakpoint) => {
    setEditableContext(JSON.stringify(bp.context, null, 2));
  };

  if (loading && breakpoints.length === 0) return <div className="p-8 text-center"><LoadingSpinner lg /></div>;

  const isPausedAtValidated = pausedStages.includes('validated');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
      {/* Sidebar: Control Panel */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="bg-base-100 border border-base-300 shadow-sm">
           <Card.Body className="p-4">
              <h3 className="font-bold text-sm uppercase tracking-widest opacity-50 flex items-center gap-2 mb-4">
                 <Bug className="w-4 h-4" /> Pipeline Breakpoints
              </h3>

              <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 bg-base-200 rounded-xl border border-base-300">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${isPausedAtValidated ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'bg-base-300 opacity-50'}`}>
                          {isPausedAtValidated ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                       </div>
                       <div>
                          <p className="text-sm font-bold">Validated Message</p>
                          <p className="text-[10px] opacity-50">Pause after sanitization</p>
                       </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="toggle toggle-primary toggle-sm" 
                      checked={isPausedAtValidated}
                      onChange={() => toggleBreakpoint('validated')}
                    />
                 </div>
                 
                 <p className="text-[10px] opacity-40 px-2 leading-relaxed italic">
                    When enabled, every message hitting the pipeline will halt. You must manually resume it from the list below.
                 </p>
              </div>
           </Card.Body>
        </Card>

        <div className="space-y-3">
           <h3 className="font-bold text-xs uppercase tracking-widest opacity-50 px-2 flex justify-between items-center">
              <span>Active Halts ({breakpoints.length})</span>
              <button onClick={fetchState} className="btn btn-xs btn-ghost btn-square"><RefreshCw className="w-3 h-3" /></button>
           </h3>
           
           {breakpoints.length === 0 ? (
             <div className="text-center py-10 bg-base-200/50 rounded-2xl border-2 border-dashed border-base-300">
                <p className="text-xs opacity-30 italic">No messages currently paused</p>
             </div>
           ) : (
             breakpoints.map(bp => (
               <button
                 key={bp.id}
                 onClick={() => selectBreakpoint(bp)}
                 className="w-full text-left p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-between group"
               >
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs animate-pulse">
                       {bp.context?.botName?.charAt(0) || 'H'}
                    </div>
                    <div>
                       <p className="text-sm font-bold">{bp.context?.botName || 'Bot'}</p>
                       <p className="text-[10px] opacity-50 font-mono">{bp.id.substring(0, 10)}...</p>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 opacity-30 group-hover:translate-x-1 transition-transform" />
               </button>
             ))
           )}
        </div>
      </div>

      {/* Main: Context Editor */}
      <div className="lg:col-span-8">
        {editableContext ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
             <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <Terminal className="w-5 h-5 text-primary" />
                   Modify Pipeline Context
                </h2>
                <div className="flex gap-2">
                   <Button variant="ghost" size="sm" onClick={() => setEditableContext('')}>Cancel</Button>
                   <Button 
                     variant="primary" 
                     size="sm" 
                     className="gap-2 shadow-lg"
                     onClick={() => {
                        const id = breakpoints.find(b => JSON.stringify(b.context, null, 2) === JSON.stringify(JSON.parse(editableContext), null, 2))?.id || breakpoints[0].id;
                        handleResume(id);
                     }}
                     loading={resuming !== null}
                   >
                      <Play className="w-4 h-4 fill-current" /> Resume Pipeline
                   </Button>
                </div>
             </div>

             <div className="flex-1 min-h-[500px] rounded-3xl overflow-hidden border border-base-300 shadow-2xl relative">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                   <Badge variant="primary" size="sm">JSON</Badge>
                   <Badge variant="ghost" size="sm" className="bg-base-300">STAGE: VALIDATED</Badge>
                </div>
                <textarea
                  value={editableContext}
                  onChange={(e) => setEditableContext(e.target.value)}
                  className="w-full h-full p-8 font-mono text-sm bg-neutral text-neutral-content focus:outline-none resize-none"
                  spellCheck={false}
                />
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-6 grayscale contrast-125">
             <Bug className="w-24 h-24 stroke-[1px]" />
             <div>
                <h3 className="text-2xl font-bold">Pipeline Debugger</h3>
                <p className="max-w-md mx-auto">Enable a breakpoint and select a message from the sidebar to intercept, inspect, and modify the data before it hits the LLM.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineDebugger;
