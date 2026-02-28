import React from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    sender?: string;
}

interface BotChatBubblesProps {
    messages: Message[];
    botName?: string;
    loading?: boolean;
    isTyping?: boolean;
}

const BotChatBubbles: React.FC<BotChatBubblesProps> = ({ messages, botName = 'Bot', loading = false, isTyping = false }) => {
    if (loading) {
        return (
            <div className="flex flex-col gap-4 p-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`chat ${i % 2 === 0 ? 'chat-start' : 'chat-end'}`}>
                        <div className="chat-header mb-1">
                            <div className="skeleton h-4 w-20"></div>
                        </div>
                        <div className="chat-bubble skeleton h-12 w-48"></div>
                        <div className="chat-footer opacity-50 mt-1">
                            <div className="skeleton h-3 w-12"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="text-center p-8 text-neutral-content/50">
                <p>No chat history available.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-4 max-h-[600px] overflow-y-auto">
            {messages.map((msg, index) => {
                const isBot = msg.role === 'assistant' || msg.sender === botName;
                const align = isBot ? 'chat-start' : 'chat-end';
                const bubbleColor = isBot ? 'chat-bubble-primary' : 'chat-bubble-secondary';

                return (
                    <div key={msg.id || index} className={`chat ${align}`}>
                        <div className="chat-header">
                            {msg.sender || (isBot ? botName : 'User')}
                            <time className="text-xs opacity-50 ml-2">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </time>
                        </div>
                        <div className={`chat-bubble ${bubbleColor}`}>
                            {msg.content}
                        </div>
                        {/* <div className="chat-footer opacity-50">
              Delivered
            </div> */}
                    </div>
                );
            })}

            {isTyping && (
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
        </div>
    );
};

export default BotChatBubbles;
