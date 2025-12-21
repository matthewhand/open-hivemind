import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Select } from '../DaisyUI';
import dayjs, { Dayjs } from 'dayjs';
import { useWebSocket } from '../../hooks/useWebSocket';

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
}

const ActivityMonitor: React.FC = () => {
  const { messages, metrics } = useWebSocket();
  const [filteredMessages, setFilteredMessages] = useState<MessageFlowEvent[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [uniqueAgents, setUniqueAgents] = useState<string[]>([]);
  const [uniqueProviders, setUniqueProviders] = useState<string[]>([]);

  // Extract unique agents and providers from messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      const agents = Array.from(new Set(messages.map(msg => msg.botName)));
      const providers = Array.from(new Set(messages.map(msg => msg.provider)));
      setUniqueAgents(agents);
      setUniqueProviders(providers);

      // Apply filters
      applyFilters(messages);
    } else {
      setFilteredMessages([]);
    }
  }, [messages, filters]);

  const applyFilters = (msgs: MessageFlowEvent[]) => {
    let filtered = [...msgs];

    // Filter by agent
    if (filters.agent) {
      filtered = filtered.filter(msg => msg.botName === filters.agent);
    }

    // Filter by provider
    if (filters.provider) {
      filtered = filtered.filter(msg => msg.provider === filters.provider);
    }

    // Filter by message type
    if (filters.messageType) {
      filtered = filtered.filter(msg => msg.messageType === filters.messageType);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(msg => msg.status === filters.status);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(msg => dayjs(msg.timestamp).isAfter(dayjs(filters.startDate)));
    }

    if (filters.endDate) {
      filtered = filtered.filter(msg => dayjs(msg.timestamp).isBefore(dayjs(filters.endDate)));
    }

    setFilteredMessages(filtered);
  };

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Calculate statistics
  const totalMessages = filteredMessages.length;
  const incomingMessages = filteredMessages.filter(msg => msg.messageType === 'incoming').length;
  const outgoingMessages = filteredMessages.filter(msg => msg.messageType === 'outgoing').length;
  const errorMessages = filteredMessages.filter(msg => msg.status === 'error').length;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Activity Monitoring</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">
              Total Messages
            </p>
            <h3 className="text-2xl font-bold">
              {totalMessages}
            </h3>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">
              Incoming
            </p>
            <h3 className="text-2xl font-bold text-primary">
              {incomingMessages}
            </h3>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">
              Outgoing
            </p>
            <h3 className="text-2xl font-bold text-secondary">
              {outgoingMessages}
            </h3>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">
              Errors
            </p>
            <h3 className={`text-2xl font-bold ${errorMessages > 0 ? 'text-error' : 'text-success'}`}>
              {errorMessages}
            </h3>
          </Card.Body>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Card.Body>
          <Card.Title>Filters</Card.Title>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <Select
              label="Agent"
              value={filters.agent || ''}
              onChange={(value) => handleFilterChange('agent', value || undefined)}
              options={[
                { value: '', label: 'All Agents' },
                ...uniqueAgents.map(agent => ({ value: agent, label: agent }))
              ]}
            />

            <Select
              label="Provider"
              value={filters.provider || ''}
              onChange={(value) => handleFilterChange('provider', value || undefined)}
              options={[
                { value: '', label: 'All Providers' },
                ...uniqueProviders.map(provider => ({ value: provider, label: provider }))
              ]}
            />

            <Select
              label="Message Type"
              value={filters.messageType || ''}
              onChange={(value) => handleFilterChange('messageType', value || undefined)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'incoming', label: 'Incoming' },
                { value: 'outgoing', label: 'Outgoing' }
              ]}
            />

            <Select
              label="Status"
              value={filters.status || ''}
              onChange={(value) => handleFilterChange('status', value || undefined)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'success', label: 'Success' },
                { value: 'error', label: 'Error' },
                { value: 'timeout', label: 'Timeout' }
              ]}
            />

            <Button
              variant="secondary" className="btn-outline"
              onClick={clearFilters}
              className="self-end"
            >
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Message Flow Table */}
      <Card>
        <Card.Body>
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Agent</th>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Length</th>
                  <th>Processing Time</th>
                  <th>

                    Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.id}
                    className={msg.status === 'error' ? 'bg-error/10' : ''}
                  >
                    <td>{dayjs(msg.timestamp).format('YYYY-MM-DD HH:mm:ss')}</td>
                    <td>{msg.botName}</td>
                    <td>{msg.provider}</td>
                    <td>
                      <Badge
                        variant={msg.messageType === 'incoming' ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        {msg.messageType}
                      </Badge>
                    </td>
                    <td>{msg.channelId}</td>
                    <td>{msg.contentLength}</td>
                    <td>{msg.processingTime ? `${msg.processingTime}ms` : '-'}</td>
                    <td>
                      <Badge
                        variant={msg.status === 'success' ? 'success' : msg.status === 'error' ? 'error' : 'warning'}
                        size="sm"
                      >
                        {msg.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ActivityMonitor;