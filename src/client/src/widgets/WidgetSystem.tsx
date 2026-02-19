/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  Squares2X2Icon,
  PencilIcon,
  ArrowDownTrayIcon, // Used as SaveIcon replacement
} from '@heroicons/react/24/outline';
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
  const colorClass = percentage > 80 ? 'text-error' : percentage > 60 ? 'text-warning' : 'text-success';
  const bgClass = percentage > 80 ? 'bg-error' : percentage > 60 ? 'bg-warning' : 'bg-success';

  return (
    <div className="card bg-base-100 shadow-xl h-full flex flex-col">
      <div className="card-body flex-1 flex flex-col">
        <h2 className="card-title text-lg mb-2">
          {widget.title}
        </h2>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-4xl font-bold ${colorClass}`}>
              {data.toFixed(1)}
              <span className="text-sm ml-1 text-base-content/70">{settings.unit}</span>
            </div>
          </div>
        </div>

        <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden mt-4">
          <div
            className={`h-full ${bgClass} transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-xs text-base-content/70 mt-2">
          {percentage.toFixed(0)}% of threshold ({threshold}{typeof settings.unit === 'string' ? settings.unit : 'ms'})
        </p>
      </div>
    </div>
  );
};

const StatusWidget: React.FC<{ widget: WidgetConfig; data: Record<string, unknown>[] }> = ({ widget, data }) => {
  const activeCount = data.filter(item => item.status === 'active').length;
  const errorCount = data.filter(item => item.status === 'error').length;
  const connectingCount = data.filter(item => item.status === 'connecting').length;

  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body">
        <h2 className="card-title text-lg mb-2">
          {widget.title}
        </h2>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Active</span>
            <div className="badge badge-success badge-sm">{activeCount}</div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Connecting</span>
            <div className="badge badge-warning badge-sm">{connectingCount}</div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Errors</span>
            <div className="badge badge-error badge-sm">{errorCount}</div>
          </div>
        </div>

        <p className="text-xs text-base-content/70 mt-2 block">
          Total: {data.length} bots
        </p>
      </div>
    </div>
  );
};

const ChartWidget: React.FC<{ widget: WidgetConfig; data: number[] }> = ({ widget, data }) => {
  const { settings } = widget;

  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body">
        <h2 className="card-title text-lg mb-2">
          {widget.title}
        </h2>

        <div className="h-48 relative">
          {/* Simple chart visualization */}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
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
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="0.5"
              />
            ))}

            {/* Data line */}
            <polyline
              points={data.map((value, index) =>
                `${(index / (data.length - 1)) * 100},${100 - (value / 100) * 80}`,
              ).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />

            {/* Data points */}
            {data.map((value, index) => (
              <circle
                key={index}
                cx={(index / (data.length - 1)) * 100}
                cy={100 - (value / 100) * 80}
                r="2"
                fill="currentColor"
                className="text-primary"
              />
            ))}
          </svg>
        </div>

        <p className="text-xs text-base-content/70">
          Chart Type: {typeof settings.chartType === 'string' ? settings.chartType : 'line'} • Range: {typeof settings.timeRange === 'string' ? settings.timeRange : '24h'}
        </p>
      </div>
    </div>
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
    <div
      className="relative w-full h-full group"
    >
      {/* Widget Content */}
      {widget.type === 'metric' && <MetricWidget widget={widget} data={data as number} />}
      {widget.type === 'status' && <StatusWidget widget={widget} data={data as Record<string, unknown>[]} />}
      {widget.type === 'chart' && <ChartWidget widget={widget} data={data as number[] || [20, 35, 45, 60, 75, 85, 70, 65]} />}

      {/* Edit Controls */}
      {editable && (
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1"
        >
          <button
            className="btn btn-xs btn-circle btn-ghost bg-base-100 shadow-sm"
            onClick={onEdit}
          >
            <PencilIcon className="w-3 h-3" />
          </button>
          <button
            className="btn btn-xs btn-circle btn-ghost bg-base-100 shadow-sm text-error"
            onClick={onDelete}
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
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
    <div className="w-full min-h-[600px]">
      {/* Toolbar */}
      {showToolbar && editable && (
        <div className="flex items-center justify-between mb-4 p-4 bg-base-200 rounded-box">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Squares2X2Icon className="w-6 h-6" />
            Dashboard Widgets
          </h2>

          <button
            className="btn btn-primary"
            onClick={() => setShowAddDialog(true)}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Widget
          </button>
        </div>
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
      {showAddDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add New Widget</h3>
            <div className="py-4 space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Widget Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  defaultValue="New Widget"
                  onChange={() => {
                    // Handle title change for new widget
                  }}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Widget Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  defaultValue="metric"
                >
                  <option value="metric">Metric</option>
                  <option value="chart">Chart</option>
                  <option value="status">Status</option>
                  <option value="table">Table</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Data Source</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  defaultValue="performance.responseTime"
                />
                <label className="label">
                  <span className="label-text-alt">Select the data source for this widget</span>
                </label>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Refresh Interval (ms)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  defaultValue={5000}
                />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowAddDialog(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Widget Dialog */}
      {editingWidget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Edit Widget</h3>
            <div className="py-4 space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Widget Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  defaultValue={editingWidget.title}
                  onChange={(e) => {
                    setEditingWidget({ ...editingWidget, title: e.target.value });
                  }}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  defaultValue={editingWidget.description || ''}
                  rows={3}
                  onChange={(e) => {
                    setEditingWidget({ ...editingWidget, description: e.target.value });
                  }}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Widget Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={editingWidget.type}
                  onChange={(event) => {
                    setEditingWidget({ ...editingWidget, type: event.target.value as 'metric' | 'chart' | 'status' | 'table' });
                  }}
                >
                  <option value="metric">Metric</option>
                  <option value="chart">Chart</option>
                  <option value="status">Status</option>
                  <option value="table">Table</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text">Visible</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={editingWidget.visible}
                    onChange={(e) => {
                      setEditingWidget({ ...editingWidget, visible: e.target.checked });
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setEditingWidget(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (editingWidget) {
                    onWidgetUpdate(editingWidget);
                    setEditingWidget(null);
                  }
                }}
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetSystem;

// Export individual widget components for reuse
export {
  MetricWidget,
  StatusWidget,
  ChartWidget,
};