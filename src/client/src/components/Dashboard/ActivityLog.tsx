/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useMemo, useState } from 'react';
import Card from '../DaisyUI/Card';
import Divider from '../DaisyUI/Divider';
import { Alert } from '../DaisyUI/Alert';
import Button from '../DaisyUI/Button';
import { SkeletonTimeline } from '../DaisyUI/Skeleton';
import { Loading } from '../DaisyUI/Loading';
import Select from '../DaisyUI/Select';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useGetActivityQuery } from '../../store/slices/apiSlice';
import type { ActivityResponse } from '../../services/api';
import DataTable from '../DaisyUI/DataTable';

interface ActivityFilters {
  bot?: string;
  messageProvider?: string;
  llmProvider?: string;
  from?: string;
  to?: string;
}

const ActivityLog: React.FC = () => {
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<ActivityFilters>({});

  const { data, isLoading, isFetching, error, refetch } = useGetActivityQuery(appliedFilters);

  const handleApply = () => {
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters({});
    setAppliedFilters({});
  };

  const uniqueMessageProviders = useMemo(() => data?.filters?.messageProviders ?? [], [data]);
  const uniqueLlmProviders = useMemo(() => data?.filters?.llmProviders ?? [], [data]);
  const uniqueAgents = useMemo(() => data?.filters?.agents ?? [], [data]);

  const messageTimeline = useMemo(() => buildTimelineSeries(data, 'messageProviders', uniqueMessageProviders), [data, uniqueMessageProviders]);
  const llmTimeline = useMemo(() => buildTimelineSeries(data, 'llmProviders', uniqueLlmProviders), [data, uniqueLlmProviders]);

  // ⚡ Bolt Optimization: Memoize formatting of recent events list to prevent redundant date parsing and map iterations
  const recentEventsList = useMemo(() => {
    if (!data?.events?.length) return null;
    return [...data.events].reverse().map((event, index) => (
      <li key={event.id}>
        <div className="py-3">
          <div className="font-medium">
            {event.botName} · {event.provider} · {event.llmProvider}
          </div>
          <div className="text-sm text-base-content/70 mt-1">
            {formatTimestamp(event.timestamp)} — {event.messageType} — {event.status}
            {event.errorMessage ? ` (${event.errorMessage})` : ''}
          </div>
        </div>
        {index < data.events!.length - 1 && <Divider className="my-0" />}
      </li>
    ));
  }, [data?.events]);

  return (
    <Card className="mt-6">
      <Card.Body>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <Card.Title>Activity Feed</Card.Title>
          <div className="flex gap-2">
            <Button variant="secondary" className="btn-outline" onClick={() => refetch()} disabled={isFetching}>
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button variant="primary" onClick={handleApply}>
              Apply Filters
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Select
            label="Agent"
            value={filters.bot || ''}
            onChange={(value) => setFilters(prev => ({ ...prev, bot: value || undefined }))}
            options={[
              { value: '', label: 'All' },
              ...uniqueAgents.map(agent => ({ value: agent, label: agent })),
            ]}
          />
          <Select
            label="Message Provider"
            value={filters.messageProvider || ''}
            onChange={(value) => setFilters(prev => ({ ...prev, messageProvider: value || undefined }))}
            options={[
              { value: '', label: 'All' },
              ...uniqueMessageProviders.map(provider => ({ value: provider, label: provider })),
            ]}
          />
          <Select
            label="LLM Provider"
            value={filters.llmProvider || ''}
            onChange={(value) => setFilters(prev => ({ ...prev, llmProvider: value || undefined }))}
            options={[
              { value: '', label: 'All' },
              ...uniqueLlmProviders.map(provider => ({ value: provider, label: provider })),
            ]}
          />
          <div>
            <label className="label">
              <span className="label-text">From</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={filters.from || ''}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value || undefined }))}
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">To</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={filters.to || ''}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value || undefined }))}
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonTimeline items={4} />
        ) : error ? (
          <Alert variant="error">Failed to load activity log</Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Message Provider Activity</h3>
              <TimelineChart data={messageTimeline} seriesKeys={uniqueMessageProviders} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">LLM Usage Activity</h3>
              <TimelineChart data={llmTimeline} seriesKeys={uniqueLlmProviders} />
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Per-Agent Metrics</h3>
              <AgentMetricsTable metrics={data?.agentMetrics ?? []} />
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
              {recentEventsList ? (
                <ul className="menu bg-base-200 w-full rounded-box">
                  {recentEventsList}
                </ul>
              ) : (
                <p className="text-base-content/70 text-center py-4">
                  No activity recorded for the selected filters.
                </p>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

interface TimelineChartProps {
  data: Array<Record<string, number | string>>;
  seriesKeys: string[];
}

const colors = ['#1976d2', '#9c27b0', '#009688', '#ff5722', '#607d8b', '#795548'];

const TimelineChart: React.FC<TimelineChartProps> = ({ data, seriesKeys }) => {
  if (!data.length || !seriesKeys.length) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <p className="text-base-content/70">
          Not enough data to display a timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={formatShortTime} minTickGap={40} />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: number) => value.toString()} labelFormatter={formatTimestamp} />
          <Legend />
          {seriesKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

function buildTimelineSeries(data: ActivityResponse | undefined, field: 'messageProviders' | 'llmProviders', keys: string[]) {
  if (!data || !data.timeline?.length || keys.length === 0) {
    return [];
  }
  return data.timeline.map(bucket => {
    const entry: Record<string, number | string> = { timestamp: bucket.timestamp };
    keys.forEach(key => {
      entry[key] = (bucket[field] ?? {})[key] || 0;
    });
    return entry;
  });
}

interface AgentMetricsTableProps {
  metrics: ActivityResponse['agentMetrics'];
}

const AgentMetricsTable: React.FC<AgentMetricsTableProps> = ({ metrics }) => {
  if (!metrics.length) {
    return (
      <p className="text-base-content/70 text-center py-4">
        No per-agent metrics available for the selected filters.
      </p>
    );
  }

  return (
    <DataTable
      data={metrics}
      columns={[
        { key: 'botName' as any, title: 'Agent', prominent: true },
        { key: 'messageProvider' as any, title: 'Provider' },
        { key: 'llmProvider' as any, title: 'LLM' },
        { key: 'events' as any, title: 'Events' },
        { key: 'errors' as any, title: 'Errors' },
        { key: 'totalMessages' as any, title: 'Total Messages' },
        { key: 'lastActivity' as any, title: 'Last Activity', render: (v: string) => formatTimestamp(v) },
        { key: 'recentErrors' as any, title: 'Recent Errors', render: (v: string[]) => (v ?? []).slice(-3).join(', ') || '\u2014' },
      ]}
      rowKey={(m: any) => m.botName}
    />
  );
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {return value;}
  return date.toLocaleString();
}

function formatShortTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {return value;}
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default ActivityLog;
