import Debug from 'debug';
import messageConfig from '@config/messageConfig';

const debug = Debug('app:DuplicateMessageDetector');

interface MessageRecord {
    content: string;
    timestamp: number;
    channelId: string;
}

/**
 * Detects and suppresses duplicate/repetitive bot messages.
 * Tracks recent messages per channel and rejects duplicates within a configurable time window.
 */
export default class DuplicateMessageDetector {
    private static instance: DuplicateMessageDetector;
    private recentMessages: Map<string, MessageRecord[]> = new Map();

    private constructor() {
        debug('DuplicateMessageDetector initialized');
    }

    public static getInstance(): DuplicateMessageDetector {
        if (!DuplicateMessageDetector.instance) {
            DuplicateMessageDetector.instance = new DuplicateMessageDetector();
        }
        return DuplicateMessageDetector.instance;
    }

    /**
     * Check if a message is a duplicate
     * @param channelId The channel ID
     * @param content The message content to check
     * @returns true if the message is a duplicate and should be suppressed
     */
    public isDuplicate(channelId: string, content: string): boolean {
        try {
            const suppressEnabled = messageConfig.get('MESSAGE_SUPPRESS_DUPLICATES');
            if (!suppressEnabled) {
                return false;
            }

            const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
            const historySize = messageConfig.get('MESSAGE_DUPLICATE_HISTORY_SIZE') || 10;
            const now = Date.now();

            // Get or create message history for this channel
            const history = this.recentMessages.get(channelId) || [];

            // Clean up old messages outside the time window
            const recentHistory = history.filter(msg => (now - msg.timestamp) < windowMs);

            // Normalize content for comparison (trim, lowercase, remove extra whitespace)
            const normalizedContent = this.normalizeContent(content);

            // Check for duplicates
            const isDupe = recentHistory.some(msg =>
                this.normalizeContent(msg.content) === normalizedContent
            );

            if (isDupe) {
                debug(`Duplicate message detected in channel ${channelId}: "${content.substring(0, 50)}..."`);
                return true;
            }

            return false;
        } catch (error) {
            debug(`Error checking for duplicates: ${error}`);
            return false; // On error, don't suppress
        }
    }

    /**
     * Record a message that was sent successfully
     * @param channelId The channel ID
     * @param content The message content
     */
    public recordMessage(channelId: string, content: string): void {
        try {
            const suppressEnabled = messageConfig.get('MESSAGE_SUPPRESS_DUPLICATES');
            if (!suppressEnabled) {
                return;
            }

            const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
            const historySize = messageConfig.get('MESSAGE_DUPLICATE_HISTORY_SIZE') || 10;
            const now = Date.now();

            // Get or create message history for this channel
            let history = this.recentMessages.get(channelId) || [];

            // Clean up old messages
            history = history.filter(msg => (now - msg.timestamp) < windowMs);

            // Add new message
            history.push({
                content,
                timestamp: now,
                channelId
            });

            // Trim to max history size
            if (history.length > historySize) {
                history = history.slice(-historySize);
            }

            this.recentMessages.set(channelId, history);
            debug(`Recorded message in channel ${channelId}, history size: ${history.length}`);
        } catch (error) {
            debug(`Error recording message: ${error}`);
        }
    }

    /**
     * Normalize message content for comparison
     */
    private normalizeContent(content: string): string {
        return content
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' '); // Collapse whitespace
    }

    /**
     * Clear message history (useful for testing)
     */
    public clearHistory(channelId?: string): void {
        if (channelId) {
            this.recentMessages.delete(channelId);
        } else {
            this.recentMessages.clear();
        }
    }
}
