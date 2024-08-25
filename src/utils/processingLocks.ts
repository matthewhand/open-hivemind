import Debug from "debug";
const debug = Debug("app");

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
        console.debug('isLocked: Channel ' + channelId + ' locked status: ' + locked);
        return locked;
    }
    /**
     * Locks the specified channel.
     * 
     * @param channelId - The ID of the channel to lock.
     */
    lock(channelId: string): void {
        this.locks.set(channelId, true);
        console.debug('lock: Channel ' + channelId + ' is now locked.');
    }
    /**
     * Unlocks the specified channel.
     * 
     * @param channelId - The ID of the channel to unlock.
     */
    unlock(channelId: string): void {
        this.locks.delete(channelId);
        console.debug('unlock: Channel ' + channelId + ' is now unlocked.');
    }
}
const processingLocks = new ProcessingLocks();
export default processingLocks;
