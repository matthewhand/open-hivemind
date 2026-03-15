import React from 'react';
import { SkeletonRectangle, SkeletonText } from './DaisyUI/Skeleton';

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
                            <SkeletonText lines={1} height="1rem" width="5rem" />
                        </div>
                        <div className="chat-bubble !p-0 !bg-transparent border-0 before:hidden after:hidden">
                            <SkeletonRectangle height="3rem" width="12rem" className="rounded-2xl" />
                        </div>
                        <div className="chat-footer opacity-50 mt-1">
                            <SkeletonText lines={1} height="0.75rem" width="3rem" />
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
        </div>
    );
};

export default BotChatBubbles;
