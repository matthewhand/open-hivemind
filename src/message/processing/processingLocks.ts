import Debug from 'debug';

const debug = Debug('app:processingLocks');

class ProcessingLocks {
    private locks: Map<string, boolean>;
    constructor() {
        this.locks = new Map<string, boolean>();
    }

    /**
     * Creates a unique lock key from channel and optional bot ID
     * @param channelId - The channel ID
     * @param botId - Optional bot ID for per-bot locking
     */
    private getKey(channelId: string, botId?: string): string {
        return botId ? `${channelId}:${botId}` : channelId;
    }

    /**
     * Checks if the channel is currently locked for this bot.
     * 
     * @param channelId - The ID of the channel to check.
     * @param botId - Optional bot ID for per-bot locking.
     * @returns True if the channel is locked, false otherwise.
     */
    isLocked(channelId: string, botId?: string): boolean {
        const key = this.getKey(channelId, botId);
        const locked = this.locks.has(key);
        debug(`isLocked: ${key} locked status: ${locked}`);
        return locked;
    }

    /**
     * Locks the specified channel for this bot.
     * 
     * @param channelId - The ID of the channel to lock.
     * @param botId - Optional bot ID for per-bot locking.
     */
    lock(channelId: string, botId?: string): void {
        const key = this.getKey(channelId, botId);
        this.locks.set(key, true);
        debug(`lock: ${key} is now locked.`);
    }

    /**
     * Unlocks the specified channel for this bot.
     * 
     * @param channelId - The ID of the channel to unlock.
     * @param botId - Optional bot ID for per-bot locking.
     */
    unlock(channelId: string, botId?: string): void {
        const key = this.getKey(channelId, botId);
        this.locks.delete(key);
        debug(`unlock: ${key} is now unlocked.`);
    }
}
const processingLocks = new ProcessingLocks();
export default processingLocks;
