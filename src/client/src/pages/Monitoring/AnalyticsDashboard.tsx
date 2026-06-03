import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import Card from '../../components/DaisyUI/Card';
import Badge from '../../components/DaisyUI/Badge';
import { Alert } from '../../components/DaisyUI/Alert';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';
import Indicator from '../../components/DaisyUI/Indicator';
import {
  TrendingUp,
  AlertOctagon,
  Clock,
  Zap,
  Activity,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface Anomaly {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  expectedMean: number;
  standardDeviation: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  resolved: boolean;
  traceId?: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = async () => {
    try {
      const response = await apiService.getAnomalies();
      if (response.success) {
        setAnomalies(response.data.anomalies || []);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch system anomalies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'ghost';
    }
  };

  if (loading && anomalies.length === 0) return <div className="p-8 text-center"><LoadingSpinner lg /></div>;

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Performance Analytics
          </h2>
          <p className="text-sm opacity-50">Real-time pipeline monitoring and anomaly detection</p>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="sm" className="gap-2" onClick={fetchAnomalies}>
              <Activity className="w-4 h-4" /> Refresh Data
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Overview Cards */}
        <Card className="bg-primary/5 border border-primary/10 shadow-sm">
           <Card.Body className="p-5 flex flex-row items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                 <Clock className="w-6 h-6" />
              </div>
              <div>
                 <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Avg Latency</span>
                 <p className="text-2xl font-mono font-bold">1,240ms</p>
              </div>
           </Card.Body>
        </Card>

        <Card className="bg-secondary/5 border border-secondary/10 shadow-sm">
           <Card.Body className="p-5 flex flex-row items-center gap-4">
              <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
                 <Zap className="w-6 h-6" />
              </div>
              <div>
                 <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Throughput</span>
                 <p className="text-2xl font-mono font-bold">4.2 msg/s</p>
              </div>
           </Card.Body>
        </Card>

        <Card className="bg-error/5 border border-error/10 shadow-sm">
           <Card.Body className="p-5 flex flex-row items-center gap-4">
              <div className="p-3 bg-error/10 text-error rounded-2xl">
                 <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                 <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Active Anomalies</span>
                 <p className="text-2xl font-mono font-bold text-error">{anomalies.filter(a => !a.resolved).length}</p>
              </div>
           </Card.Body>
        </Card>
      </div>

      {/* Main Trends Area (Placeholder for Chart) */}
      <Card className="bg-base-100 border border-base-300 shadow-xl overflow-hidden">
         <div className="p-6 border-b border-base-300 flex justify-between items-center bg-base-200/30">
            <h3 className="font-bold flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-primary" /> Response Time Trends
            </h3>
            <div className="flex gap-1">
               <Badge variant="ghost" size="sm">Last 24h</Badge>
               <Badge variant="primary" size="sm">Bot-Alpha</Badge>
            </div>
         </div>
         <div className="h-64 flex items-center justify-center bg-neutral/5 italic opacity-30 text-sm">
            Interactive Latency Chart - Visualizing response times across all pipeline stages
         </div>
      </Card>

      {/* Anomalies List */}
      <div className="space-y-4">
         <h3 className="text-xl font-bold flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-error" /> Detected Anomalies
         </h3>

         {anomalies.length === 0 ? (
           <Alert status="success" message="No anomalies detected in the current monitoring window." />
         ) : (
           <div className="grid grid-cols-1 gap-4">
              {anomalies.map(anomaly => (
                <Indicator 
                  key={anomaly.id}
                  className="w-full"
                  item={<Badge variant={getSeverityColor(anomaly.severity)} size="xs" className="uppercase font-bold text-[8px]">{anomaly.severity}</Badge>}
                >
                  <Card className="bg-base-100 border border-base-300 shadow-sm hover:border-primary/30 transition-colors">
                     <Card.Body className="p-4 flex flex-row items-center gap-6">
                        <div className={`p-3 rounded-xl bg-${getSeverityColor(anomaly.severity)}/10 text-${getSeverityColor(anomaly.severity)}`}>
                           <AlertOctagon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold">{anomaly.metric} Spike Detected</span>
                              <span className="text-[10px] opacity-40 font-mono">{new Date(anomaly.timestamp).toLocaleString()}</span>
                           </div>
                           <p className="text-sm opacity-70">{anomaly.explanation}</p>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                           {anomaly.traceId && (
                             <button 
                               className="btn btn-xs btn-outline btn-primary gap-1"
                               onClick={() => (window as any).location.href = `/admin/monitoring?trace=${anomaly.traceId}`}
                             >
                                <ExternalLink className="w-3 h-3" /> View Trace
                             </button>
                           )}
                           <button className="btn btn-xs btn-ghost">Dismiss</button>
                        </div>
                     </Card.Body>
                  </Card>
                </Indicator>
              ))}
           </div>
         )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

const Button = ({ children, variant, size, className, onClick, loading }: any) => (
  <button onClick={onClick} className={`btn btn-${variant || 'primary'} btn-${size || 'md'} ${className || ''} ${loading ? 'loading' : ''}`}>
    {children}
  </button>
);
