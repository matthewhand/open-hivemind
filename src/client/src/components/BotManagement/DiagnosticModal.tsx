import React, { useState, useEffect } from 'react';
import Modal from '../DaisyUI/Modal';
import { LoadingSpinner } from '../DaisyUI/Loading';
import Timeline from '../DaisyUI/Timeline';
import Badge from '../DaisyUI/Badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity, 
  MessageSquare, 
  Brain, 
  Puzzle,
  AlertTriangle 
} from 'lucide-react';
import { apiService } from '../../services/api';

interface DiagnosticResult {
  status: 'ok' | 'error' | 'pending';
  details: string;
}

interface MCPResult {
  name: string;
  status: 'ok' | 'error';
  details?: string;
}

interface DiagnosticModalProps {
  botId: string;
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ botId, botName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiService.get(`/api/bots/${botId}/diagnose`);
      if (response.success) {
        setResults(response.data);
      } else {
        throw new Error(response.message || 'Diagnostic failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen, botId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error': return <XCircle className="w-5 h-5 text-error" />;
      default: return <Clock className="w-5 h-5 opacity-30 animate-pulse" />;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Deep Diagnostic: ${botName}`}
      size="md"
    >
      <div className="space-y-6">
        {loading && !results ? (
          <div className="py-12 text-center space-y-4">
             <LoadingSpinner lg />
             <p className="text-sm opacity-50 animate-pulse">Running multi-point handshake tests...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error">
             <XCircle className="w-6 h-6" />
             <span>{error}</span>
             <button onClick={runDiagnostic} className="btn btn-xs btn-ghost">Retry</button>
          </div>
        ) : results ? (
          <div className="space-y-6 py-2">
             <Timeline>
                <Timeline.Item 
                  start="Provider"
                  middle={getStatusIcon(results.messageProvider.status)}
                  end={
                    <div className="bg-base-200 p-3 rounded-xl flex flex-col gap-1">
                       <div className="flex justify-between items-center">
                          <span className="font-bold text-sm flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Connection</span>
                          <Badge size="xs" variant={results.messageProvider.status === 'ok' ? 'success' : 'error'}>{results.messageProvider.status}</Badge>
                       </div>
                       <p className="text-xs opacity-60">{results.messageProvider.details || 'Verifying token and socket state...'}</p>
                    </div>
                  }
                />
                
                <Timeline.Item 
                  start="LLM API"
                  middle={getStatusIcon(results.llm.status)}
                  end={
                    <div className="bg-base-200 p-3 rounded-xl flex flex-col gap-1">
                       <div className="flex justify-between items-center">
                          <span className="font-bold text-sm flex items-center gap-2"><Brain className="w-3 h-3" /> Inference</span>
                          <Badge size="xs" variant={results.llm.status === 'ok' ? 'success' : 'error'}>{results.llm.status}</Badge>
                       </div>
                       <p className="text-xs opacity-60">{results.llm.details || 'Attempting ping request...'}</p>
                    </div>
                  }
                />

                {results.mcp && results.mcp.length > 0 && results.mcp.map((m: MCPResult) => (
                  <Timeline.Item 
                    key={m.name}
                    start="MCP"
                    middle={getStatusIcon(m.status)}
                    end={
                      <div className="bg-base-200 p-3 rounded-xl flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-sm flex items-center gap-2"><Puzzle className="w-3 h-3" /> {m.name}</span>
                            <Badge size="xs" variant={m.status === 'ok' ? 'success' : 'error'}>{m.status}</Badge>
                        </div>
                        <p className="text-xs opacity-60">{m.status === 'ok' ? 'Server is responding and tools listed' : (m.details || 'Connection timeout')}</p>
                      </div>
                    }
                  />
                ))}
             </Timeline>

             <div className="pt-4 border-t border-base-300 flex justify-between items-center">
                <div className="text-[10px] opacity-30 font-mono">ID: {botId}</div>
                <div className="flex gap-2">
                   <button onClick={onClose} className="btn btn-sm btn-ghost">Close</button>
                   <button onClick={runDiagnostic} className="btn btn-sm btn-primary gap-2" disabled={loading}>
                      <Activity className="w-4 h-4" /> 
                      {loading ? 'Testing...' : 'Run Again'}
                   </button>
                </div>
             </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default DiagnosticModal;
