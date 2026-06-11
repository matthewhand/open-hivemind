import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu } from 'lucide-react';
import Card from '../DaisyUI/Card';
import { useMetrics } from '../../hooks/useMetrics';

const LLMUsageChart: React.FC = () => {
  const { metrics, loading, error } = useMetrics();
  const [data, setData] = useState<{ time: string; tokens: number }[]>([]);
  const hasUsage = data.some((entry) => entry.tokens > 0);

  useEffect(() => {
    if (metrics) {
      const newEntry = {
        time: new Date().toLocaleTimeString(),
        tokens: metrics.llmTokenUsage,
      };
      setData((prevData) => [...prevData.slice(-9), newEntry]);
    }
  }, [metrics]);

  if (loading && data.length === 0) {
    return <p className="text-base-content">Loading LLM usage...</p>;
  }

  if (error) {
    return <p className="text-error">{error}</p>;
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title>LLM Token Usage</Card.Title>
        {hasUsage ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tokens" fill="var(--fallback-pc,oklch(var(--pc)/1))" name="Token Usage" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
            <Cpu className="h-10 w-10 text-base-content/20" aria-hidden="true" />
            <p className="text-sm text-base-content/60 max-w-xs">
              No token usage recorded yet — usage appears once bots start calling their LLM providers.
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default LLMUsageChart;