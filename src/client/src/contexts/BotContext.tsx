import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BotInstance, BotStatus, MessageProvider, LLMProvider } from '../types/bot';

interface BotContextType {
    bots: BotInstance[];
    loading: boolean;
    error: string | null;
    createBot: (name: string, description?: string) => BotInstance;
    updateBot: (botId: string, updates: Partial<BotInstance>) => void;
    deleteBot: (botId: string) => void;
    cloneBot: (botId: string) => BotInstance | null;
    startBot: (botId: string) => Promise<boolean>;
    stopBot: (botId: string) => Promise<boolean>;
    getBot: (botId: string) => BotInstance | null;
    addMessageProvider: (botId: string, type: string, name: string, config: any) => void;
    addLLMProvider: (botId: string, type: string, name: string, config: any) => void;
    removeProvider: (botId: string, providerId: string) => void;
    clearError: () => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

const STORAGE_KEY = 'open-hivemind-bots';

export const BotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bots, setBots] = useState<BotInstance[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setBots(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Failed to load bots from storage:', err);
        } finally {
            setInitialized(true);
        }
    }, []);

    // Save to storage whenever bots change
    useEffect(() => {
        if (initialized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
        }
    }, [bots, initialized]);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const createBot = useCallback((name: string, description?: string) => {
        const newBot: BotInstance = {
            id: generateId(),
            name: name || 'New Bot',
            status: BotStatus.INACTIVE, // Default to inactive/stopped
            provider: {} as any, // Legacy field, kept for type compatibility if needed, but we use arrays below
            messageProviders: [],
            llmProviders: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            config: {}, // Generic config
            envOverrides: {}
        };

        setBots(prev => [...prev, newBot]);
        return newBot;
    }, []);

    const updateBot = useCallback((botId: string, updates: Partial<BotInstance>) => {
        setBots(prev => prev.map(bot =>
            bot.id === botId
                ? { ...bot, ...updates, updatedAt: new Date().toISOString() }
                : bot
        ));
    }, []);

    const deleteBot = useCallback((botId: string) => {
        setBots(prev => prev.filter(bot => bot.id !== botId));
    }, []);

    const cloneBot = useCallback((botId: string) => {
        const bot = bots.find(b => b.id === botId);
        if (!bot) return null;

        const clonedBot: BotInstance = {
            ...bot,
            id: generateId(),
            name: `${bot.name} (Clone)`,
            status: BotStatus.INACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setBots(prev => [...prev, clonedBot]);
        return clonedBot;
    }, [bots]);

    const startBot = useCallback(async (botId: string) => {
        try {
            setLoading(true);
            setError(null);

            // Validation: Check for providers
            const bot = bots.find(b => b.id === botId);
            if (!bot) throw new Error('Bot not found');
            if (bot.messageProviders.length === 0 && bot.llmProviders.length === 0) {
                throw new Error('Cannot start bot: No providers configured');
            }

            updateBot(botId, { status: BotStatus.STARTING });
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate startup
            updateBot(botId, { status: BotStatus.ACTIVE, lastActive: new Date().toISOString() }); // Using ACTIVE mapping to 'running' in UI
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to start';
            setError(msg);
            updateBot(botId, { status: BotStatus.ERROR, error: msg });
            return false;
        } finally {
            setLoading(false);
        }
    }, [bots, updateBot]);

    const stopBot = useCallback(async (botId: string) => {
        try {
            setLoading(true);
            updateBot(botId, { status: BotStatus.STOPPING });
            await new Promise(resolve => setTimeout(resolve, 500));
            updateBot(botId, { status: BotStatus.INACTIVE });
            return true;
        } catch (err) {
            setError('Failed to stop bot');
            return false;
        } finally {
            setLoading(false);
        }
    }, [updateBot]);

    const getBot = useCallback((botId: string) => {
        return bots.find(b => b.id === botId) || null;
    }, [bots]);

    const addMessageProvider = useCallback((botId: string, type: string, name: string, config: any) => {
        setBots(prev => {
            const target = prev.find(b => b.id === botId);

            return prev.map(bot => {
                if (bot.id !== botId) return bot;
                return {
                    ...bot,
                    messageProviders: [
                        ...bot.messageProviders,
                        {
                            id: generateId(),
                            type: type as any,
                            name,
                            config,
                            enabled: true
                        }
                    ]
                };
            });
        });
    }, []);

    const addLLMProvider = useCallback((botId: string, type: string, name: string, config: any) => {
        setBots(prev => prev.map(bot => {
            if (bot.id !== botId) return bot;
            return {
                ...bot,
                llmProviders: [
                    ...bot.llmProviders,
                    {
                        id: generateId(),
                        type: type as any,
                        name,
                        config,
                        enabled: true
                    }
                ]
            };
        }));
    }, []);

    const removeProvider = useCallback((botId: string, providerId: string) => {
        setBots(prev => prev.map(bot => {
            if (bot.id !== botId) return bot;
            return {
                ...bot,
                messageProviders: bot.messageProviders.filter(p => p.id !== providerId),
                llmProviders: bot.llmProviders.filter(p => p.id !== providerId)
            };
        }));
    }, []);

    const clearError = () => setError(null);

    return (
        <BotContext.Provider value={{
            bots,
            loading,
            error,
            createBot,
            updateBot,
            deleteBot,
            cloneBot,
            startBot,
            stopBot,
            getBot,
            addMessageProvider,
            addLLMProvider,
            removeProvider,
            clearError
        }}>
            {children}
        </BotContext.Provider>
    );
};

export const useBotContext = () => {
    const context = useContext(BotContext);
    if (context === undefined) {
        throw new Error('useBotContext must be used within a BotProvider');
    }
    return context;
};
