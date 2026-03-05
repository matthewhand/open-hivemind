import React, { useState } from 'react';
import { Badge, Card } from '../DaisyUI';
import { Activity, Clock, Server, Database, ChevronRight, ChevronDown } from 'lucide-react';

export interface TraceSpan {
  id: string;
  parentId: string | null;
  name: string;
  service: string;
  startTime: number;
  duration: number;
  status: 'success' | 'error' | 'warning';
  tags?: Record<string, string>;
  children?: TraceSpan[];
}

interface DistributedTraceWaterfallProps {
  traceId: string;
  spans: TraceSpan[];
  className?: string;
}

export const DistributedTraceWaterfall: React.FC<DistributedTraceWaterfallProps> = ({
  traceId,
  spans,
  className = ''
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(spans.map(s => s.id))
  );

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedNodes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedNodes(next);
  };

  if (!spans || spans.length === 0) {
    return (
      <Card className={`shadow-sm ${className}`}>
        <div className="p-8 text-center text-base-content/50">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No trace data available</p>
        </div>
      </Card>
    );
  }

  // Build tree from flat spans
  const spanMap = new Map<string, TraceSpan>();
  const rootSpans: TraceSpan[] = [];

  spans.forEach(span => {
    spanMap.set(span.id, { ...span, children: [] });
  });

  spans.forEach(span => {
    const node = spanMap.get(span.id);
    if (node) {
      if (node.parentId) {
        const parent = spanMap.get(node.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          rootSpans.push(node);
        }
      } else {
        rootSpans.push(node);
      }
    }
  });

  // Calculate total duration for timeline scaling
  const minStartTime = Math.min(...spans.map(s => s.startTime));
  const maxEndTime = Math.max(...spans.map(s => s.startTime + s.duration));
  const totalDuration = maxEndTime - minStartTime;

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      api: 'bg-primary',
      auth: 'bg-secondary',
      database: 'bg-accent',
      llm: 'bg-info',
      worker: 'bg-warning',
    };
    return colors[service.toLowerCase()] || 'bg-neutral';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'error': return 'text-error';
      case 'warning': return 'text-warning';
      default: return 'text-success';
    }
  };

  const renderSpan = (span: TraceSpan, depth: number = 0) => {
    const isExpanded = expandedNodes.has(span.id);
    const hasChildren = span.children && span.children.length > 0;

    // Calculate timeline position and width
    const leftPercent = ((span.startTime - minStartTime) / totalDuration) * 100;
    const widthPercent = Math.max((span.duration / totalDuration) * 100, 0.5); // Minimum width

    return (
      <div key={span.id} className="group relative border-b border-base-200 hover:bg-base-200/50 transition-colors">
        <div className="flex items-center p-2 text-sm">
          {/* Left Panel: Tree View */}
          <div
            className="w-1/3 flex items-center shrink-0 pr-4 border-r border-base-300"
            style={{ paddingLeft: `${depth * 1.5}rem` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(span.id, e)}
                className="p-1 hover:bg-base-300 rounded mr-1"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 inline-block"></span>
            )}

            <div className={`w-2 h-2 rounded-full mr-2 ${getServiceColor(span.service)}`} />
            <span className="font-medium truncate mr-2" title={span.name}>{span.name}</span>
            <span className="text-xs text-base-content/50 truncate">({span.service})</span>
          </div>

          {/* Right Panel: Waterfall Timeline */}
          <div className="w-2/3 flex-1 relative h-8 flex items-center group-hover:bg-base-200/50 pl-4">
            <div
              className={`absolute h-4 rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${getServiceColor(span.service)} ${span.status === 'error' ? 'ring-2 ring-error ring-offset-1' : ''}`}
              style={{
                left: `calc(${leftPercent}% + 1rem)`,
                width: `${widthPercent}%`,
                minWidth: '2px'
              }}
              title={`${span.name} - ${span.duration}ms`}
            />
            <span
              className="absolute text-xs text-base-content/70 pointer-events-none"
              style={{
                left: `calc(${leftPercent + widthPercent}% + 1.5rem)`,
              }}
            >
              {span.duration.toFixed(2)}ms
            </span>
          </div>
        </div>

        {/* Children Rendering */}
        {hasChildren && isExpanded && (
          <div className="w-full">
            {span.children!.map(child => renderSpan(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Timeline header ticks
  const renderTimelineHeader = () => {
    const ticks = 5;
    const tickMarks = Array.from({ length: ticks + 1 }).map((_, i) => {
      const percentage = (i / ticks) * 100;
      const ms = (totalDuration * (i / ticks)).toFixed(0);
      return (
        <div
          key={i}
          className="absolute border-l border-base-300 pl-1 text-xs text-base-content/50"
          style={{ left: `calc(${percentage}%)` }}
        >
          {ms}ms
        </div>
      );
    });

    return (
      <div className="flex p-2 bg-base-200/50 border-b border-base-300 font-semibold text-sm">
        <div className="w-1/3 shrink-0 border-r border-base-300">Operation</div>
        <div className="w-2/3 flex-1 relative pl-4 h-6">
          {tickMarks}
        </div>
      </div>
    );
  };

  return (
    <Card className={`shadow-sm overflow-hidden ${className}`}>
      <div className="bg-base-200 px-4 py-3 flex justify-between items-center border-b border-base-300">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Distributed Trace</h3>
          <Badge variant="ghost" className="font-mono text-xs">{traceId}</Badge>
        </div>
        <div className="text-sm text-base-content/70 flex items-center gap-4">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {totalDuration.toFixed(2)}ms</span>
          <span className="flex items-center gap-1"><Server className="w-4 h-4" /> {spans.length} spans</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {renderTimelineHeader()}
          <div className="relative pb-4">
            {/* Background grid lines matching header ticks */}
            <div className="absolute inset-y-0 right-0 w-2/3 pointer-events-none flex pr-0 pl-4">
               {Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="flex-1 border-l border-base-200/50 h-full"></div>
               ))}
            </div>
            {/* Render top-level spans which recursively render children */}
            {rootSpans.map(span => renderSpan(span, 0))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DistributedTraceWaterfall;