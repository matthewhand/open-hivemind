/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import DataTable from '../DaisyUI/DataTable';
import { Input, Select, Button, Badge } from '../DaisyUI';
import { Filter, X, Search } from 'lucide-react';
import dayjs from 'dayjs';

interface MessageFlowEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

interface FilterOptions {
  agent?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  messageType?: 'incoming' | 'outgoing';
  status?: 'success' | 'error' | 'timeout';
  searchQuery?: string;
}

const ActivityMonitor: React.FC = () => {
  const { messages } = useWebSocket();
  const [filters, setFilters] = useState<FilterOptions>({ startDate: '', endDate: '', searchQuery: '' });
  const [uniqueAgents, setUniqueAgents] = useState<string[]>([]);
  const [uniqueProviders, setUniqueProviders] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setUniqueAgents(Array.from(new Set(messages.map((msg: MessageFlowEvent) => msg.botName))));
      setUniqueProviders(Array.from(new Set(messages.map((msg: MessageFlowEvent) => msg.provider))));
    }
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    let filtered = [...messages];
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((m: MessageFlowEvent) =>
        m.botName.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.channelId.toLowerCase().includes(q)
      );
    }
    if (filters.agent) filtered = filtered.filter((m: MessageFlowEvent) => m.botName === filters.agent);
    if (filters.provider) filtered = filtered.filter((m: MessageFlowEvent) => m.provider === filters.provider);
    if (filters.messageType) filtered = filtered.filter((m: MessageFlowEvent) => m.messageType === filters.messageType);
    if (filters.status) filtered = filtered.filter((m: MessageFlowEvent) => m.status === filters.status);
    if (filters.startDate) filtered = filtered.filter((m: MessageFlowEvent) => dayjs(m.timestamp).isAfter(filters.startDate));
    if (filters.endDate) filtered = filtered.filter((m: MessageFlowEvent) => dayjs(m.timestamp).isBefore(filters.endDate));
    return filtered;
  }, [messages, filters]);

  const handleFilterChange = (field: keyof FilterOptions, value: any) => setFilters(prev => ({ ...prev, [field]: value }));
  const clearFilters = () => setFilters({ startDate: '', endDate: '', searchQuery: '' });

  const totalMessages = filteredMessages.length;
  const incomingMessages = filteredMessages.filter((m: MessageFlowEvent) => m.messageType === 'incoming').length;
  const outgoingMessages = filteredMessages.filter((m: MessageFlowEvent) => m.messageType === 'outgoing').length;
  const errorMessages = filteredMessages.filter((m: MessageFlowEvent) => m.status === 'error').length;

  const columns = [
    { key: 'timestamp' as keyof MessageFlowEvent, title: 'Timestamp', sortable: true, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    { key: 'botName' as keyof MessageFlowEvent, title: 'Agent', sortable: true, filterable: true },
    { key: 'provider' as keyof MessageFlowEvent, title: 'Provider', sortable: true, filterable: true },
    { key: 'messageType' as keyof MessageFlowEvent, title: 'Type', sortable: true, render: (v: string) => <Badge variant={v === 'incoming' ? 'primary' : 'secondary'} size="small">{v}</Badge> },
    { key: 'channelId' as keyof MessageFlowEvent, title: 'Channel', sortable: true },
    { key: 'contentLength' as keyof MessageFlowEvent, title: 'Length', sortable: true },
    { key: 'processingTime' as keyof MessageFlowEvent, title: 'Processing', sortable: true, render: (v: number | undefined) => v ? `${v}ms` : '-' },
    { key: 'status' as keyof MessageFlowEvent, title: 'Status', sortable: true, render: (v: string) => <Badge variant={v === 'success' ? 'success' : v === 'error' ? 'error' : 'warning'} size="small">{v}</Badge> },
  ];

  const agentOptions = [{ value: '', label: 'All Agents' }, ...uniqueAgents.map(a => ({ value: a, label: a }))];
  const providerOptions = [{ value: '', label: 'All Providers' }, ...uniqueProviders.map(p => ({ value: p, label: p }))];
  const typeOptions = [{ value: '', label: 'All Types' }, { value: 'incoming', label: 'Incoming' }, { value: 'outgoing', label: 'Outgoing' }];
  const statusOptions = [{ value: '', label: 'All Statuses' }, { value: 'success', label: 'Success' }, { value: 'error', label: 'Error' }, { value: 'timeout', label: 'Timeout' }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activity Monitoring</h2>
        <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? <X className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-200 p-4">
          <div className="text-sm text-base-content/70">Total</div>
          <div className="text-2xl font-bold">{totalMessages}</div>
        </div>
        <div className="card bg-base-200 p-4">
          <div className="text-sm text-base-content/70">Incoming</div>
          <div className="text-2xl font-bold text-primary">{incomingMessages}</div>
        </div>
        <div className="card bg-base-200 p-4">
          <div className="text-sm text-base-content/70">Outgoing</div>
          <div className="text-2xl font-bold text-secondary">{outgoingMessages}</div>
        </div>
        <div className="card bg-base-200 p-4">
          <div className="text-sm text-base-content/70">Errors</div>
          <div className={`text-2xl font-bold ${errorMessages > 0 ? 'text-error' : 'text-success'}`}>{errorMessages}</div>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-base-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />Clear
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Agent</span></label>
              <Select value={filters.agent || ''} onChange={(e) => handleFilterChange('agent', e.target.value)} options={agentOptions} size="sm" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Provider</span></label>
              <Select value={filters.provider || ''} onChange={(e) => handleFilterChange('provider', e.target.value)} options={providerOptions} size="sm" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Type</span></label>
              <Select value={filters.messageType || ''} onChange={(e) => handleFilterChange('messageType', e.target.value)} options={typeOptions} size="sm" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Status</span></label>
              <Select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} options={statusOptions} size="sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Start Date</span></label>
              <Input type="date" value={filters.startDate || ''} onChange={(e) => handleFilterChange('startDate', e.target.value)} size="sm" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">End Date</span></label>
              <Input type="date" value={filters.endDate || ''} onChange={(e) => handleFilterChange('endDate', e.target.value)} size="sm" />
            </div>
          </div>
        </div>
      )}

      <div className="card bg-base-200 p-4">
        <div className="form-control mb-4">
          <div className="input-group">
            <span className="input-group-text"><Search className="w-4 h-4" /></span>
            <Input
              type="text"
              placeholder="Search messages..."
              value={filters.searchQuery || ''}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              size="sm"
              className="w-full"
            />
          </div>
        </div>
        <DataTable
          data={filteredMessages}
          columns={columns}
          pagination={{ pageSize: 10 }}
          searchable={false}
          exportable={true}
        />
      </div>
    </div>
  );
};

export default ActivityMonitor;