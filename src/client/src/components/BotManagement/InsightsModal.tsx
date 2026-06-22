import React, { useState, useEffect } from 'react';
import Modal from '../DaisyUI/Modal';
import { LoadingSpinner } from '../DaisyUI/Loading';
import { Sparkles, XCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../../services/api';
import { Alert } from '../DaisyUI/Alert';
import EmptyState from '../DaisyUI/EmptyState';

interface InsightsModalProps {
  botId: string;
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

const InsightsModal: React.FC<InsightsModalProps> = ({ botId, botName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiService.get(`/api/bots/${botId}/insights`);
      if (response.success) {
        setInsights(response.data.insights);
      } else {
        throw new Error(response.message || 'Failed to fetch insights');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !insights) {
      fetchInsights();
    }
  }, [isOpen, botId]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`AI Performance Insights: ${botName}`}
      size="lg"
      ariaLabelledBy={`insights-title-${botId}`}
    >
      <div
        className="space-y-4 p-4 sm:p-6"
        role="region"
        aria-label="Insights content"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && !insights ? (
          <EmptyState
            icon={Sparkles}
            title="Analyzing Metrics"
            description="Analyzing metrics, anomalies, and historical data..."
            variant="primary"
          />
        ) : error ? (
          <Alert status="error" className="shadow-lg items-start">
            <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold">Error</h3>
              <div className="text-xs">{error}</div>
            </div>
            <button
              onClick={fetchInsights}
              className="btn btn-sm btn-ghost"
              disabled={loading}
              aria-label="Retry loading insights"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </Alert>
        ) : insights ? (
          <div className="prose prose-sm max-w-none dark:prose-invert bg-base-200/50 p-6 rounded-2xl border border-base-300">
            <ReactMarkdown>{insights}</ReactMarkdown>
            <div className="mt-8 pt-4 border-t border-base-300 flex justify-between items-center text-[10px] opacity-40 uppercase tracking-widest font-bold">
              <span>Powered by Open Hivemind Intelligence</span>
              <button 
                onClick={fetchInsights}
                className="hover:opacity-100 transition-opacity flex items-center gap-1"
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No Insights"
            description="No insights available."
            variant="noData"
          />
        )}
      </div>
    </Modal>
  );
};

export default InsightsModal;
