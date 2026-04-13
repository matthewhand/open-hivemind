import React, { useRef, useEffect, useState } from 'react';
import { Bot, User, MessageSquare, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Zap, AtSign, MessageCircle } from 'lucide-react';
import { Badge } from './DaisyUI/Badge';
import Tooltip from './DaisyUI/Tooltip';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | number | Date;
  metadata?: {
    probability?: number;
    responseReason?: 'mentioned' | 'followup' | 'unsolicited' | 'triggered';
    processingTime?: number;
    [key: string]: unknown;
  };
  sender?: string;
}

interface BotResponseTimelineProps {
  chatHistory: ChatMessage[];
  chatError?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  className?: string;
}

/** Format a timestamp as a relative string when recent, otherwise as a compact time. */
function formatRelativeTime(ts: string | number | Date): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Map a response reason to a human-readable label and icon. */
function getReasonInfo(reason?: string): { label: string; icon: React.ReactNode } | null {
  switch (reason) {
    case 'mentioned':
      return { label: 'Mentioned', icon: <AtSign className="w-3 h-3" /> };
    case 'followup':
      return { label: 'Follow-up', icon: <MessageCircle className="w-3 h-3" /> };
    case 'unsolicited':
      return { label: 'Unsolicited', icon: <Zap className="w-3 h-3" /> };
    case 'triggered':
      return { label: 'Triggered', icon: <Zap className="w-3 h-3" /> };
    default:
      return null;
  }
}

/** Color for the timeline dot based on message role. */
function getDotColor(role: string): string {
  switch (role) {
    case 'user':
      return 'bg-info';
    case 'assistant':
      return 'bg-success';
    case 'system':
      return 'bg-base-300';
    default:
      return 'bg-base-300';
  }
}

/** Border accent color for the message card. */
function getCardBorder(role: string): string {
  switch (role) {
    case 'user':
      return 'border-l-info';
    case 'assistant':
      return 'border-l-success';
    case 'system':
      return 'border-l-base-300';
    default:
      return 'border-l-base-300';
  }
}

const MESSAGE_TRUNCATE_LENGTH = 180;

const TimelineEntry: React.FC<{ msg: ChatMessage; isLast: boolean }> = ({ msg, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = msg.content.length > MESSAGE_TRUNCATE_LENGTH;
  const displayContent = !expanded && isLong
    ? msg.content.slice(0, MESSAGE_TRUNCATE_LENGTH) + '...'
    : msg.content;

  const reasonInfo = msg.role === 'assistant' ? getReasonInfo(msg.metadata?.responseReason) : null;
  const probability = msg.metadata?.probability;
  const processingTime = msg.metadata?.processingTime;

  return (
    <div className="flex gap-2 relative">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-base-100 ${getDotColor(msg.role)}`} />
        {!isLast && <div className="w-px flex-1 bg-base-300 mt-1" />}
      </div>

      {/* Content card */}
      <div className="flex-1 min-w-0 pb-3">
        {/* Timestamp */}
        <div className="text-[10px] text-base-content/50 font-mono mb-0.5">
          {formatRelativeTime(msg.timestamp)}
        </div>

        {/* Card */}
        <div className={`bg-base-200/40 rounded-lg p-2 border-l-2 ${getCardBorder(msg.role)}`}>
          {/* Sender row */}
          <div className="flex items-center gap-1.5 mb-1">
            {msg.role === 'user' ? (
              <User className="w-3 h-3 text-info flex-shrink-0" />
            ) : msg.role === 'assistant' ? (
              <Bot className="w-3 h-3 text-success flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-base-content/40 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold truncate">
              {msg.sender || (msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Bot' : 'System')}
            </span>

            {/* Role badge */}
            {msg.role === 'assistant' && reasonInfo && (
              <Badge variant="ghost" size="xs" icon={reasonInfo.icon}>
                {reasonInfo.label}
              </Badge>
            )}
          </div>

          {/* Message content */}
          <p className="text-xs text-base-content/80 whitespace-pre-wrap break-words leading-relaxed">
            {displayContent}
          </p>

          {isLong && (
            <button
              className="text-[10px] text-primary hover:underline mt-0.5 inline-flex items-center gap-0.5"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Show less of the message' : 'Show more of the message'}
              aria-expanded={expanded}
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> Show less</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Show more</>
              )}
            </button>
          )}

          {/* Response metadata for bot messages */}
          {msg.role === 'assistant' && (probability != null || processingTime != null) && (
            <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-base-300/50">
              {probability != null && (
                <Tooltip content={`Response probability: ${(probability * 100).toFixed(1)}%`}>
                  <span className="text-[10px] font-mono text-base-content/50">
                    P={(probability * 100).toFixed(0)}%
                  </span>
                </Tooltip>
              )}
              {processingTime != null && (
                <Tooltip content={`Processing time: ${processingTime}ms`}>
                  <span className="text-[10px] font-mono text-base-content/50">
                    {processingTime}ms
                  </span>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BotResponseTimeline: React.FC<BotResponseTimelineProps> = ({
  chatHistory,
  chatError,
  onRetry,
  onRefresh,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom (latest) on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Error state
  if (chatError) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error" />
        <p className="text-xs text-error mb-2">{chatError}</p>
        {onRetry && (
          <button className="btn btn-ghost btn-xs" onClick={onRetry} aria-label="Retry loading messages">
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (chatHistory.length === 0) {
    return (
      <div className="text-center py-8 opacity-40">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <p className="text-xs">No activity yet</p>
        <p className="text-[10px] mt-1">Messages will appear here as the bot interacts.</p>
      </div>
    );
  }

  // Sort chronologically (oldest first so timeline reads top-to-bottom)
  const sorted = [...chatHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className={className}>
      {/* Header with refresh */}
      {onRefresh && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-base-content/40">
            Response History
          </span>
          <button className="btn btn-ghost btn-xs btn-square" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Scrollable timeline — role="log" makes screen readers announce new messages */}
      <div
        ref={scrollRef}
        className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar"
        role="log"
        aria-label="Bot response history"
        aria-live="polite"
        aria-relevant="additions"
      >
        {sorted.map((msg, idx) => (
          <TimelineEntry key={idx} msg={msg} isLast={idx === sorted.length - 1} />
        ))}
      </div>
    </div>
  );
};

export default BotResponseTimeline;
