import React, { useState } from 'react';
import Modal from '../DaisyUI/Modal';
import { LoadingSpinner } from '../DaisyUI/Loading';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import { 
  Trophy, 
  Timer, 
  Zap, 
  Brain, 
  BarChart, 
  RotateCcw,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { apiService } from '../../services/api';
import { Stat, Stats } from '../DaisyUI/Stat';

interface BenchmarkResult {
  question: string;
  latency: number;
  responseLength: number;
  tokensPerSecond: number;
}

interface BenchmarkSummary {
  botName: string;
  provider: string;
  avgLatency: number;
  totalTime: number;
  iqScore: number;
  results: BenchmarkResult[];
}

interface BenchmarkModalProps {
  botId: string;
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ botId, botName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiService.post(`/api/bots/${botId}/benchmark`, {});
      if (response.success) {
        setData(response.data);
      } else {
        throw new Error(response.message || 'Benchmark failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !data && !loading) {
      runBenchmark();
    }
  }, [isOpen]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
           <Trophy className="w-5 h-5 text-warning" />
           <span>Performance Benchmark: {botName}</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center space-y-4">
             <div className="relative inline-block">
                <Cpu className="w-16 h-16 text-primary animate-pulse" />
                <Zap className="w-6 h-6 text-warning absolute -top-1 -right-1 animate-bounce" />
             </div>
             <LoadingSpinner lg />
             <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Executing Standardized IQ & Latency Suite...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error">
             <span>{error}</span>
             <button onClick={runBenchmark} className="btn btn-xs btn-ghost underline">Retry</button>
          </div>
        ) : data ? (
          <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Stats className="bg-base-200 border-none shadow-inner rounded-3xl overflow-hidden">
                <Stat 
                  title="Standardized IQ" 
                  value={data.iqScore} 
                  icon={<Brain className="w-5 h-5 text-secondary" />}
                  description="Logic & Reasoning"
                />
                <Stat 
                  title="Avg Latency" 
                  value={`${data.avgLatency}ms`} 
                  icon={<Timer className="w-5 h-5 text-primary" />}
                  description="End-to-end response"
                />
                <Stat 
                  title="Provider" 
                  value={data.provider.toUpperCase()} 
                  icon={<Zap className="w-5 h-5 text-warning" />}
                  description="Engine efficiency"
                />
             </Stats>

             <div className="grid grid-cols-1 gap-3">
                <h4 className="text-xs font-bold opacity-40 uppercase tracking-widest px-1">Detailed Test Case Results</h4>
                {data.results.map((res, idx) => (
                  <div key={idx} className="bg-base-100 border border-base-300 p-4 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-colors shadow-sm">
                     <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                           <CheckCircle2 className="w-3 h-3 text-success" />
                           <span className="text-xs font-bold truncate italic opacity-80">"{res.question}"</span>
                        </div>
                        <div className="flex gap-4">
                           <span className="text-[10px] opacity-40">Latency: <b>{res.latency}ms</b></span>
                           <span className="text-[10px] opacity-40">Throughput: <b>{res.tokensPerSecond} tok/s</b></span>
                        </div>
                     </div>
                     <Badge variant="ghost" className="font-mono text-[10px]">{res.responseLength} chars</Badge>
                  </div>
                ))}
             </div>

             <div className="flex justify-between items-center pt-4 border-t border-base-300">
                <p className="text-[10px] opacity-30 italic max-w-[200px]">
                   Benchmarks are indicative and based on standardized logic tests.
                </p>
                <div className="flex gap-2">
                   <button onClick={onClose} className="btn btn-sm btn-ghost">Close</button>
                   <button onClick={runBenchmark} className="btn btn-sm btn-primary gap-2">
                      <RotateCcw className="w-4 h-4" /> Re-Run
                   </button>
                </div>
             </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default BenchmarkModal;
