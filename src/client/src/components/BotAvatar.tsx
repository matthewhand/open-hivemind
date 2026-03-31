/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Bot, User } from 'lucide-react';
import { SkeletonAvatar } from '../components/DaisyUI/Skeleton';
import Avatar from './DaisyUI/Avatar';

// Duplicate interface just for props, or import existing if possible
interface BotData {
    id: string;
    name: string;
    provider: string; // Message Provider Name
    llmProvider: string; // LLM Provider Name
    persona?: string; // Bot Persona
    status: string;
    connected: boolean;
    messageCount: number;
    errorCount: number;
    config?: any; // Bot specific config overrides
    envOverrides?: any;
}

export const BotAvatar: React.FC<{ bot: BotData }> = ({ bot }) => {
    const [loaded, setLoaded] = useState(false);
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        // Simulate fetching external avatar or check if provider has one
        const timer = setTimeout(() => {
            setLoaded(true);
        }, 1500 + Math.random() * 1000); // Random delay 1.5-2.5s for realism

        return () => clearTimeout(timer);
    }, [bot]);

    if (!loaded) {
        return (
            <div className="skeleton h-10 w-10 shrink-0 rounded-full bg-base-300 animate-pulse"></div>
        );
    }

    return (
        <Avatar
            placeholder={!src}
            src={src || undefined}
            alt={bot.name}
            size="md"
            shape="circle"
        >
            {!src && (
                <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center transition-opacity duration-500 opacity-100">
                    <Bot className="w-6 h-6" />
                </div>
            )}
        </Avatar>
    );
};
