import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import ChatInterface, { ChatMessage } from '../components/DaisyUI/Chat';
import { BotAvatar } from '../components/BotAvatar';
import { RefreshCw, MessageSquare, Search, Download } from 'lucide-react';
import EmptyState from '../components/DaisyUI/EmptyState';
import Input from '../components/DaisyUI/Input';

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

const ChatPage: React.FC = () => {
  const [bots, setBots] = useState<BotData[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBots();
  }, []);

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

  const handleExport = () => {
    if (!selectedBot || messages.length === 0) return;

    const content = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleString();
      const sender = msg.sender.name || msg.sender.id;
      return `[${time}] ${sender}: ${msg.content}`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${selectedBot.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedBot = bots.find(b => b.id === selectedBotId);
  const filteredBots = bots.filter(bot =>
    bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bot.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center gap-2">
          {selectedBot && messages.length > 0 && (
            <button
              onClick={handleExport}
              className="btn btn-ghost btn-circle"
              title="Export Chat History"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button onClick={handleRefresh} className="btn btn-ghost btn-circle" title="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading || historyLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-base-100 border-r border-base-300 flex flex-col">
          <div className="p-4 border-b border-base-content/10">
            <Input
              placeholder="Search bots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<Search className="w-4 h-4" />}
              size="sm"
            />
          </div>
          <div className="p-2 font-bold text-xs text-base-content/50 uppercase tracking-wide px-4 mt-2">
            {searchTerm ? `Found ${filteredBots.length} Bots` : `Active Bots (${bots.length})`}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && bots.length === 0 ? (
              <div className="flex justify-center p-4"><span className="loading loading-spinner" /></div>
            ) : (
              <ul className="menu w-full p-2 gap-1">
                {filteredBots.map(bot => (
                  <li key={bot.id}>
                    <button
                      className={`${selectedBotId === bot.id ? 'active' : ''} flex items-center gap-3 py-3`}
                      onClick={() => setSelectedBotId(bot.id)}
                    >
                      <div className="relative">
                        <BotAvatar bot={bot} />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base-100 ${bot.connected ? 'bg-success' : 'bg-base-300'}`} />
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-semibold truncate w-full text-left">{bot.name}</span>
                        <span className="text-xs opacity-50 truncate w-full text-left capitalize">{bot.messageProvider}</span>
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
                            onSendMessage={() => { /* Disabled */ }}
                            placeholder="Read-only mode"
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
