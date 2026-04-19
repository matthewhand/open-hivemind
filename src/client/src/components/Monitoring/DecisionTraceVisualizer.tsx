import React, { useState, useEffect } from 'react';
import Timeline from '../DaisyUI/Timeline';
import Collapse from '../DaisyUI/Collapse';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import { LoadingSpinner } from '../DaisyUI/Loading';
import { Alert } from '../DaisyUI/Alert';
import Mockup from '../DaisyUI/Mockup';
import {
  Activity,
  ChevronRight,
  ChevronDown,
  Clock,
  Brain,
  MessageSquare,
  Zap,
  Send,
  Search,
  Filter,
} from 'lucide-react';
import { apiService } from '../../services/api';

interface TraceStage {
  name: string;
  duration: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface DecisionTrace {
  id: string;
  botId: string;
  botName: string;
  platform: string;
  input: string;
  output?: string;
  totalDuration: number;
  timestamp: string;
  stages: TraceStage[];
}

const DecisionTraceVisualizer: React.FC = () => {
  const [traces, setTraces] = useState<DecisionTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const fetchTraces = async () => {
    try {
      // For now we use the new endpoint
      const response = await fetch('/api/admin/monitoring/decision-traces');
      const data = await response.json();
      setTraces(data.traces || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch decision traces. Make sure the backend is updated.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStageIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'receive': return <MessageSquare className="w-4 h-4" />;
      case 'decision': return <Brain className="w-4 h-4" />;
      case 'enrich': return <Search className="w-4 h-4" />;
      case 'inference': return <Zap className="w-4 h-4" />;
      case 'send': return <Send className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStageColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'receive': return 'info';
      case 'decision': return 'primary';
      case 'enrich': return 'secondary';
      case 'inference': return 'accent';
      case 'send': return 'success';
      default: return 'ghost';
    }
  };

  if (loading && traces.length === 0) return <div className="p-8 text-center"><LoadingSpinner lg /></div>;
  if (error) return <Alert status="error" message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          Live Decision Traces
        </h3>
        <div className="flex gap-2">
           <Badge variant="outline">{traces.length} Recent Traces</Badge>
           <button onClick={fetchTraces} className="btn btn-xs btn-ghost"><Filter className="w-3 h-3" /> Refresh</button>
        </div>
      </div>

      {traces.length === 0 ? (
        <div className="text-center py-20 bg-base-200/50 rounded-box border-2 border-dashed border-base-300">
           <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
           <p className="opacity-50">No pipeline activity detected yet.</p>
           <p className="text-xs opacity-30 mt-1">Send a message to one of your bots to see it appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {traces.map((trace) => (
            <Card key={trace.id} className="border border-base-300 bg-base-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
               <div 
                 className="p-4 cursor-pointer flex items-center justify-between"
                 onClick={() => setExpandedTrace(expandedTrace === trace.id ? null : trace.id)}
               >
                  <div className="flex items-center gap-4 flex-1">
                     <div className="p-2 bg-primary/10 text-primary rounded-lg hidden sm:block">
                        <Activity className="w-5 h-5" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold truncate max-w-[200px]">{trace.botName}</span>
                           <Badge size="xs" variant="ghost" className="font-mono opacity-60 uppercase">{trace.platform}</Badge>
                           <span className="text-[10px] opacity-40 font-mono ml-auto sm:ml-0">{new Date(trace.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs opacity-60 truncate">"{trace.input}"</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                     <Badge variant="outline" className="hidden md:flex">{trace.totalDuration}ms</Badge>
                     {expandedTrace === trace.id ? <ChevronDown className="w-5 h-5 opacity-40" /> : <ChevronRight className="w-5 h-5 opacity-40" />}
                  </div>
               </div>

               {expandedTrace === trace.id && (
                 <div className="p-6 bg-base-200/30 border-t border-base-200 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Timeline className="mb-8">
                       {trace.stages.map((stage, idx) => (
                         <Timeline.Item 
                           key={stage.name}
                           start={new Date(stage.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           middle={
                             <div className={`p-2 rounded-full bg-${getStageColor(stage.name)} text-${getStageColor(stage.name)}-content`}>
                               {getStageIcon(stage.name)}
                             </div>
                           }
                           end={
                             <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm w-full">
                                <div className="flex justify-between items-start mb-2">
                                   <h4 className="font-bold text-sm uppercase tracking-wider">{stage.name}</h4>
                                   <Badge size="xs" variant="ghost">{stage.duration}ms</Badge>
                                </div>
                                
                                <Collapse 
                                  title="Metadata" 
                                  className="bg-base-200/50 rounded-lg text-xs" 
                                  size="sm"
                                  defaultOpen={idx === 1 || idx === 3} // Auto-open Decision and Inference
                                >
                                   <Mockup 
                                     type="code" 
                                     content={JSON.stringify(stage.metadata, null, 2)} 
                                     className="bg-neutral text-neutral-content p-2 text-[10px] max-h-40 overflow-auto"
                                   />
                                </Collapse>
                             </div>
                           }
                         />
                       ))}
                    </Timeline>

                    {trace.output && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                         <h4 className="text-xs font-bold text-primary uppercase mb-2 flex items-center gap-2">
                            <Send className="w-3 h-3" /> Final Response
                         </h4>
                         <p className="text-sm italic">"{trace.output}"</p>
                      </div>
                    )}
                 </div>
               )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecisionTraceVisualizer;
