/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar, Area, Pie, LineChart, BarChart, AreaChart, PieChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export interface MetricData {
  timestamp: string;
  value: number;
  label?: string;
  category?: string;
}

export interface MetricChartProps {
  title: string;
  data: MetricData[];
  type?: 'line' | 'bar' | 'area' | 'pie';
  height?: number;
  color?: string;
  unit?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  refreshInterval?: number;
  onRefresh?: () => void;
  className?: string;
}

const MetricChart: React.FC<MetricChartProps> = ({
  title,
  data,
  type = 'line',
  height = 300,
  color = '#3b82f6',
  unit = '',
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  refreshInterval,
  onRefresh,
  className = '',
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const formattedData = data.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      value: item.value,
      label: item.label || '',
      category: item.category || 'default',
    }));
    setChartData(formattedData);
  }, [data]);

  useEffect(() => {
    if (refreshInterval && onRefresh) {
      const interval = setInterval(() => {
        setIsLoading(true);
        onRefresh();
        setTimeout(() => setIsLoading(false), 1000);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, onRefresh]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      width: 800,
      height: height - 50,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
    case 'bar':
      return (
        <BarChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="time" />
          <YAxis />
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          <Bar dataKey="value" fill={color} name={title} />
        </BarChart>
      );
    case 'area':
      return (
        <AreaChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="time" />
          <YAxis />
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} name={title} />
        </AreaChart>
      );
    case 'pie':
      return (
        <PieChart width={commonProps.width} height={commonProps.height} margin={commonProps.margin}>
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          <Pie
            data={chartData}
            dataKey="value"
            cx={commonProps.width / 2}
            cy={commonProps.height / 2}
            outerRadius={80}
            fill={color}
            nameKey="label"
            label
          />
        </PieChart>
      );
    default:
      return (
        <LineChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="time" />
          <YAxis />
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} name={title} />
        </LineChart>
      );
    }
  };

  const getLatestValue = () => {
    if (chartData.length === 0) {return '0';}
    const latest = chartData[chartData.length - 1];
    return `${latest.value}${unit}`;
  };

  const getAverageValue = () => {
    if (chartData.length === 0) {return '0';}
    const sum = chartData.reduce((acc, item) => acc + item.value, 0);
    return `${Math.round(sum / chartData.length)}${unit}`;
  };

  const getTrend = () => {
    if (chartData.length < 2) {return 'stable';}
    const recent = chartData.slice(-5);
    const older = chartData.slice(-10, -5);

    if (recent.length === 0 || older.length === 0) {return 'stable';}

    const recentAvg = recent.reduce((acc, item) => acc + item.value, 0) / recent.length;
    const olderAvg = older.reduce((acc, item) => acc + item.value, 0) / older.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (diff > 5) {return 'up';}
    if (diff < -5) {return 'down';}
    return 'stable';
  };

  const trend = getTrend();
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-neutral';

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="card-title text-lg">{title}</h2>
            <div className="flex gap-4 mt-2">
              <div className="stat-value text-2xl">{getLatestValue()}</div>
              <div className="stat-desc">Avg: {getAverageValue()}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isLoading && (
              <div className="loading loading-spinner loading-sm"></div>
            )}
            <div className={`flex items-center gap-1 ${trendColor}`}>
              {trend === 'up' && <span className="text-lg">↑</span>}
              {trend === 'down' && <span className="text-lg">↓</span>}
              {trend === 'stable' && <span className="text-lg">→</span>}
              <span className="text-xs">{trend}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          {chartData.length > 0 ? (
            <div className="flex justify-center">
              {renderChart()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-neutral-content/50">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p>No data available</p>
              </div>
            </div>
          )}
        </div>

        {showLegend && chartData.length > 0 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-sm text-neutral-content/70">{title}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricChart;