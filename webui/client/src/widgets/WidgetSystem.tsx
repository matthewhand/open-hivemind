import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Select,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';
import { AdaptiveGrid } from '../components/ResponsiveComponents';

export interface WidgetConfig {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'alert' | 'custom';
  title: string;
  description?: string;
  position: { x: number; y: number; w: number; h: number };
  dataSource: string;
  refreshInterval: number;
  visible: boolean;
  settings: Record<string, unknown>;
}

export interface DragState {
  isDragging: boolean;
  draggedWidget: string | null;
  offset: { x: number; y: number };
}

interface WidgetSystemProps {
  widgets: WidgetConfig[];
  onWidgetUpdate: (widget: WidgetConfig) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetAdd: (widget: Omit<WidgetConfig, 'id'>) => void;
  editable?: boolean;
  showToolbar?: boolean;
  autoSave?: boolean;
}

const defaultWidgets: WidgetConfig[] = [
  {
    id: 'response-time',
    type: 'metric',
    title: 'Response Time',
    position: { x: 0, y: 0, w: 3, h: 2 },
    dataSource: 'performance.responseTime',
    refreshInterval: 5000,
    visible: true,
    settings: {
      unit: 'ms',
      threshold: 500,
      colorScheme: 'gradient',
    },
  },
  {
    id: 'memory-usage',
    type: 'metric',
    title: 'Memory Usage',
    position: { x: 3, y: 0, w: 3, h: 2 },
    dataSource: 'performance.memoryUsage',
    refreshInterval: 10000,
    visible: true,
    settings: {
      unit: '%',
      threshold: 80,
      colorScheme: 'progress',
    },
  },
  {
    id: 'bot-status',
    type: 'status',
    title: 'Bot Status',
    position: { x: 6, y: 0, w: 3, h: 2 },
    dataSource: 'dashboard.bots',
    refreshInterval: 3000,
    visible: true,
    settings: {
      showDetails: true,
      groupBy: 'status',
    },
  },
  {
    id: 'error-rate',
    type: 'chart',
    title: 'Error Rate Trend',
    position: { x: 0, y: 2, w: 6, h: 4 },
    dataSource: 'performance.errorRate',
    refreshInterval: 15000,
    visible: true,
    settings: {
      chartType: 'line',
      timeRange: '24h',
      showGrid: true,
      animate: true,
    },
  },
];

const MetricWidget: React.FC<{ widget: WidgetConfig; data: number }> = ({ widget, data }) => {
  const { settings } = widget;
  const threshold = settings.threshold as number || 100;
  const percentage = Math.min((data / threshold) * 100, 100);
  const color = percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          {widget.title}
        </Typography>
        
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              color={`${color}.main`}
              sx={{ fontWeight: 'bold' }}
            >
              {data.toFixed(1)}
            </Typography>
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {settings.unit}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            width: '100%',
            height: 8,
            backgroundColor: '#e0e0e0',
            borderRadius: 4,
            overflow: 'hidden',
            mt: 2,
          }}
        >
          <Box
            sx={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: `${color}.main`,
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {percentage.toFixed(0)}% of threshold ({threshold}{typeof settings.unit === 'string' ? settings.unit : 'ms'})
        </Typography>
      </CardContent>
    </Card>
  );
};

const StatusWidget: React.FC<{ widget: WidgetConfig; data: Record<string, unknown>[] }> = ({ widget, data }) => {
  const activeCount = data.filter(item => item.status === 'active').length;
  const errorCount = data.filter(item => item.status === 'error').length;
  const connectingCount = data.filter(item => item.status === 'connecting').length;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {widget.title}
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Active</Typography>
            <Chip label={activeCount} color="success" size="small" />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Connecting</Typography>
            <Chip label={connectingCount} color="warning" size="small" />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">Errors</Typography>
            <Chip label={errorCount} color="error" size="small" />
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Total: {data.length} bots
        </Typography>
      </CardContent>
    </Card>
  );
};

const ChartWidget: React.FC<{ widget: WidgetConfig; data: number[] }> = ({ widget, data }) => {
  const { settings } = widget;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {widget.title}
        </Typography>
        
        <Box sx={{ height: 200, position: 'relative' }}>
          {/* Simple chart visualization */}
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1976d2" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#42a5f5" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            
            {/* Grid lines */}
            {[20, 40, 60, 80].map(y => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#e0e0e0"
                strokeWidth="0.5"
              />
            ))}
            
            {/* Data line */}
            <polyline
              points={data.map((value, index) => 
                `${(index / (data.length - 1)) * 100},${100 - (value / 100) * 80}`
              ).join(' ')}
              fill="none"
              stroke="#1976d2"
              strokeWidth="2"
            />
            
            {/* Data points */}
            {data.map((value, index) => (
              <circle
                key={index}
                cx={(index / (data.length - 1)) * 100}
                cy={100 - (value / 100) * 80}
                r="3"
                fill="#1976d2"
              />
            ))}
          </svg>
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          Chart Type: {typeof settings.chartType === 'string' ? settings.chartType : 'line'} • Range: {typeof settings.timeRange === 'string' ? settings.timeRange : '24h'}
        </Typography>
      </CardContent>
    </Card>
  );
};

const WidgetRenderer: React.FC<{ widget: WidgetConfig; editable?: boolean; onEdit?: () => void; onDelete?: () => void }> = ({
  widget,
  editable = false,
  onEdit,
  onDelete,
}) => {
  const { performance, dashboard } = useAppSelector((state) => state);

  // Simulate data fetching based on dataSource
  const getWidgetData = () => {
    switch (widget.dataSource) {
      case 'performance.responseTime':
        return performance.responseTime || 0;
      case 'performance.memoryUsage':
        return performance.memoryUsage || 0;
      case 'performance.cpuUsage':
        return performance.cpuUsage || 0;
      case 'performance.errorRate':
        return performance.errorRate || 0;
      case 'dashboard.bots':
        return dashboard.bots || [];
      case 'dashboard.analytics':
        return dashboard.analytics || {};
      default:
        return Math.random() * 100; // Fallback for demo
    }
  };

  const data = getWidgetData();

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        '&:hover .widget-controls': {
          opacity: editable ? 1 : 0,
        },
      }}
    >
      {/* Widget Content */}
      {widget.type === 'metric' && <MetricWidget widget={widget} data={data as number} />}
      {widget.type === 'status' && <StatusWidget widget={widget} data={data as Record<string, unknown>[]} />}
      {widget.type === 'chart' && <ChartWidget widget={widget} data={data as number[] || [20, 35, 45, 60, 75, 85, 70, 65]} />}
      
      {/* Edit Controls */}
      {editable && (
        <Box
          className="widget-controls"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            gap: 0.5,
          }}
        >
          <IconButton
            size="small"
            onClick={onEdit}
            sx={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: 1 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: 1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export const WidgetSystem: React.FC<WidgetSystemProps> = ({
  widgets: externalWidgets,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetAdd,
  editable = false,
  showToolbar = true,
  autoSave = false,
}) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(externalWidgets || defaultWidgets);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    draggedWidget: null,
    offset: { x: 0, y: 0 },
  });

  // Auto-save functionality
  useEffect(() => {
    if (autoSave) {
      // Save widget configuration
      console.log('Widget configuration saved:', widgets);
    }
  }, [widgets, autoSave]);

  const handleWidgetEdit = (widget: WidgetConfig) => {
    setEditingWidget(widget);
  };

  const handleWidgetDelete = (widgetId: string) => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      const newWidgets = widgets.filter(w => w.id !== widgetId);
      setWidgets(newWidgets);
      onWidgetDelete(widgetId);
    }
  };

  const handleAddWidget = (newWidget: Omit<WidgetConfig, 'id'>) => {
    const widget: WidgetConfig = {
      ...newWidget,
      id: `widget-${Date.now()}`,
    };
    
    setWidgets([...widgets, widget]);
    onWidgetAdd(newWidget);
    setShowAddDialog(false);
  };


  return (
    <Box sx={{ width: '100%', minHeight: 600 }}>
      {/* Toolbar */}
      {showToolbar && editable && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            p: 2,
            backgroundColor: 'background.default',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6">
            <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Dashboard Widgets
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Add Widget
          </Button>
        </Box>
      )}

      {/* Widget Grid */}
      <AdaptiveGrid breakpoints={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        {widgets.map((widget) => (
          <WidgetRenderer
            key={widget.id}
            widget={widget}
            editable={editable}
            onEdit={() => handleWidgetEdit(widget)}
            onDelete={() => handleWidgetDelete(widget.id)}
          />
        ))}
      </AdaptiveGrid>

      {/* Add Widget Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Widget</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Widget Title"
              defaultValue="New Widget"
              onChange={() => {
                // Handle title change for new widget
              }}
            />
            
            <Select
              fullWidth
              defaultValue="metric"
              label="Widget Type"
            >
              <MenuItem value="metric">Metric</MenuItem>
              <MenuItem value="chart">Chart</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="table">Table</MenuItem>
            </Select>
            
            <TextField
              fullWidth
              label="Data Source"
              defaultValue="performance.responseTime"
              helperText="Select the data source for this widget"
            />
            
            <TextField
              fullWidth
              label="Refresh Interval (ms)"
              type="number"
              defaultValue={5000}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            handleAddWidget({
              type: 'metric',
              title: 'New Widget',
              position: { x: 0, y: 0, w: 3, h: 2 },
              dataSource: 'performance.responseTime',
              refreshInterval: 5000,
              visible: true,
              settings: {},
            });
          }}>
            Add Widget
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Widget Dialog */}
      <Dialog
        open={!!editingWidget}
        onClose={() => setEditingWidget(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Widget</DialogTitle>
        <DialogContent>
          {editingWidget && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Widget Title"
                defaultValue={editingWidget.title}
                onChange={(e) => {
                  setEditingWidget({ ...editingWidget, title: e.target.value });
                }}
              />
              
              <TextField
                fullWidth
                label="Description"
                defaultValue={editingWidget.description || ''}
                multiline
                rows={3}
                onChange={(e) => {
                  setEditingWidget({ ...editingWidget, description: e.target.value });
                }}
              />
              
              <Select
                fullWidth
                value={editingWidget.type}
                label="Widget Type"
                onChange={(event) => {
                  setEditingWidget({ ...editingWidget, type: event.target.value as 'metric' | 'chart' | 'status' | 'table' });
                }}
              >
                <MenuItem value="metric">Metric</MenuItem>
                <MenuItem value="chart">Chart</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="table">Table</MenuItem>
              </Select>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={editingWidget.visible}
                    onChange={(e) => {
                      setEditingWidget({ ...editingWidget, visible: e.target.checked });
                    }}
                  />
                }
                label="Visible"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingWidget(null)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => {
              if (editingWidget) {
                onWidgetUpdate(editingWidget);
                setEditingWidget(null);
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WidgetSystem;

// Export individual widget components for reuse
export {
  MetricWidget,
  StatusWidget,
  ChartWidget,
};