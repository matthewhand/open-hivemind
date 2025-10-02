import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  RefreshCw as RefreshIcon,
  Download as DownloadIcon,
  Filter as FilterIcon,
  Activity as TimelineIcon,
  BarChart3 as AssessmentIcon
} from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';
import { Pagination } from '../DaisyUI';

interface ActivityFilter {
  agentId?: string;
  messageProvider?: string;
  llmProvider?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface MessageActivity {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  messageProvider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  mcpToolsUsed?: string[];
}

interface ChartData {
  timestamp: string;
  count: number;
  provider?: string;
  usage?: number;
  responseTime?: number;
}

interface ActivitySummary {
  totalMessages: number;
  totalAgents: number;
  averageResponseTime: number;
  errorRate: number;
  messagesByProvider: Record<string, number>;
  messagesByAgent: Record<string, number>;
  llmUsageByProvider: Record<string, number>;
  timeRangeStart: string;
  timeRangeEnd: string;
}

interface Agent {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ActivityMonitor: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [activities, setActivities] = useState<MessageActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Filter states
  const [filter, setFilter] = useState<ActivityFilter>({
    startDate: subHours(new Date(), 24),
    endDate: new Date(),
    limit: 100,
    offset: 0
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0
  });

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [chartInterval, setChartInterval] = useState<'hour' | 'day'>('hour');

  useEffect(() => {
    fetchAgents();
    fetchData();
  }, [filter, currentTab]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filter.agentId) queryParams.append('agentId', filter.agentId);
      if (filter.messageProvider) queryParams.append('messageProvider', filter.messageProvider);
      if (filter.llmProvider) queryParams.append('llmProvider', filter.llmProvider);
      if (filter.startDate) queryParams.append('startDate', filter.startDate.toISOString());
      if (filter.endDate) queryParams.append('endDate', filter.endDate.toISOString());
      if (filter.limit) queryParams.append('limit', filter.limit.toString());
      if (filter.offset) queryParams.append('offset', filter.offset.toString());

      const endpoints = {
        0: '/api/admin/activity/messages',
        1: '/api/admin/activity/chart-data',
        2: '/api/admin/activity/summary'
      };

      const endpoint = endpoints[currentTab as keyof typeof endpoints];
      const response = await fetch(`${endpoint}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      switch (currentTab) {
        case 0: // Messages
          setActivities(data.messages || []);
          setPagination({
            page: Math.floor((filter.offset || 0) / (filter.limit || 100)) + 1,
            totalPages: Math.ceil((data.total || 0) / (filter.limit || 100)),
            totalItems: data.total || 0
          });
          break;
        case 1: // Charts
          {
            const chartResponse = await fetch(`/api/admin/activity/chart-data?${queryParams}&interval=${chartInterval}`);
            const chartData = await chartResponse.json();
            setChartData(chartData.messageActivity || []);
          }
          break;
        case 2: // Summary
          setSummary(data.summary);
          break;
      }
    } catch (err) {
      setError(`Failed to fetch activity data: ${err}`);
      console.error('Error fetching activity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: Partial<ActivityFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter, offset: 0 }));
  };

  const handlePageChange = (page: number) => {
    const offset = (page - 1) * (filter.limit || 100);
    setFilter(prev => ({ ...prev, offset }));
  };

  const handleQuickTimeRange = (range: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '1h':
        startDate = subHours(now, 1);
        break;
      case '24h':
        startDate = subHours(now, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subHours(now, 24);
    }
    
    handleFilterChange({ startDate, endDate: now });
  };

  const exportData = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/activity/messages?${queryParams}&limit=10000`);
      const data = await response.json();
      
      const csv = [
        ['Timestamp', 'Agent', 'Provider', 'LLM', 'Type', 'Status', 'Response Time', 'Content Length'].join(','),
        ...data.messages.map((msg: MessageActivity) => [
          msg.timestamp,
          msg.agentName,
          msg.messageProvider,
          msg.llmProvider,
          msg.messageType,
          msg.status,
          msg.processingTime || '',
          msg.contentLength
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-export-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to export data: ${err}`);
    }
  };

  const getUniqueProviders = (type: 'messageProvider' | 'llmProvider') => {
    return [...new Set(agents.map(agent => agent[type]))].filter(Boolean);
  };

  const renderFilters = () => (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Filters</h3>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
        
        {showFilters && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Agent</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filter.agentId || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange({ agentId: e.target.value || undefined })}
                >
                  <option value="">All Agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Message Provider</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filter.messageProvider || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange({ messageProvider: e.target.value || undefined })}
                >
                  <option value="">All Providers</option>
                  {getUniqueProviders('messageProvider').map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">LLM Provider</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filter.llmProvider || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange({ llmProvider: e.target.value || undefined })}
                >
                  <option value="">All LLM Providers</option>
                  {getUniqueProviders('llmProvider').map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Start Date</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  value={filter.startDate ? new Date(filter.startDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange({ startDate: value ? new Date(value) : undefined });
                  }}
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">End Date</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  value={filter.endDate ? new Date(filter.endDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange({ endDate: value ? new Date(value) : undefined });
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['1h', '24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  className="btn btn-outline btn-sm"
                  onClick={() => handleQuickTimeRange(range)}
                >
                  Last {range}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessagesTab = () => (
    <div>
      {renderFilters()}
      
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Message Activity ({pagination.totalItems} total)
            </h3>
            <div className="flex gap-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={exportData}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Agent</th>
                    <th>Provider</th>
                    <th>LLM</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Length</th>
                    <th>MCP Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <div className="tooltip" data-tip={activity.timestamp}>
                          <span>{format(new Date(activity.timestamp), 'HH:mm:ss')}</span>
                        </div>
                      </td>
                      <td>{activity.agentName}</td>
                      <td>
                        <div className="badge badge-neutral">{activity.messageProvider}</div>
                      </td>
                      <td>
                        <div className="badge badge-secondary">{activity.llmProvider}</div>
                      </td>
                      <td>
                        <div className={`badge ${activity.messageType === 'incoming' ? 'badge-primary' : ''}`}>
                          {activity.messageType}
                        </div>
                      </td>
                      <td>
                        <div
                          className={`badge ${
                            activity.status === 'success' ? 'badge-success' :
                            activity.status === 'error' ? 'badge-error' : 'badge-warning'
                          }`}
                        >
                          {activity.status}
                        </div>
                      </td>
                      <td>
                        {activity.processingTime ? `${activity.processingTime}ms` : '-'}
                      </td>
                      <td>{activity.contentLength}</td>
                      <td>
                        {activity.mcpToolsUsed?.length ? (
                          <div className="tooltip" data-tip={activity.mcpToolsUsed.join(', ')}>
                            <div className="badge">{`${activity.mcpToolsUsed.length} tools`}</div>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination
                currentPage={pagination.page}
                totalItems={pagination.totalItems}
                pageSize={filter.limit || 100}
                onPageChange={handlePageChange}
                style="standard"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderChartsTab = () => (
    <div>
      {renderFilters()}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Message Activity Over Time</h3>
              <div className="form-control">
                <select
                  className="select select-bordered select-sm"
                  value={chartInterval}
                  onChange={(e) => setChartInterval(e.target.value as 'hour' | 'day')}
                >
                  <option value="hour">Hourly</option>
                  <option value="day">Daily</option>
                </select>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => format(new Date(value), chartInterval === 'hour' ? 'HH:mm' : 'MM/dd')}
                />
                <YAxis />
                <RechartsTooltip
                  labelFormatter={(value) => format(new Date(value), 'PPpp')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  name="Messages"
                />
                {chartData.some(d => d.responseTime) && (
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#82ca9d"
                    name="Avg Response Time (ms)"
                    yAxisId="right"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {summary && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-lg font-semibold mb-4">
                Messages by Provider
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(summary.messagesByProvider).map(([provider, count]) => ({
                      name: provider,
                      value: count
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.entries(summary.messagesByProvider).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSummaryTab = () => (
    <div>
      {renderFilters()}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h4 className="text-sm text-gray-500 mb-2">
                Total Messages
              </h4>
              <h3 className="text-2xl font-bold">
                {summary.totalMessages.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h4 className="text-sm text-gray-500 mb-2">
                Active Agents
              </h4>
              <h3 className="text-2xl font-bold">
                {summary.totalAgents}
              </h3>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h4 className="text-sm text-gray-500 mb-2">
                Avg Response Time
              </h4>
              <h3 className="text-2xl font-bold">
                {summary.averageResponseTime.toFixed(0)}ms
              </h3>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h4 className="text-sm text-gray-500 mb-2">
                Error Rate
              </h4>
              <h3 className={`text-2xl font-bold ${summary.errorRate > 0.05 ? 'text-error' : 'text-primary'}`}>
                {(summary.errorRate * 100).toFixed(1)}%
              </h3>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-lg font-semibold mb-4">
                Messages by Agent
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(summary.messagesByAgent).map(([agent, count]) => ({
                  agent,
                  count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-lg font-semibold mb-4">
                LLM Usage by Provider
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(summary.llmUsageByProvider).map(([provider, usage]) => ({
                  provider,
                  usage
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="provider" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="usage" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Activity Monitor
        </h1>
        <button
          className="btn btn-outline btn-sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshIcon className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button className="btn btn-sm btn-circle btn-outline" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${currentTab === 0 ? 'tab-active' : ''}`}
          onClick={() => setCurrentTab(0)}
        >
          <TimelineIcon className="w-4 h-4 mr-2" />
          Messages
        </button>
        <button
          className={`tab ${currentTab === 1 ? 'tab-active' : ''}`}
          onClick={() => setCurrentTab(1)}
        >
          <AssessmentIcon className="w-4 h-4 mr-2" />
          Charts
        </button>
        <button
          className={`tab ${currentTab === 2 ? 'tab-active' : ''}`}
          onClick={() => setCurrentTab(2)}
        >
          <AssessmentIcon className="w-4 h-4 mr-2" />
          Summary
        </button>
      </div>

      {currentTab === 0 && renderMessagesTab()}
      {currentTab === 1 && renderChartsTab()}
      {currentTab === 2 && renderSummaryTab()}
    </div>
  );
};

export default ActivityMonitor;