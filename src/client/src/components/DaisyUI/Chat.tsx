import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date | string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    type: 'user' | 'bot' | 'system';
  };
  type?: 'text' | 'image' | 'file' | 'code' | 'system';
  metadata?: {
    botId?: string;
    channelId?: string;
    platform?: string;
    reactions?: { emoji: string; count: number; users: string[] }[];
    edited?: boolean;
    status?: 'sending' | 'sent' | 'delivered' | 'failed';
  };
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onRetryMessage?: (messageId: string) => void;
  currentUserId?: string;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  showTypingIndicator?: boolean;
  typingUsers?: string[];
  maxHeight?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onRetryMessage,
  currentUserId = 'current-user',
  isLoading = false,
  placeholder = 'Type your message...',
  className = '',
  showTypingIndicator = false,
  typingUsers = [],
  maxHeight = '600px',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [unreadStartIndex, setUnreadStartIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current && (isAutoScroll || force)) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (force) {
          setIsAutoScroll(true);
          setHasNewMessages(false);
          setUnreadStartIndex(null);
        }
      }, 0);
    } else if (!isAutoScroll) {
      setHasNewMessages(true);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;

    if (isAtBottom) {
      setIsAutoScroll(true);
      setHasNewMessages(false);
      setUnreadStartIndex(null);
    } else {
      setIsAutoScroll(false);
    }
  };

  useEffect(() => {
    if (!isAutoScroll && messages.length > 0) {
      if (unreadStartIndex === null) {
        setUnreadStartIndex(messages.length - 1);
      }
    } else if (isAutoScroll) {
       setUnreadStartIndex(null);
    }
    scrollToBottom();
  }, [messages, isAutoScroll]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const showUnreadDivider = unreadStartIndex === index;
    const isCurrentUser = message.sender.id === currentUserId;
    const isBot = message.sender.type === 'bot';
    const isSystem = message.sender.type === 'system';

    // Check if this message should be grouped with the previous one
    const prevMessage = messages[index - 1];
    const isGrouped = prevMessage &&
      prevMessage.sender.id === message.sender.id &&
      (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime()) < 60000; // 1 minute

    if (isSystem) {
      return (
        <React.Fragment key={message.id}>
          {showUnreadDivider && (
            <div className="divider text-secondary text-sm font-medium my-4">New Messages</div>
          )}
          <div className="flex justify-center my-4">
            <div className="badge badge-neutral badge-outline">
              {message.content}
            </div>
          </div>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={message.id}>
        {showUnreadDivider && (
          <div className="divider text-secondary text-sm font-medium my-4">New Messages</div>
        )}
        <div className={`chat ${isCurrentUser ? 'chat-end' : 'chat-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
        {!isGrouped && (
          <div className="chat-image avatar">
            <div className="w-10 rounded-full">
              {message.sender.avatar ? (
                <img alt={message.sender.name} src={message.sender.avatar} />
              ) : (
                <div className={'avatar placeholder'}>
                  <div className={`bg-${isBot ? 'secondary' : 'primary'} text-${isBot ? 'secondary' : 'primary'}-content rounded-full w-10`}>
                    <span className="text-xs">
                      {isBot ? '🤖' : (message.sender.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isGrouped && (
          <div className="chat-header">
            {message.sender.name}
            <time className="text-xs opacity-50 ml-2">
              {formatTime(new Date(message.timestamp))}
            </time>
            {message.metadata?.platform && (
              <div className="badge badge-xs badge-ghost ml-2">
                {message.metadata.platform}
              </div>
            )}
          </div>
        )}

        <div className={`chat-bubble ${isCurrentUser
          ? 'chat-bubble-primary'
          : isBot
            ? 'chat-bubble-secondary'
            : 'chat-bubble-accent'
        } ${message.metadata?.status === 'failed' ? 'chat-bubble-error' : ''}`}>
          {message.type === 'code' ? (
            <div className="mockup-code text-sm">
              <pre><code>{message.content}</code></pre>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Message status indicators */}
          {message.metadata?.status === 'sending' && (
            <div className="flex items-center mt-2 text-xs opacity-60">
              <span className="loading loading-dots loading-xs mr-1"></span>
              Sending...
            </div>
          )}

          {message.metadata?.status === 'failed' && onRetryMessage && (
            <div className="flex items-center mt-2">
              <button
                className="btn btn-xs btn-error btn-outline"
                onClick={() => onRetryMessage(message.id)}
              >
                Retry
              </button>
            </div>
          )}

          {message.metadata?.edited && (
            <div className="text-xs opacity-50 mt-1">
              (edited)
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.metadata?.reactions && message.metadata.reactions.length > 0 && (
          <div className="chat-footer">
            <div className="flex gap-1 mt-1">
              {message.metadata.reactions.map((reaction, idx) => (
                <div key={idx} className="badge badge-sm badge-ghost">
                  {reaction.emoji} {reaction.count}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

  return (
    <div className={`flex flex-col bg-base-100 ${className}`} style={{ height: maxHeight }}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-200">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-8 rounded-full bg-primary">
              <span className="text-primary-content text-sm">🤖</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Bot Chat</h3>
            <p className="text-xs text-base-content/60">
              {messages.length} messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a>🗑️ Clear Chat</a></li>
              <li><a>📋 Export Chat</a></li>
              <li><a>⚙️ Settings</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-base-content/60">Start a conversation with your bot!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}

            {/* Typing Indicator */}
            {showTypingIndicator && typingUsers.length > 0 && (
              <div className="chat chat-start">
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full">
                    <div className="avatar placeholder">
                      <div className="bg-secondary text-secondary-content rounded-full w-10">
                        <span className="text-xs">🤖</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="chat-bubble chat-bubble-secondary">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* Floating Scroll to Bottom Button */}
        {!isAutoScroll && hasNewMessages && (
          <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
            <button
              className="btn btn-sm btn-secondary shadow-lg pointer-events-auto flex items-center gap-2 animate-bounce"
              onClick={() => scrollToBottom(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              New Messages
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-base-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="input input-bordered flex-1"
            disabled={isLoading}
          />

          <div className="flex gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-square"
              title="Attach file"
            >
              📎
            </button>

            <button
              type="submit"
              className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? '' : '➤'}
            </button>
          </div>
        </form>

        <div className="text-xs text-base-content/60 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

// Quick Actions Component for common bot commands
interface QuickActionsProps {
  onActionClick: (action: string) => void;
  actions?: { label: string; command: string; icon?: string }[];
}

export const ChatQuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  actions = [
    { label: 'Status', command: '/status', icon: '📊' },
    { label: 'Help', command: '/help', icon: '❓' },
    { label: 'Restart', command: '/restart', icon: '🔄' },
    { label: 'Settings', command: '/settings', icon: '⚙️' },
  ],
}) => {
  return (
    <div className="flex gap-2 p-2 bg-base-200 rounded-lg">
      {actions.map((action, index) => (
        <button
          key={index}
          className="btn btn-sm btn-ghost"
          onClick={() => onActionClick(action.command)}
        >
          {action.icon && <span className="mr-1">{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
};

// Chat Statistics Component
interface ChatStatsProps {
  totalMessages: number;
  activeUsers: number;
  uptime: string;
  responseTime: string;
}

export const ChatStats: React.FC<ChatStatsProps> = ({
  totalMessages,
  activeUsers,
  uptime,
  responseTime,
}) => {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow">
      <div className="stat">
        <div className="stat-title">Messages</div>
        <div className="stat-value text-primary">{totalMessages.toLocaleString()}</div>
        <div className="stat-desc">Total processed</div>
      </div>

      <div className="stat">
        <div className="stat-title">Active Users</div>
        <div className="stat-value text-secondary">{activeUsers}</div>
        <div className="stat-desc">Currently chatting</div>
      </div>

      <div className="stat">
        <div className="stat-title">Uptime</div>
        <div className="stat-value text-accent">{uptime}</div>
        <div className="stat-desc">System running</div>
      </div>

      <div className="stat">
        <div className="stat-title">Response Time</div>
        <div className="stat-value text-info">{responseTime}</div>
        <div className="stat-desc">Average response</div>
      </div>
    </div>
  );
};

export default ChatInterface;