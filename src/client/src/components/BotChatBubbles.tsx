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
}

const BotChatBubbles: React.FC<BotChatBubblesProps> = ({ messages, botName = 'Bot', loading = false }) => {
    if (messages.length === 0 && !loading) {
        return (
            <div className="text-center p-8 text-neutral-content/50">
                <p>No chat history available.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-4 max-h-[600px] overflow-y-auto" aria-live="polite">
            {messages.length === 0 && loading && (
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={`init-skeleton-${i}`} className={`chat ${i % 2 === 0 ? 'chat-start' : 'chat-end'}`} aria-hidden="true">
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
            )}

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

            {messages.length > 0 && loading && (
                <div className="chat chat-start" aria-label="Bot is typing">
                    <div className="chat-header mb-1">
                        {botName}
                    </div>
                    <div className="chat-bubble chat-bubble-primary skeleton h-12 w-16 opacity-70 flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BotChatBubbles;
