import React, { useEffect, useRef, useState } from 'react'

export type EventType = 'success' | 'error' | 'warning' | 'info' | 'neutral'

export interface TimelineEvent {
  id: string
  timestamp: Date | string
  title: string
  description?: string
  type: EventType
  metadata?: Record<string, unknown>
  details?: React.ReactNode
}

export interface TimelineProps {
  events: TimelineEvent[]
  maxEvents?: number
  viewMode?: 'compact' | 'detailed'
  showTimestamps?: boolean
  autoScroll?: boolean
  className?: string
  onEventClick?: (event: TimelineEvent) => void
}

const getEventIcon = (type: EventType): React.ReactNode => {
  switch (type) {
  case 'success':
    return <span role="img" aria-label="success">✓</span>;
  case 'error':
    return <span role="img" aria-label="error">✗</span>;
  case 'warning':
    return <span role="img" aria-label="warning">⚠</span>;
  case 'info':
    return <span role="img" aria-label="info">ℹ</span>;
  case 'neutral':
  default:
    return <span role="img" aria-label="neutral">○</span>;
  }
}

const getEventColorClass = (type: EventType): string => {
  switch (type) {
    case 'success':
      return 'timeline-success'
    case 'error':
      return 'timeline-error'
    case 'warning':
      return 'timeline-warning'
    case 'info':
      return 'timeline-info'
    case 'neutral':
    default:
      return 'timeline-neutral'
  }
}

const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) { return 'Just now' }
  if (diffMins < 60) { return `${diffMins}m ago` }
  if (diffHours < 24) { return `${diffHours}h ago` }
  if (diffDays < 7) { return `${diffDays}d ago` }

  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const Timeline: React.FC<TimelineProps> = ({
  events,
  maxEvents = 50,
  viewMode = 'detailed',
  showTimestamps = true,
  autoScroll = true,
  className = '',
  onEventClick,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  // Sort events chronologically (newest first)
  const sortedEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxEvents)

  // Auto-scroll to top when new events are added
  useEffect(() => {
    if (autoScroll && timelineRef.current && sortedEvents.length > 0) {
      timelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [sortedEvents, autoScroll])

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const handleEventClick = (event: TimelineEvent) => {
    if (viewMode === 'compact') {
      toggleEventExpansion(event.id)
    }
    onEventClick?.(event)
  }

  return (
    <div className={`timeline ${className}`} ref={timelineRef} role="list" aria-label="Timeline of events">
      {sortedEvents.map((event, index) => {
        const isExpanded = expandedEvents.has(event.id);
        const isLast = index === sortedEvents.length - 1;
        const isInteractive = viewMode === 'compact' || !!onEventClick;

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleEventClick(event);
          }
        };

        return (
          <div key={event.id} className={`timeline-item ${getEventColorClass(event.type)}`} role="listitem">
            {/* Timeline connector */}
            {!isLast && <div className="timeline-middle"></div>}

            {/* Timeline marker */}
            <div className="timeline-start timeline-box">
              <div className="text-2xl" role="img" aria-label={`Event type: ${event.type}`}>
                {getEventIcon(event.type)}
              </div>
            </div>

            {/* Event content */}
            <div className="timeline-end">
              <div
                className={`card bg-base-100 shadow-sm transition-shadow ${viewMode === 'compact' ? 'p-3' : 'p-4'} ${
                  isInteractive ? 'cursor-pointer hover:shadow-md' : ''
                }`}
                onClick={isInteractive ? () => handleEventClick(event) : undefined}
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                onKeyDown={isInteractive ? handleKeyDown : undefined}
                aria-expanded={viewMode === 'compact' ? isExpanded : undefined}
              >
                <div className="card-body p-0">
                  {/* Event header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className={`card-title text-base ${viewMode === 'compact' ? 'text-sm' : ''}`}>
                        {event.title}
                      </h3>
                      {showTimestamps && (
                        <div className="text-xs text-base-content/60 mt-1">
                          {formatTimestamp(new Date(event.timestamp))}
                        </div>
                      )}
                    </div>

                    {/* Expand/collapse indicator for compact mode */}
                    {viewMode === 'compact' && event.details && (
                      <div className="ml-2">
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Event description */}
                  {event.description && (
                    <p className={`text-base-content/80 ${viewMode === 'compact' ? 'text-sm' : ''}`}>
                      {event.description}
                    </p>
                  )}

                  {/* Event metadata */}
                  {event.metadata && viewMode === 'detailed' && (
                    <div className="mt-2">
                      <div className="badge badge-ghost badge-sm">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <span key={key} className="mr-1" aria-label={`${key}: ${String(value)}`}>
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expandable details */}
                  {event.details && (
                    <div className={`mt-3 ${viewMode === 'compact' && !isExpanded ? 'hidden' : ''}`}>
                      <div className="border-t border-base-300 pt-3">
                        {event.details}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {sortedEvents.length === 0 && (
        <div className="timeline-item" role="listitem">
          <div className="timeline-middle"></div>
          <div className="timeline-start timeline-box">
            <div className="text-2xl text-base-content/40" role="img" aria-label="No events">
              ○
            </div>
          </div>
          <div className="timeline-end">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4 text-center">
                <div className="text-base-content/60">No events to display</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Activity Feed Component for real-time updates
export interface ActivityFeedProps extends Omit<TimelineProps, 'events'> {
  events: TimelineEvent[]
  onNewEvent?: (event: TimelineEvent) => void
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  events,
  onNewEvent,
  ...timelineProps
}) => {
  const [currentEvents, setCurrentEvents] = useState<TimelineEvent[]>(events)

  useEffect(() => {
    setCurrentEvents(events)
  }, [events])

  // Simulate real-time updates (in a real app, this would come from WebSocket or API)
  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent: TimelineEvent = {
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        title: 'System Health Check',
        description: 'All systems operating normally',
        type: 'success',
        metadata: { status: 'healthy' },
      }

      setCurrentEvents(prev => [newEvent, ...prev.slice(0, 49)]) // Keep max 50 events
      onNewEvent?.(newEvent)
    }, 30000) // Add a new event every 30 seconds

    return () => clearInterval(interval)
  }, [onNewEvent])

  return <Timeline events={currentEvents} {...timelineProps} />
}

export default Timeline