import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  /** Accessible label for the chat region */
  ariaLabel?: string;
  /** Enable announcements for screen readers */
  announceMessages?: boolean;
}

/**
 * Screen reader announcement helper for live regions
 */
const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
};

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
  ariaLabel = 'Chat conversation',
  announceMessages = true,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Announce new messages to screen readers
  useEffect(() => {
    if (announceMessages && messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      newMessages.forEach((msg) => {
        if (msg.sender.id !== currentUserId && !msg.metadata?.status) {
          announceToScreenReader(
            `New message from ${msg.sender.name}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`,
            'polite'
          );
        }
      });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, currentUserId, announceMessages]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!keyboardShortcutsEnabled) return;

    // Alt + Number keys to focus specific messages (1-9)
    if (e.altKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const index = parseInt(e.key, 10) - 1;
      const messageElements = messagesContainerRef.current?.querySelectorAll('[data-message-id]');
      if (messageElements && messageElements[index]) {
        (messageElements[index] as HTMLElement).focus();
      }
    }

    // Escape to return focus to input
    if (e.key === 'Escape') {
      inputRef.current?.focus();
    }

    // Ctrl/Cmd + / to show keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      announceToScreenReader(
        'Keyboard shortcuts: Alt plus 1 through 9 to navigate to messages, Escape to return to input, Enter to send message'
      );
    }
  }, [keyboardShortcutsEnabled]);

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
        <div key={message.id} className="flex justify-center my-4">
          <div className="badge badge-neutral badge-outline">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        data-message-id={message.id}
        tabIndex={0}
        role="article"
        aria-label={`Message from ${message.sender.name} at ${formatTime(new Date(message.timestamp))}`}
        className={`chat ${isCurrentUser ? 'chat-end' : 'chat-start'} ${isGrouped ? 'mt-1' : 'mt-4'} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg`}
      >
        {!isGrouped && (
          <div className="chat-image avatar" aria-hidden="true">
            <div className="w-10 rounded-full">
              {message.sender.avatar ? (
                <img alt={`${message.sender.name} avatar`} src={message.sender.avatar} />
              ) : (
                <div className="avatar placeholder">
                  <div className={`bg-${isBot ? 'secondary' : 'primary'} text-${isBot ? 'secondary' : 'primary'}-content rounded-full w-10`}>
                    <span className="text-xs" aria-hidden="true">
                      {isBot ? '🤖' : (message.sender.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isGrouped && (
          <div className="chat-header">
            <span className="font-medium">{message.sender.name}</span>
            <time className="text-xs opacity-50 ml-2" dateTime={new Date(message.timestamp).toISOString()}>
              {formatTime(new Date(message.timestamp))}
            </time>
            {message.metadata?.platform && (
              <span className="badge badge-xs badge-ghost ml-2">
                {message.metadata.platform}
              </span>
            )}
            {isCurrentUser && (
              <span className="sr-only">(You)</span>
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
    );
  };

  return (
    <div
      className={`flex flex-col bg-base-100 ${className}`}
      style={{ height: maxHeight }}
      role="region"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {/* Screen reader live region for announcements */}
      <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-200">
        <div className="flex items-center gap-3">
          <div className="avatar" aria-hidden="true">
            <div className="w-8 rounded-full bg-primary">
              <span className="text-primary-content text-sm">🤖</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold" id="chat-title">Bot Chat</h3>
            <p className="text-xs text-base-content/60" aria-live="polite">
              {messages.length} messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Chat options menu"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
            </button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52" role="menu">
              <li role="none"><button type="button" className="w-full text-left" role="menuitem" onClick={() => announceToScreenReader('Clear chat option selected')}>🗑️ Clear Chat</button></li>
              <li role="none"><button type="button" className="w-full text-left" role="menuitem" onClick={() => announceToScreenReader('Export chat option selected')}>📋 Export Chat</button></li>
              <li role="none"><button type="button" className="w-full text-left" role="menuitem" onClick={() => announceToScreenReader('Settings option selected')}>⚙️ Settings</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        aria-labelledby="chat-title"
        tabIndex={0}
      >
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
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-base-200">
        <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Send message form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="input input-bordered flex-1"
            disabled={isLoading}
            aria-label="Message input"
            aria-describedby="input-help"
            aria-busy={isLoading}
          />

          <div className="flex gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-square"
              aria-label="Attach file"
              title="Attach file"
            >
              <span aria-hidden="true">📎</span>
            </button>

            <button
              type="submit"
              className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={!inputValue.trim() || isLoading}
              aria-label={isLoading ? 'Sending message' : 'Send message'}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="sr-only">Sending...</span>
              ) : (
                <>
                  <span aria-hidden="true">➤</span>
                  <span className="sr-only">Send</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div id="input-help" className="text-xs text-base-content/60 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line. Press Alt+1-9 to navigate messages, Escape to return to input.
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