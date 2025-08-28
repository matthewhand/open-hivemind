import Debug from "debug";
const debug = Debug('app:processingLocks');

class ProcessingLocks {
    private locks: Map<string, boolean>;
    constructor() {
        this.locks = new Map<string, boolean>();
    }
    /**
     * Checks if the channel is currently locked.
     * 
     * @param channelId - The ID of the channel to check.
     * @returns True if the channel is locked, false otherwise.
     */
    isLocked(channelId: string): boolean {
        const locked = this.locks.has(channelId);
        debug('isLocked: Channel %s locked status: %s', channelId, locked);
        return locked;
    }
    /**
     * Locks the specified channel.
     * 
     * @param channelId - The ID of the channel to lock.
     */
    lock(channelId: string): void {
        this.locks.set(channelId, true);
        debug('lock: Channel %s is now locked.', channelId);
    }
    /**
     * Unlocks the specified channel.
     * 
     * @param channelId - The ID of the channel to unlock.
     */
    unlock(channelId: string): void {
        this.locks.delete(channelId);
        debug('unlock: Channel %s is now unlocked.', channelId);
    }
}
const processingLocks = new ProcessingLocks();
export default processingLocks;
