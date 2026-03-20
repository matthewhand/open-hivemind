import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import ChatInterface, { ChatMessage } from '../components/DaisyUI/Chat';
import { BotAvatar } from '../components/BotAvatar';
import { RefreshCw, MessageSquare, Cpu, Check, ChevronDown } from 'lucide-react';
import EmptyState from '../components/DaisyUI/EmptyState';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';

// Define Bot type based on API response
interface BotData {
  id: string;
  name: string;
  status: string;
  connected: boolean;
  provider: string;
  messageProvider: string;
  llmProvider: string;
  messageCount: number;
  errorCount: number;
  persona?: string;
}

// LLM Provider option interface
interface LlmProviderOption {
  key: string;
  name: string;
  provider: string;
}

const ChatPage: React.FC = () => {
  const [bots, setBots] = useState<BotData[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [llmProviders, setLlmProviders] = useState<LlmProviderOption[]>([]);
  const [swappingProvider, setSwappingProvider] = useState<string | null>(null);
  const [showProviderDropdown, setShowProviderDropdown] = useState<string | null>(null);

  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  // Fetch LLM providers
  const fetchLlmProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/llm-profiles');
      if (response.ok) {
        const data = await response.json();
        setLlmProviders(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch LLM providers:', err);
    }
  }, []);

  // Hot swap LLM provider
  const handleSwapProvider = async (botId: string, newProviderKey: string) => {
    setSwappingProvider(botId);
    try {
      const response = await fetch(`/api/admin/bots/${botId}/llm-provider`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmProvider: newProviderKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to swap provider');
      }

      // Update local state
      setBots(prev => prev.map(bot =>
        bot.id === botId ? { ...bot, llmProvider: newProviderKey } : bot
      ));

      showSuccess('LLM provider updated successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to swap provider');
    } finally {
      setSwappingProvider(null);
      setShowProviderDropdown(null);
    }
  };

  useEffect(() => {
    fetchBots();
    fetchLlmProviders();
  }, [fetchLlmProviders]);

  useEffect(() => {
    if (selectedBotId) {
      fetchHistory(selectedBotId);
    } else {
      setMessages([]);
    }
  }, [selectedBotId]);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const data = await apiService.getBots();
      setBots(data);
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (botId: string) => {
    try {
      setHistoryLoading(true);
      const history = await apiService.getBotHistory(botId, 50);

      // Map history to ChatMessage
      const mappedMessages: ChatMessage[] = history.map((msg: any) => ({
        id: msg.id || Math.random().toString(),
        content: msg.content,
        timestamp: msg.createdAt || new Date().toISOString(),
        sender: {
          id: msg.author?.id || 'unknown',
          name: msg.author?.username || 'Unknown',
          type: msg.author?.role === 'system' ? 'system' : (msg.author?.bot ? 'bot' : 'user'),
          avatar: msg.author?.avatar, // If available
        },
        metadata: {
          platform: 'discord', // Or infer from bot provider?
        }
      }));

      setMessages(mappedMessages);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedBotId) {
      fetchHistory(selectedBotId);
    } else {
      fetchBots();
    }
  };

  const selectedBot = bots.find(b => b.id === selectedBotId);

  const handleSendMessage = async (content: string, existingId?: string) => {
    if (!selectedBotId) return;

    const tempId = existingId || `temp-${Date.now()}`;

    if (existingId) {
      // If retrying, reset the status to sending
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, metadata: { ...m.metadata, status: 'sending' } }
          : m
      ));
    } else {
      const tempMessage: ChatMessage = {
        id: tempId,
        content,
        timestamp: new Date().toISOString(),
        sender: {
          id: 'current-user',
          name: 'You',
          type: 'user',
        },
        metadata: {
          status: 'sending',
        },
      };
      setMessages(prev => [...prev, tempMessage]);
    }

    try {
      await apiService.post(`/api/bots/${selectedBotId}/message`, { content });
      // Depending on backend, we could fetch history to get actual messages
      // but for this task, the optimistic rollback is the focus.
      await fetchHistory(selectedBotId);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark optimistic update as failed
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, metadata: { ...m.metadata, status: 'failed' } }
          : m
      ));
    }
  };

  const handleRetryMessage = (messageId: string) => {
    const messageToRetry = messages.find(m => m.id === messageId);
    if (messageToRetry) {
      handleSendMessage(messageToRetry.content, messageId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 bg-base-100 border-b border-base-300 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Live Chat Monitor
          </h1>
          <p className="text-sm text-base-content/60">Monitor conversations across your bot fleet</p>
        </div>
        <button onClick={handleRefresh} className="btn btn-ghost btn-circle" title="Refresh" aria-label="Refresh chat">
          <RefreshCw className={`w-5 h-5 ${loading || historyLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-base-100 border-r border-base-300 flex flex-col">
          <div className="p-4 font-bold text-sm text-base-content/50 uppercase tracking-wide">
            Active Bots ({bots.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && bots.length === 0 ? (
              <div className="flex justify-center p-4"><span className="loading loading-spinner" /></div>
            ) : (
              <ul className="menu w-full p-2 gap-1">
                {bots.map(bot => (
                  <li key={bot.id} className="relative">
                    <button
                      className={`${selectedBotId === bot.id ? 'active' : ''} flex items-center gap-3 py-3`}
                      onClick={() => setSelectedBotId(bot.id)}
                    >
                      <div className="relative">
                        <BotAvatar bot={bot} />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base-100 ${bot.connected ? 'bg-success' : 'bg-base-300'}`} />
                      </div>
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="font-semibold truncate w-full text-left">{bot.name}</span>
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xs opacity-50 truncate text-left capitalize">{bot.messageProvider}</span>
                          <span className="text-xs opacity-30">•</span>
                          {/* LLM Provider Hot Swap Dropdown */}
                          <div className="dropdown dropdown-hover dropdown-right flex-1">
                            <button
                              className="btn btn-ghost btn-xs px-1 min-h-0 h-auto flex items-center gap-1 text-xs opacity-70 hover:opacity-100 group"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowProviderDropdown(showProviderDropdown === bot.id ? null : bot.id);
                              }}
                              disabled={swappingProvider === bot.id}
                              title="Click to change LLM provider"
                            >
                              <Cpu className="w-3 h-3" />
                              {swappingProvider === bot.id ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <>
                                  <span className="truncate max-w-[80px]">{bot.llmProvider || 'Default'}</span>
                                  <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                </>
                              )}
                            </button>
                            {showProviderDropdown === bot.id && (
                              <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-50 max-h-60 overflow-y-auto">
                                <li className="menu-title">
                                  <span>Switch Provider</span>
                                </li>
                                <li>
                                  <button
                                    className={`${!bot.llmProvider ? 'active' : ''} btn btn-ghost btn-sm justify-start`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSwapProvider(bot.id, '');
                                    }}
                                  >
                                    <Check className={`w-4 h-4 ${!bot.llmProvider ? 'visible' : 'invisible'}`} />
                                    System Default
                                  </button>
                                </li>
                                <div className="divider my-1"></div>
                                {llmProviders.map(provider => (
                                  <li key={provider.key}>
                                    <button
                                      className={`${bot.llmProvider === provider.key ? 'active' : ''} btn btn-ghost btn-sm justify-start`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSwapProvider(bot.id, provider.key);
                                      }}
                                    >
                                      <Check className={`w-4 h-4 ${bot.llmProvider === provider.key ? 'visible' : 'invisible'}`} />
                                      <div className="flex flex-col items-start">
                                        <span className="font-medium">{provider.name}</span>
                                        <span className="text-xs opacity-50">{provider.provider}</span>
                                      </div>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-base-100 relative">
          {selectedBot ? (
            <div className="flex-1 flex flex-col h-full relative">
              {historyLoading && (
                <div className="absolute inset-0 bg-base-100/50 z-20 flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              )}
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                placeholder="Type a message..."
                className="h-full"
                maxHeight="100%"
                isLoading={false}
              />
              {/* Overlay to intercept clicks on input area if needed, but placeholder should suffice */}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-base-200/50">
              <EmptyState
                icon={MessageSquare}
                title="Select a Bot"
                description="Choose a bot from the sidebar to view its real-time chat history and activity."
                variant="noData"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
