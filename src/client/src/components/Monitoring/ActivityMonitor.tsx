import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Chip,
  FormControlLabel,
  Checkbox,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useWebSocket } from '../../hooks/useWebSocket';
import DataTable from '../DaisyUI/DataTable';

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
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  messageType?: 'incoming' | 'outgoing';
  status?: 'success' | 'error' | 'timeout';
}

const ActivityMonitor: React.FC = () => {
  const { messages, metrics } = useWebSocket();
  const [filteredMessages, setFilteredMessages] = useState<MessageFlowEvent[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: null,
    endDate: null
  });
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
  }, [messages]);

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
      filtered = filtered.filter(msg => dayjs(msg.timestamp).isAfter(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(msg => dayjs(msg.timestamp).isBefore(filters.endDate));
    }
    
    setFilteredMessages(filtered);
  };

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: null,
      endDate: null
    });
  };

  // Calculate statistics
  const totalMessages = filteredMessages.length;
  const incomingMessages = filteredMessages.filter(msg => msg.messageType === 'incoming').length;
  const outgoingMessages = filteredMessages.filter(msg => msg.messageType === 'outgoing').length;
  const successfulMessages = filteredMessages.filter(msg => msg.status === 'success').length;
  const errorMessages = filteredMessages.filter(msg => msg.status === 'error').length;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Activity Monitoring</Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Messages
                </Typography>
                <Typography variant="h5">
                  {totalMessages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Incoming
                </Typography>
                <Typography variant="h5" color="primary">
                  {incomingMessages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Outgoing
                </Typography>
                <Typography variant="h5" color="secondary">
                  {outgoingMessages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Errors
                </Typography>
                <Typography variant="h5" color={errorMessages > 0 ? "error" : "success"}>
                  {errorMessages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Agent</InputLabel>
                <Select
                  value={filters.agent || ''}
                  label="Agent"
                  onChange={(e) => handleFilterChange('agent', e.target.value)}
                >
                  <MenuItem value=""><em>All Agents</em></MenuItem>
                  {uniqueAgents.map(agent => (
                    <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={filters.provider || ''}
                  label="Provider"
                  onChange={(e) => handleFilterChange('provider', e.target.value)}
                >
                  <MenuItem value=""><em>All Providers</em></MenuItem>
                  {uniqueProviders.map(provider => (
                    <MenuItem key={provider} value={provider}>{provider}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Message Type</InputLabel>
                <Select
                  value={filters.messageType || ''}
                  label="Message Type"
                  onChange={(e) => handleFilterChange('messageType', e.target.value)}
                >
                  <MenuItem value=""><em>All Types</em></MenuItem>
                  <MenuItem value="incoming">Incoming</MenuItem>
                  <MenuItem value="outgoing">Outgoing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value=""><em>All Statuses</em></MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="timeout">Timeout</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Button 
                variant="outlined" 
                onClick={clearFilters}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(newValue) => handleFilterChange('startDate', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="End Date"
                value={filters.endDate}
                onChange={(newValue) => handleFilterChange('endDate', newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Paper>
        
        {/* Message Flow Table */}
        <Card>
          <CardContent>
            <DataTable
              data={filteredMessages}
              columns={[
                {
                  key: 'timestamp',
                  title: 'Timestamp',
                  sortable: true,
                  render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')
                },
                {
                  key: 'botName',
                  title: 'Agent',
                  sortable: true,
                  filterable: true
                },
                {
                  key: 'provider',
                  title: 'Provider',
                  sortable: true,
                  filterable: true
                },
                {
                  key: 'messageType',
                  title: 'Type',
                  sortable: true,
                  filterable: true,
                  render: (value: 'incoming' | 'outgoing') => (
                    <Chip 
                      label={value} 
                      size="small" 
                      color={value === 'incoming' ? 'primary' : 'secondary'} 
                    />
                  )
                },
                {
                  key: 'channelId',
                  title: 'Channel',
                  sortable: true,
                  filterable: true
                },
                {
                  key: 'contentLength',
                  title: 'Length',
                  sortable: true
                },
                {
                  key: 'processingTime',
                  title: 'Processing Time',
                  sortable: true,
                  render: (value?: number) => value ? `${value}ms` : '-'
                },
                {
                  key: 'status',
                  title: 'Status',
                  sortable: true,
                  filterable: true,
                  render: (value: 'success' | 'error' | 'timeout') => (
                    <Chip 
                      label={value} 
                      size="small" 
                      color={value === 'success' ? 'success' : value === 'error' ? 'error' : 'warning'} 
                    />
                  )
                }
              ]}
              loading={loading}
              searchable={true}
              selectable={true}
              pagination={{
                pageSize: 25,
                showSizeChanger: true,
                pageSizeOptions: [10, 25, 50, 100]
              }}
              exportable={true}
            />
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default ActivityMonitor;