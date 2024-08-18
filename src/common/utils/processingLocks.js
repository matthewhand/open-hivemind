// src/utils/processingLocks.js
class ProcessingLocks {
    constructor() {
        this.locks = new Map();
    }

    isLocked(channelId) {
        return this.locks.has(channelId);
    }

    lock(channelId) {
        this.locks.set(channelId, true);
    }

    unlock(channelId) {
        this.locks.delete(channelId);
    }
}

const processingLocks = new ProcessingLocks();
module.exports = processingLocks;
