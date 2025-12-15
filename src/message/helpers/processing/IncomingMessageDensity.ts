
import Debug from 'debug';

const debug = Debug('app:IncomingMessageDensity');

/**
 * Tracks incoming message density to adjust response probability.
 * "If 5 messages in a minute, chance is 1/5".
 */
export class IncomingMessageDensity {
    private static instance: IncomingMessageDensity;
    private channelHistory: Map<string, number[]> = new Map();
    private readonly WINDOW_MS = 60000; // 1 minute

    public static getInstance(): IncomingMessageDensity {
        if (!IncomingMessageDensity.instance) {
            IncomingMessageDensity.instance = new IncomingMessageDensity();
        }
        return IncomingMessageDensity.instance;
    }

    /**
     * Records an incoming message and returns the density modifier.
     * Modifier = 1 / (MessageCount in last 60s)
     * e.g., 1 msg -> 1.0
     *       5 msgs -> 0.2
     */
    public recordMessageAndGetModifier(channelId: string): number {
        const now = Date.now();
        let timestamps = this.channelHistory.get(channelId) || [];

        // Prune old
        timestamps = timestamps.filter(t => (now - t) < this.WINDOW_MS);

        // Record new
        timestamps.push(now);
        this.channelHistory.set(channelId, timestamps);

        const count = timestamps.length;

        // Calculate Modifier
        // If count <= 1 (just this message), modifier is 1.0
        // If count = 5, modifier = 1/5 = 0.2

        // We ensure a minimum count of 1 to avoid division by zero (impossible here as we just pushed)
        const modifier = 1 / Math.max(1, count);

        debug(`Channel ${channelId}: ${count} messages in last 60s. Density modifier: ${modifier.toFixed(2)}`);

        return modifier;
    }

    // For testing
    public clear() {
        this.channelHistory.clear();
    }
}
