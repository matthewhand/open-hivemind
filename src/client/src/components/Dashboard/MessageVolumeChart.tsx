import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MessageSquare } from 'lucide-react';
import EmptyState from '../DaisyUI/EmptyState';
import Card from '../DaisyUI/Card';
import { useMetrics } from '../../hooks/useMetrics';

const MessageVolumeChart: React.FC = () => {
  const { metrics, loading, error } = useMetrics();
  const [data, setData] = useState<{ time: string; volume: number }[]>([]);
  const hasVolume = data.some((entry) => entry.volume > 0);

  useEffect(() => {
    if (metrics) {
      const newEntry = {
        time: new Date().toLocaleTimeString(),
        volume: metrics.messagesProcessed ?? 0,
      };
      setData((prevData) => [...prevData.slice(-9), newEntry]);
    }
  }, [metrics]);

  if (loading && data.length === 0) {
    return <p className="text-base-content">Loading message volume...</p>;
  }

  if (error) {
    return <p className="text-error">{error}</p>;
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title>Message Volume</Card.Title>
        {hasVolume ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="volume" stroke="var(--fallback-pc,oklch(var(--pc)/1))" name="Messages Processed" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Volume appears once bots start chatting."
              variant="noData"
              className="py-8 px-4 w-full h-full flex flex-col justify-center"
            />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MessageVolumeChart;