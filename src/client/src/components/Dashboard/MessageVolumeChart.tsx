import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../DaisyUI';
import { useMetrics } from '../../../hooks/useMetrics';

const MessageVolumeChart: React.FC = () => {
  const { metrics, loading, error } = useMetrics();
  const [data, setData] = useState<{ time: string; volume: number }[]>([]);

  useEffect(() => {
    if (metrics) {
      const newEntry = {
        time: new Date().toLocaleTimeString(),
        volume: metrics.messagesProcessed,
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
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="volume" stroke="#8884d8" name="Messages Processed" />
          </LineChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default MessageVolumeChart;