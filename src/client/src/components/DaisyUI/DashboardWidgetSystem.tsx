/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';

interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data?: Record<string, any>;
  config?: Record<string, any>;
  isVisible: boolean;
}

interface WidgetType {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
  component: React.ComponentType<WidgetProps>;
  configurable: boolean;
}

interface WidgetProps {
  widget: Widget;
  isEditing?: boolean;
  onUpdate?: (widget: Widget) => void;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
}

interface DashboardWidgetSystemProps {
  initialWidgets?: Widget[];
  onWidgetsChange?: (widgets: Widget[]) => void;
  readOnly?: boolean;
  gridSize?: number;
}

// Widget Components
const StatsWidget: React.FC<WidgetProps> = ({ widget, isEditing, onUpdate, onRemove, onConfigure }) => {
  const stats = widget.data?.stats || [
    { label: 'Active Bots', value: '3', change: '+2' },
    { label: 'Messages', value: '1.2K', change: '+15%' },
    { label: 'Uptime', value: '99.9%', change: '+0.1%' },
  ];

  return (
    <div className="h-full bg-base-100 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{widget.title}</h3>
        {isEditing && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">⋮</div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={() => onConfigure?.(widget.id)}>⚙️ Configure</a></li>
              <li><a onClick={() => onRemove?.(widget.id)} className="text-error">🗑️ Remove</a></li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {stats.map((stat: any, index: number) => (
          <div key={index} className="stat bg-base-200 rounded-lg p-3">
            <div className="stat-title text-sm">{stat.label}</div>
            <div className="stat-value text-2xl">{stat.value}</div>
            <div className="stat-desc">
              <span className={stat.change.startsWith('+') ? 'text-success' : 'text-error'}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartWidget: React.FC<WidgetProps> = ({ widget, isEditing, onUpdate, onRemove, onConfigure }) => {
  const data = widget.data?.chartData || [];
  
  return (
    <div className="h-full bg-base-100 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{widget.title}</h3>
        {isEditing && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">⋮</div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={() => onConfigure?.(widget.id)}>⚙️ Configure</a></li>
              <li><a onClick={() => onRemove?.(widget.id)} className="text-error">🗑️ Remove</a></li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Simulated Chart */}
      <div className="relative h-32 bg-base-200 rounded-lg flex items-end p-2 gap-1">
        {[65, 45, 78, 52, 89, 67, 43, 91, 72, 55].map((height, index) => (
          <div
            key={index}
            className="bg-primary rounded-sm flex-1 transition-all duration-300 hover:bg-primary-focus"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      
      <div className="mt-2 text-center">
        <div className="text-sm text-base-content/60">Message Activity</div>
        <div className="text-xs text-base-content/40">Last 10 hours</div>
      </div>
    </div>
  );
};

const ActivityWidget: React.FC<WidgetProps> = ({ widget, isEditing, onUpdate, onRemove, onConfigure }) => {
  const activities = widget.data?.activities || [
    { time: '2 min ago', action: 'Bot connected', type: 'success' },
    { time: '5 min ago', action: 'Message processed', type: 'info' },
    { time: '12 min ago', action: 'User joined', type: 'success' },
    { time: '18 min ago', action: 'Configuration updated', type: 'warning' },
  ];

  return (
    <div className="h-full bg-base-100 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{widget.title}</h3>
        {isEditing && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">⋮</div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={() => onConfigure?.(widget.id)}>⚙️ Configure</a></li>
              <li><a onClick={() => onRemove?.(widget.id)} className="text-error">🗑️ Remove</a></li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {activities.map((activity: any, index: number) => (
          <div key={index} className="flex items-center gap-3 p-2 bg-base-200 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${
              activity.type === 'success' ? 'bg-success' :
                activity.type === 'warning' ? 'bg-warning' :
                  activity.type === 'error' ? 'bg-error' : 'bg-info'
            }`} />
            <div className="flex-1">
              <div className="text-sm">{activity.action}</div>
              <div className="text-xs text-base-content/60">{activity.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActionsWidget: React.FC<WidgetProps> = ({ widget, isEditing, onUpdate, onRemove, onConfigure }) => {
  const actions = widget.data?.actions || [
    { label: 'Add Bot', icon: '🤖', color: 'btn-primary' },
    { label: 'View Logs', icon: '📋', color: 'btn-secondary' },
    { label: 'Settings', icon: '⚙️', color: 'btn-accent' },
    { label: 'Help', icon: '❓', color: 'btn-info' },
  ];

  return (
    <div className="h-full bg-base-100 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{widget.title}</h3>
        {isEditing && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">⋮</div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={() => onConfigure?.(widget.id)}>⚙️ Configure</a></li>
              <li><a onClick={() => onRemove?.(widget.id)} className="text-error">🗑️ Remove</a></li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action: any, index: number) => (
          <button key={index} className={`btn btn-sm ${action.color} gap-1`}>
            <span>{action.icon}</span>
            <span className="text-xs">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const SystemHealthWidget: React.FC<WidgetProps> = ({ widget, isEditing, onUpdate, onRemove, onConfigure }) => {
  const health = widget.data?.health || {
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 32,
  };

  return (
    <div className="h-full bg-base-100 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{widget.title}</h3>
        {isEditing && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">⋮</div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={() => onConfigure?.(widget.id)}>⚙️ Configure</a></li>
              <li><a onClick={() => onRemove?.(widget.id)} className="text-error">🗑️ Remove</a></li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {Object.entries(health).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-16 text-sm capitalize">{key}</div>
            <div className="flex-1">
              <progress
                className={`progress w-full ${
                  Number(value) > 80 ? 'progress-error' :
                    Number(value) > 60 ? 'progress-warning' : 'progress-success'
                }`}
                value={Number(value)}
                max="100"
              />
            </div>
            <div className="w-12 text-sm text-right">{Number(value)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardWidgetSystem: React.FC<DashboardWidgetSystemProps> = ({
  initialWidgets = [],
  onWidgetsChange,
  readOnly = false,
  gridSize = 20,
}) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWidgetPalette, setShowWidgetPalette] = useState(false);

  const widgetTypes: WidgetType[] = [
    {
      id: 'stats',
      name: 'Statistics',
      description: 'Display key metrics and statistics',
      icon: '📊',
      defaultSize: { width: 300, height: 200 },
      component: StatsWidget,
      configurable: true,
    },
    {
      id: 'chart',
      name: 'Chart',
      description: 'Data visualization charts',
      icon: '📈',
      defaultSize: { width: 400, height: 250 },
      component: ChartWidget,
      configurable: true,
    },
    {
      id: 'activity',
      name: 'Activity Feed',
      description: 'Recent system activities',
      icon: '📋',
      defaultSize: { width: 350, height: 300 },
      component: ActivityWidget,
      configurable: true,
    },
    {
      id: 'actions',
      name: 'Quick Actions',
      description: 'Frequently used actions',
      icon: '⚡',
      defaultSize: { width: 250, height: 150 },
      component: QuickActionsWidget,
      configurable: true,
    },
    {
      id: 'health',
      name: 'System Health',
      description: 'System resource monitoring',
      icon: '💚',
      defaultSize: { width: 300, height: 200 },
      component: SystemHealthWidget,
      configurable: true,
    },
  ];

  // Save widgets to localStorage
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('hivemind-dashboard-widgets', JSON.stringify(widgets));
      onWidgetsChange?.(widgets);
    }
  }, [widgets, onWidgetsChange]);

  // Load saved widgets
  useEffect(() => {
    const saved = localStorage.getItem('hivemind-dashboard-widgets');
    if (saved && initialWidgets.length === 0) {
      try {
        const parsedWidgets = JSON.parse(saved);
        setWidgets(parsedWidgets);
      } catch (error) {
        console.warn('Failed to load saved widgets:', error);
      }
    }
  }, [initialWidgets]);

  const addWidget = (type: string) => {
    const widgetType = widgetTypes.find(t => t.id === type);
    if (!widgetType) {return;}

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: widgetType.name,
      position: { x: 50, y: 50 },
      size: widgetType.defaultSize,
      isVisible: true,
      data: getDefaultWidgetData(type),
    };

    setWidgets(prev => [...prev, newWidget]);
    setShowWidgetPalette(false);
  };

  const getDefaultWidgetData = (type: string) => {
    switch (type) {
    case 'stats':
      return {
        stats: [
          { label: 'Active Bots', value: '3', change: '+2' },
          { label: 'Messages', value: '1.2K', change: '+15%' },
          { label: 'Uptime', value: '99.9%', change: '+0.1%' },
        ],
      };
    case 'activity':
      return {
        activities: [
          { time: '2 min ago', action: 'Bot connected', type: 'success' },
          { time: '5 min ago', action: 'Message processed', type: 'info' },
          { time: '12 min ago', action: 'User joined', type: 'success' },
        ],
      };
    case 'actions':
      return {
        actions: [
          { label: 'Add Bot', icon: '🤖', color: 'btn-primary' },
          { label: 'View Logs', icon: '📋', color: 'btn-secondary' },
          { label: 'Settings', icon: '⚙️', color: 'btn-accent' },
          { label: 'Help', icon: '❓', color: 'btn-info' },
        ],
      };
    case 'health':
      return {
        health: {
          cpu: Math.floor(Math.random() * 100),
          memory: Math.floor(Math.random() * 100),
          disk: Math.floor(Math.random() * 100),
          network: Math.floor(Math.random() * 100),
        },
      };
    default:
      return {};
    }
  };

  const updateWidget = useCallback((updatedWidget: Widget) => {
    setWidgets(prev => prev.map(w => w.id === updatedWidget.id ? updatedWidget : w));
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const handleMouseDown = (e: React.MouseEvent, widgetId: string) => {
    if (!isEditing) {return;}
    
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) {return;}

    setDraggedWidget(widgetId);
    setDragOffset({
      x: e.clientX - widget.position.x,
      y: e.clientY - widget.position.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedWidget || !isEditing) {return;}

    const newX = Math.max(0, e.clientX - dragOffset.x);
    const newY = Math.max(0, e.clientY - dragOffset.y);

    setWidgets(prev => prev.map(w => 
      w.id === draggedWidget 
        ? { ...w, position: { x: newX, y: newY } }
        : w,
    ));
  }, [draggedWidget, dragOffset, isEditing]);

  const handleMouseUp = useCallback(() => {
    setDraggedWidget(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (draggedWidget) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedWidget, handleMouseMove, handleMouseUp]);

  const resetLayout = () => {
    const resetWidgets = widgets.map((widget, index) => ({
      ...widget,
      position: { 
        x: (index % 3) * 350 + 50, 
        y: Math.floor(index / 3) * 300 + 50, 
      },
    }));
    setWidgets(resetWidgets);
  };

  return (
    <div className="relative min-h-screen bg-base-200 p-4">
      {/* Toolbar */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {!readOnly && (
          <>
            <button
              className={`btn ${isEditing ? 'btn-error' : 'btn-primary'}`}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? '✓ Done' : '✏️ Edit'}
            </button>
            
            {isEditing && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowWidgetPalette(!showWidgetPalette)}
                >
                  ➕ Add Widget
                </button>
                
                <button
                  className="btn btn-outline"
                  onClick={resetLayout}
                >
                  🔄 Reset Layout
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Widget Palette */}
      {showWidgetPalette && (
        <div className="fixed top-20 right-4 z-40 card bg-base-100 shadow-xl w-80">
          <div className="card-body">
            <h3 className="card-title">Add Widget</h3>
            <div className="grid grid-cols-1 gap-2">
              {widgetTypes.map(type => (
                <button
                  key={type.id}
                  className="btn btn-outline justify-start gap-3"
                  onClick={() => addWidget(type.id)}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{type.name}</div>
                    <div className="text-xs opacity-60">{type.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="relative">
        {/* Grid Background */}
        {isEditing && (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          />
        )}

        {/* Widgets */}
        {widgets.filter(w => w.isVisible).map(widget => {
          const WidgetComponent = widgetTypes.find(t => t.id === widget.type)?.component;
          if (!WidgetComponent) {return null;}

          return (
            <div
              key={widget.id}
              className={`absolute ${isEditing ? 'cursor-move' : 'cursor-default'} ${
                draggedWidget === widget.id ? 'z-40' : 'z-10'
              }`}
              style={{
                left: widget.position.x,
                top: widget.position.y,
                width: widget.size.width,
                height: widget.size.height,
              }}
              onMouseDown={(e) => handleMouseDown(e, widget.id)}
            >
              <WidgetComponent
                widget={widget}
                isEditing={isEditing}
                onUpdate={updateWidget}
                onRemove={removeWidget}
              />
            </div>
          );
        })}

        {/* Empty State */}
        {widgets.length === 0 && (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-2">No Widgets Added</h2>
              <p className="text-base-content/60 mb-4">
                Add widgets to customize your dashboard
              </p>
              {!readOnly && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowWidgetPalette(true)}
                >
                  ➕ Add Your First Widget
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardWidgetSystem;