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
     * Returns a temperature boost based on repeated words across recent bot messages.
     * This helps discourage persistent tics (e.g., saying "shrug" every reply) even when
     * the full response isn't a duplicate.
     */
    public getRepetitionTemperatureBoost(channelId: string): number {
        try {
            const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
            const historySize = messageConfig.get('MESSAGE_DUPLICATE_HISTORY_SIZE') || 10;

            const minHistoryRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY');
            const minHistory = Math.max(1, Number(minHistoryRaw) || 3);

            const ratioThresholdRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD');
            const ratioThreshold = Math.max(0, Math.min(1, Number(ratioThresholdRaw) || 0.6));

            const minDocFreqRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ');
            const minDocFreq = Math.max(1, Number(minDocFreqRaw) || 3);

            const maxBoostRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST');
            const maxBoost = Math.max(0, Number(maxBoostRaw) || 0.4);

            const now = Date.now();
            const history = this.recentMessages.get(channelId) || [];
            const recentHistory = history.filter(msg => (now - msg.timestamp) < windowMs).slice(-historySize);

            if (recentHistory.length < minHistory) return 0;

            const docFreq = new Map<string, number>();
            for (const msg of recentHistory) {
                const uniqueWords = new Set(this.tokenizeWords(msg.content));
                for (const w of uniqueWords) {
                    docFreq.set(w, (docFreq.get(w) || 0) + 1);
                }
            }

            const denom = recentHistory.length;
            let bestRatio = 0;
            let bestWord = '';
            for (const [w, c] of docFreq.entries()) {
                if (c < Math.min(minDocFreq, denom)) continue;
                const ratio = c / denom;
                if (ratio >= ratioThreshold && ratio > bestRatio) {
                    bestRatio = ratio;
                    bestWord = w;
                }
            }

            if (!bestWord) return 0;

            // Map ratioThreshold..1 -> 0..1
            const score = ratioThreshold >= 1 ? 1 : (bestRatio - ratioThreshold) / (1 - ratioThreshold);
            const boost = Math.max(0, Math.min(maxBoost, maxBoost * score));
            if (boost > 0) {
                debug(`Repetition temp boost for ${channelId}: word="${bestWord}" ratio=${bestRatio.toFixed(2)} boost=${boost.toFixed(2)}`);
            }
            return boost;
        } catch (error) {
            debug(`Error computing repetition temperature boost: ${error}`);
            return 0;
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

    private tokenizeWords(content: string): string[] {
        const stop = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'this', 'that', 'these', 'those',
            'i', 'you', 'we', 'they', 'he', 'she', 'me', 'my', 'your', 'our', 'their', 'him', 'her', 'them',
            'as', 'if', 'then', 'than', 'just', 'like', 'okay', 'ok', 'yeah', 'yep', 'no', 'yes', 'not'
        ]);

        const matches = (content || '').toLowerCase().match(/[a-z0-9']+/g) || [];
        return matches
            .map(w => w.replace(/^'+|'+$/g, ''))
            .filter(w => w.length >= 3)
            .filter(w => !stop.has(w));
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
