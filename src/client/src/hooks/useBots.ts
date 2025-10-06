import { useState, useCallback } from 'react';
import type { BotInstance, BotStatus } from '../types/bot';

const useBots = () => {
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Create new bot
  const createBot = useCallback((name: string, description?: string) => {
    const newBot: BotInstance = {
      id: generateId(),
      name: name || 'New Bot',
      description,
      status: 'stopped',
      messageProviders: [],
      llmProviders: [],
      createdAt: new Date().toISOString(),
      lastActive: null,
      error: null
    };

    setBots(prev => [...prev, newBot]);
    return newBot;
  }, []);

  // Update bot
  const updateBot = useCallback((botId: string, updates: Partial<BotInstance>) => {
    setBots(prev => prev.map(bot =>
      bot.id === botId
        ? { ...bot, ...updates }
        : bot
    ));
  }, []);

  // Delete bot
  const deleteBot = useCallback((botId: string) => {
    setBots(prev => prev.filter(bot => bot.id !== botId));
  }, []);

  // Clone bot
  const cloneBot = useCallback((botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return null;

    const clonedBot: BotInstance = {
      ...bot,
      id: generateId(),
      name: `${bot.name} (Clone)`,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      lastActive: null,
      error: null
    };

    setBots(prev => [...prev, clonedBot]);
    return clonedBot;
  }, [bots]);

  // Start bot
  const startBot = useCallback(async (botId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Update bot status to starting
      updateBot(botId, { status: 'starting', error: null });

      // Simulate API call to start bot
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update bot status to running
      updateBot(botId, {
        status: 'running',
        lastActive: new Date().toISOString(),
        error: null
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start bot';
      updateBot(botId, { status: 'error', error: errorMessage });
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateBot]);

  // Stop bot
  const stopBot = useCallback(async (botId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Update bot status to stopping
      updateBot(botId, { status: 'stopping' });

      // Simulate API call to stop bot
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update bot status to stopped
      updateBot(botId, { status: 'stopped', error: null });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop bot';
      updateBot(botId, { status: 'error', error: errorMessage });
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateBot]);

  // Get bot by ID
  const getBot = useCallback((botId: string) => {
    return bots.find(bot => bot.id === botId) || null;
  }, [bots]);

  // Get bots by status
  const getBotsByStatus = useCallback((status: BotStatus) => {
    return bots.filter(bot => bot.status === status);
  }, [bots]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
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
    getBotsByStatus,
    clearError
  };
};

export { useBots };
export default useBots;
