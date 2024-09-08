"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ProcessingLocks {
    constructor() {
        this.locks = new Map();
    }
    /**
     * Checks if the channel is currently locked.
     *
     * @param channelId - The ID of the channel to check.
     * @returns True if the channel is locked, false otherwise.
     */
    isLocked(channelId) {
        const locked = this.locks.has(channelId);
        console.debug('isLocked: Channel ' + channelId + ' locked status: ' + locked);
        return locked;
    }
    /**
     * Locks the specified channel.
     *
     * @param channelId - The ID of the channel to lock.
     */
    lock(channelId) {
        this.locks.set(channelId, true);
        console.debug('lock: Channel ' + channelId + ' is now locked.');
    }
    /**
     * Unlocks the specified channel.
     *
     * @param channelId - The ID of the channel to unlock.
     */
    unlock(channelId) {
        this.locks.delete(channelId);
        console.debug('unlock: Channel ' + channelId + ' is now unlocked.');
    }
}
const processingLocks = new ProcessingLocks();
exports.default = processingLocks;
