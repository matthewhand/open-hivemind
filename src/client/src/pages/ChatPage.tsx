import React, { useState, useEffect } from 'react';
import ChatInterface, { ChatMessage } from '../components/DaisyUI/Chat';

const API_BASE = '/api';

interface Bot {
    id: string;
    name: string;
    persona?: string;
    isActive: boolean;
}

const ChatPage: React.FC = () => {
    const [bots, setBots] = useState<Bot[]>([]);
    const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBots();
    }, []);

    const fetchBots = async () => {
        try {
            const response = await fetch(`${API_BASE}/config/bots`);
            if (response.ok) {
                const data = await response.json();
                setBots(data.bots || []);
                if (data.bots && data.bots.length > 0) {
                    setSelectedBotId(data.bots[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch bots:', error);
        }
    };

    const handleSendMessage = async (content: string) => {
        if (!selectedBotId) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            content,
            timestamp: new Date(),
            sender: {
                id: 'current-user',
                name: 'You',
                type: 'user',
            },
            metadata: { status: 'sending' },
        };

        setMessages((prev) => [...prev, newMessage]);

        // Simulate bot response for now since backend chat API is TBD
        setLoading(true);
        setTimeout(() => {
            const botResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: `Echo from ${bots.find(b => b.id === selectedBotId)?.name}: ${content}`,
                timestamp: new Date(),
                sender: {
                    id: selectedBotId,
                    name: bots.find(b => b.id === selectedBotId)?.name || 'Bot',
                    type: 'bot',
                },
                metadata: { status: 'delivered' },
            };
            setMessages((prev) => [...prev, botResponse]);
            setLoading(false);
        }, 1000);
    };

    const selectedBot = bots.find(b => b.id === selectedBotId);

    return (
        <div className="flex h-full bg-base-100">
            {/* Sidebar - Bot List */}
            <div className="w-64 border-r border-base-300 bg-base-200 flex flex-col">
                <div className="p-4 border-b border-base-300 font-bold text-lg">
                    Bots
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {bots.map((bot) => (
                        <button
                            key={bot.id}
                            onClick={() => setSelectedBotId(bot.id)}
                            className={`btn btn-ghost w-full justify-start ${selectedBotId === bot.id ? 'bg-base-300' : ''}`}
                        >
                            <div className={`avatar placeholder`}>
                                <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                                    <span className="text-xs">{bot.name.charAt(0)}</span>
                                </div>
                            </div>
                            <span className="truncate">{bot.name}</span>
                        </button>
                    ))}
                    {bots.length === 0 && (
                        <div className="p-4 text-center opacity-50 text-sm">No bots found</div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {selectedBot ? (
                    <ChatInterface
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        isLoading={loading}
                        placeholder={`Message ${selectedBot.name}...`}
                        className="h-full"
                        maxHeight="100%"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full opacity-50">
                        Select a bot to start chatting
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
