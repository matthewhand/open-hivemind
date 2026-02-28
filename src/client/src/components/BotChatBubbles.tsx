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
    if (loading) {
        return (
            <div className="flex flex-col gap-4 p-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`chat ${i % 2 === 0 ? 'chat-start' : 'chat-end'}`}>
                        <div className="chat-header mb-1">
                            <div className="skeleton h-4 w-20"></div>
                        </div>
                        <div className="chat-bubble skeleton min-h-[2.75rem] min-w-[3.5rem] w-48 flex flex-col justify-center gap-2 px-4 py-3">
                            <div className="skeleton h-2 w-full"></div>
                            {i % 2 !== 0 && <div className="skeleton h-2 w-2/3"></div>}
                        </div>
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
                        <div className={`chat-bubble ${bubbleColor} min-h-[2.75rem] transition-all duration-200`}>
                            {msg.content}
                        </div>
                        {/* <div className="chat-footer opacity-50">
              Delivered
            </div> */}
                    </div>
                );
            })}
        </div>
    );
};

export default BotChatBubbles;
