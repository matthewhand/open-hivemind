import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import ChatInterface, { ChatMessage } from '../components/DaisyUI/Chat';
import BotChatBubbles from '../components/BotChatBubbles';
import { RefreshCw, MessageSquare, Menu as LucideMenuIcon, X } from 'lucide-react';
import Button from '../components/DaisyUI/Button';
import PageHeader from '../components/DaisyUI/PageHeader';
import EmptyState from '../components/DaisyUI/EmptyState';
import { SkeletonList, SkeletonMessageList } from '../components/DaisyUI/Skeleton';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { useMediaQuery } from '../hooks/useBreakpoint';
import Drawer from '../components/DaisyUI/Drawer';
import { BotListItem } from '../components/BotListItem';
import Tooltip from '../components/DaisyUI/Tooltip';
import Swap from '../components/DaisyUI/Swap';

// Define Bot type based on API response
export interface BotData {
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
export interface LlmProviderOption {
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  // Track offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch LLM providers
  const fetchLlmProviders = useCallback(async () => {
    try {
      const data = await apiService.get('/api/admin/llm-profiles');
      setLlmProviders((data as any).data || []);
    } catch (_err) {
      showError('Failed to fetch LLM providers');
    }
  }, []);

  // Hot swap LLM provider
  const handleSwapProvider = async (botId: string, newProviderKey: string) => {
    setSwappingProvider(botId);
    try {
      await apiService.put(`/api/admin/bots/${botId}/llm-provider`, { llmProvider: newProviderKey });

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

  // Fetch bots via cache layer
  const {
    data: botsData,
    isLoading: botsLoading,
    refetch: refetchBots,
  } = useQuery<BotData[]>({
    queryKey: ['bots'],
    queryFn: () => apiService.get<BotData[]>('/api/bots'),
    staleTime: 30_000,
    gcTime: 60_000,
  });

  useEffect(() => {
    if (botsData) setBots(Array.isArray(botsData) ? botsData : []);
  }, [botsData]);

  useEffect(() => {
    setLoading(botsLoading);
  }, [botsLoading]);

  const fetchBots = useCallback(async () => {
    await refetchBots();
  }, [refetchBots]);

  const fetchHistory = useCallback(async (botId: string) => {
    try {
      setHistoryLoading(true);
      const history = await apiService.getBotHistory(botId, 50);

      // Map history to ChatMessage
      const mappedMessages: ChatMessage[] = history.map((msg: any) => ({
        id: msg.id || crypto.randomUUID(),
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
    } catch (_err) {
      showError('Failed to fetch chat history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    fetchLlmProviders();
  }, [fetchBots, fetchLlmProviders]);

  useEffect(() => {
    if (selectedBotId) {
      fetchHistory(selectedBotId);
    } else {
      setMessages([]);
    }
  }, [selectedBotId, fetchHistory]);

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
    } catch (_err) {
      showError('Failed to send message');
      // Mark optimistic update as failed
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, metadata: { ...m.metadata, status: 'failed' } }
          : m
      ));
    }
  };

  const _handleRetryMessage = (messageId: string) => {
    const messageToRetry = messages.find(m => m.id === messageId);
    if (messageToRetry) {
      handleSendMessage(messageToRetry.content, messageId);
    }
  };

  // Map ChatMessages to BotChatBubbles format for the sidebar preview
  const bubbleMessages = useMemo(() => {
    return messages.slice(-5).map(m => ({
      id: m.id,
      role: (m.sender?.type === 'bot' || m.sender?.type === 'system' ? (m.sender.type === 'system' ? 'system' as const : 'assistant' as const) : 'user' as const),
      content: m.content,
      timestamp: m.timestamp,
      sender: m.sender?.name,
    }));
  }, [messages]);

  const botListContent = (
    <>
      <div className="p-4 font-bold text-sm text-base-content/50 uppercase tracking-wide">
        Active Bots ({bots.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && bots.length === 0 ? (
          <div className="p-4"><SkeletonList items={4} showAvatar /></div>
        ) : (
          <ul className="menu w-full p-2 gap-1">
            {bots.map(bot => (
              <BotListItem
                key={bot.id}
                bot={bot}
                isSelected={selectedBotId === bot.id}
                onSelect={(id) => { setSelectedBotId(id); setSidebarOpen(false); }}
                llmProviders={llmProviders}
                swappingProvider={swappingProvider}
                showProviderDropdown={showProviderDropdown}
                onToggleDropdown={(isOpen, botId) => setShowProviderDropdown(isOpen ? botId : null)}
                onSwapProvider={handleSwapProvider}
              />
            ))}
          </ul>
        )}
      </div>
      {selectedBot && (
        <div className="border-t border-base-300">
          <div className="p-3 font-bold text-xs text-base-content/50 uppercase tracking-wide">
            Recent Messages
          </div>
          <BotChatBubbles
            messages={bubbleMessages}
            botName={selectedBot.name}
            loading={historyLoading}
          />
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full bg-base-200">
      <div className="p-4 bg-base-100 border-b border-base-300 shadow-sm flex items-center gap-2">
        {!isDesktop && (
          <Tooltip content={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} position="right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-square"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
            >
              <Swap
                checked={sidebarOpen}
                onContent={<X className="w-5 h-5" />}
                offContent={<LucideMenuIcon className="w-5 h-5" />}
                rotate
              />
            </Button>
          </Tooltip>
        )}
        <PageHeader
          title="Live Chat Monitor"
          description="Monitor conversations across your bot fleet"
          icon={MessageSquare}
          className="flex-1 mb-0 p-0 border-0 bg-transparent rounded-none"
          actions={
            <Tooltip content="Refresh" position="left">
              <Button variant="ghost" size="md" onClick={handleRefresh} loading={loading || historyLoading} className="btn-circle" aria-label="Refresh" />
            </Tooltip>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Mobile Overlay & Container handled by Drawer component */}
        <div className={isDesktop ? 'relative w-72 flex-shrink-0 border-r border-base-300' : 'fixed inset-0 z-40 pointer-events-none'}>
          <div className={isDesktop ? 'h-full' : `absolute inset-0 z-50 pointer-events-auto transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Dark Backdrop for Mobile */}
            {!isDesktop && (
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            <div className={`${isDesktop ? 'h-full' : `absolute top-0 bottom-0 left-0 w-72 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}`}>
              <Drawer
                isOpen={isDesktop ? true : sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                variant={isDesktop ? "sidebar" : "mobile"}
                className={isDesktop ? "" : "shadow-xl pt-14"}
              >
                {botListContent}
              </Drawer>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-base-100 relative">
          {selectedBot ? (
            <div className="flex-1 flex flex-col h-full relative">
              {historyLoading && (
                <div className="absolute inset-0 bg-base-100/50 z-20">
                  <SkeletonMessageList messages={4} />
                </div>
              )}
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                placeholder={isOffline ? "You are currently offline..." : "Type a message..."}
                className="h-full"
                maxHeight="100%"
                isLoading={false}
                disabled={isOffline}
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
