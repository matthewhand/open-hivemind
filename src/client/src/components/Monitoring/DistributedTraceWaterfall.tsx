import React, { useState } from 'react';
import { Badge, Card } from '../DaisyUI';
import { Activity, Clock, Server, ChevronRight, ChevronDown, ZoomIn, ZoomOut, MoveLeft, MoveRight, X } from 'lucide-react';

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
  logs?: string[];
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

  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);

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

  const handleSpanClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSpanId(id === selectedSpanId ? null : id);
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
  const minStartTime = spans.reduce((min, s) => Math.min(min, s.startTime), Infinity);
  const maxEndTime = spans.reduce((max, s) => Math.max(max, s.startTime + s.duration), -Infinity);
  const totalDuration = Math.max(maxEndTime - minStartTime, 1);

  const getServiceColor = (service: string) => {
    // Generate deterministic distinct colors based on service name
    let hash = 0;
    for (let i = 0; i < service.length; i++) {
      hash = service.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const selectedSpan = selectedSpanId ? spanMap.get(selectedSpanId) : null;

  const renderSpan = (span: TraceSpan, depth: number = 0) => {
    const isExpanded = expandedNodes.has(span.id);
    const hasChildren = span.children && span.children.length > 0;
    const isSelected = selectedSpanId === span.id;

    // Calculate timeline position and width based on zoom and pan
    const rawLeftPercent = ((span.startTime - minStartTime) / totalDuration) * 100;
    const rawWidthPercent = Math.max((span.duration / totalDuration) * 100, 0.5); // Minimum width

    const leftPercent = (rawLeftPercent - panOffset) * zoomLevel;
    const widthPercent = rawWidthPercent * zoomLevel;

    // Only render if visible (partially)
    if (leftPercent + widthPercent < 0 || leftPercent > 100) return null;

    const barColor = getServiceColor(span.service);

    return (
      <div key={span.id} className={`group relative border-b border-base-200 transition-colors ${isSelected ? 'bg-base-300' : 'hover:bg-base-200/50'}`} onClick={(e) => handleSpanClick(span.id, e)}>
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

            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: barColor }} />
            <span className="font-medium truncate mr-2" title={span.name}>{span.name}</span>
            <span className="text-xs text-base-content/50 truncate">({span.service})</span>
          </div>

          {/* Right Panel: Waterfall Timeline */}
          <div className="w-2/3 flex-1 relative h-8 flex items-center pl-4 overflow-hidden">
            <div
              className={`absolute h-4 rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${span.status === 'error' ? 'ring-2 ring-error ring-offset-1' : ''}`}
              style={{
                left: `max(1rem, calc(${leftPercent}% + 1rem))`,
                width: `min(calc(100% - 1rem), ${widthPercent}%)`,
                minWidth: '2px',
                backgroundColor: barColor
              }}
              title={`${span.name} - ${span.duration}ms`}
            />
            <span
              className="absolute text-xs text-base-content/70 pointer-events-none whitespace-nowrap"
              style={{
                left: `calc(${leftPercent + widthPercent}% + 1.5rem)`,
                display: (leftPercent + widthPercent) > 95 ? 'none' : 'block' // hide if off edge
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
      // Calculate visible tick values based on zoom and pan
      const viewPercentage = i / ticks;
      const absolutePercentage = (viewPercentage / zoomLevel) + (panOffset / 100);
      const ms = (totalDuration * absolutePercentage).toFixed(0);

      return (
        <div
          key={i}
          className="absolute border-l border-base-300 pl-1 text-xs text-base-content/50"
          style={{ left: `calc(${(i / ticks) * 100}%)` }}
        >
          {ms}ms
        </div>
      );
    });

    return (
      <div className="flex p-2 bg-base-200/50 border-b border-base-300 font-semibold text-sm">
        <div className="w-1/3 shrink-0 border-r border-base-300">Operation</div>
        <div className="w-2/3 flex-1 relative pl-4 h-6 overflow-hidden">
          {tickMarks}
        </div>
      </div>
    );
  };

  return (
    <Card className={`shadow-sm overflow-hidden flex flex-row ${className}`}>
      <div className={`flex-1 transition-all duration-300 ${selectedSpan ? 'w-2/3 border-r border-base-300' : 'w-full'}`}>
        <div className="bg-base-200 px-4 py-3 flex justify-between items-center border-b border-base-300 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Distributed Trace</h3>
            <Badge variant="ghost" className="font-mono text-xs">{traceId}</Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 join">
               <button className="btn btn-xs join-item" onClick={() => setPanOffset(Math.max(0, panOffset - 10 / zoomLevel))} disabled={panOffset <= 0} title="Pan Left"><MoveLeft className="w-3 h-3" /></button>
               <button className="btn btn-xs join-item" onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))} disabled={zoomLevel <= 1} title="Zoom Out"><ZoomOut className="w-3 h-3" /></button>
               <button className="btn btn-xs join-item" onClick={() => { setZoomLevel(1); setPanOffset(0); }} title="Reset View">1x</button>
               <button className="btn btn-xs join-item" onClick={() => setZoomLevel(zoomLevel + 0.5)} disabled={zoomLevel >= 5} title="Zoom In"><ZoomIn className="w-3 h-3" /></button>
               <button className="btn btn-xs join-item" onClick={() => setPanOffset(Math.min(100 - (100 / zoomLevel), panOffset + 10 / zoomLevel))} disabled={panOffset >= 100 - (100 / zoomLevel)} title="Pan Right"><MoveRight className="w-3 h-3" /></button>
            </div>

            <div className="text-sm text-base-content/70 flex items-center gap-4">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {totalDuration.toFixed(2)}ms</span>
              <span className="flex items-center gap-1"><Server className="w-4 h-4" /> {spans.length} spans</span>
            </div>
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
      </div>

      {/* Metadata Inspector Panel */}
      {selectedSpan && (
        <div className="w-1/3 bg-base-100 flex flex-col h-full absolute right-0 top-0 bottom-0 shadow-2xl z-10 sm:relative sm:shadow-none sm:z-auto">
          <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200">
            <h4 className="font-bold text-lg flex items-center gap-2 truncate">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getServiceColor(selectedSpan.service) }} />
              <span className="truncate" title={selectedSpan.name}>{selectedSpan.name}</span>
            </h4>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setSelectedSpanId(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 text-sm space-y-6">
            <section>
              <h5 className="font-semibold text-base-content/70 uppercase text-xs mb-2">Overview</h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-base-content/60">Service:</div>
                <div className="font-mono">{selectedSpan.service}</div>
                <div className="text-base-content/60">Status:</div>
                <div>
                   <Badge variant={selectedSpan.status === 'success' ? 'success' : selectedSpan.status === 'error' ? 'error' : 'warning'}>
                     {selectedSpan.status}
                   </Badge>
                </div>
                <div className="text-base-content/60">Duration:</div>
                <div className="font-mono">{selectedSpan.duration.toFixed(2)}ms</div>
                <div className="text-base-content/60">Start Time:</div>
                <div className="font-mono">+{selectedSpan.startTime.toFixed(2)}ms</div>
                <div className="text-base-content/60">Span ID:</div>
                <div className="font-mono text-xs truncate" title={selectedSpan.id}>{selectedSpan.id}</div>
              </div>
            </section>

            {selectedSpan.tags && Object.keys(selectedSpan.tags).length > 0 && (
              <section>
                <h5 className="font-semibold text-base-content/70 uppercase text-xs mb-2">Tags</h5>
                <div className="bg-base-200 rounded p-2 overflow-x-auto">
                  <table className="w-full text-left table-auto">
                    <tbody>
                      {Object.entries(selectedSpan.tags).map(([key, value]) => (
                        <tr key={key} className="border-b border-base-300 last:border-0">
                          <td className="py-1 pr-4 font-mono text-xs text-base-content/70">{key}</td>
                          <td className="py-1 font-mono text-xs">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {selectedSpan.logs && selectedSpan.logs.length > 0 && (
              <section>
                <h5 className="font-semibold text-base-content/70 uppercase text-xs mb-2">Logs</h5>
                <div className="bg-base-300 rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre">
                  {selectedSpan.logs.map((log, i) => (
                    <div key={i} className="mb-1 text-base-content/80">{log}</div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default DistributedTraceWaterfall;