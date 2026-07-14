import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu } from 'lucide-react';
import EmptyState from '../DaisyUI/EmptyState';
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
        tokens: metrics.llmTokenUsage ?? 0,
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
          <div className="flex h-[300px] items-center justify-center">
            <EmptyState
              icon={Cpu}
              title="No token usage yet"
              description="Usage appears once bots start calling their LLM providers."
              variant="noData"
              className="py-8 px-4 w-full h-full flex flex-col justify-center"
            />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default LLMUsageChart;