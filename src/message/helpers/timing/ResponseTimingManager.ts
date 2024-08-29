import Debug from "debug";

const debug = Debug("app:ResponseTimingManager");

/**
 * ResponseTimingManager Class
 *
 * Manages the timing of responses in a chat, introducing delays to simulate natural conversation flow.
 * The delay is calculated based on the time since the last message was sent, with a decay factor applied to avoid rapid responses.
 * This class is implemented as a singleton to ensure consistent behavior across the application.
 *
 * Key Features:
 * - Singleton pattern for centralized timing management.
 * - Calculates delays with a decay factor based on message activity.
 * - Logs timing information for debugging and monitoring.
 */
class ResponseTimingManager {
    private static instance: ResponseTimingManager;
    private maxDelay: number;
    private minDelay: number;
    private decayRate: number;
    private channelsTimingInfo: Record<string, { lastIncomingMessageTime?: number }> = {};

    /**
     * Private constructor to enforce singleton pattern.
     * Initializes the timing parameters including max delay, min delay, and decay rate.
     *
     * @param config - Configuration object containing maxDelay, minDelay, and decayRate.
     */
    private constructor({ maxDelay = 10000, minDelay = 1000, decayRate = -0.5 } = {}) {
        this.maxDelay = maxDelay;
        this.minDelay = minDelay;
        this.decayRate = decayRate;
    }

    /**
     * Retrieves the singleton instance of ResponseTimingManager, creating it if necessary.
     *
     * @returns The singleton instance of ResponseTimingManager.
     */
    public static getInstance()(): ResponseTimingManager {
        if (!ResponseTimingManager.instance) {
            ResponseTimingManager.instance = new ResponseTimingManager({});
        }
        return ResponseTimingManager.instance;
    }

    /**
     * Logs the arrival of an incoming message for a specific channel.
     * This method updates the lastIncomingMessageTime for the channel to the current time.
     *
     * @param channelId - The ID of the channel where the message was received.
     */
    public logIncomingMessage(channelId: string): void {
        const currentTime = Date.now();
        if (!this.channelsTimingInfo[channelId]) {
            this.channelsTimingInfo[channelId] = {};
        }
        this.channelsTimingInfo[channelId].lastIncomingMessageTime = currentTime;
        debug(`logIncomingMessage: Channel ${channelId} logged incoming message at ${currentTime}.`);
    }

    /**
     * Calculates the delay before sending a message, taking into account the time since the last message
     * and applying a decay factor to avoid overly rapid responses.
     *
     * @param channelId - The ID of the channel for which to calculate the delay.
     * @param processingTime - The time taken by the processing step.
     * @returns The calculated delay (in milliseconds) before sending the message.
     */
    public calculateDelay(channelId: string, processingTime: number): number {
        const currentTime = Date.now();
        const channelInfo = this.channelsTimingInfo[channelId];

        if (!channelInfo || !channelInfo.lastIncomingMessageTime) {
            // No prior incoming message, apply minimum delay minus processing time
            return Math.max(this.minDelay - processingTime, 0);
        }

        const timeSinceLastIncomingMessage = currentTime - channelInfo.lastIncomingMessageTime;
        // Exponential decay to calculate delay
        let delay = Math.exp(this.decayRate * timeSinceLastIncomingMessage / 1000) * this.maxDelay - processingTime;
        delay = Math.min(Math.max(delay, this.minDelay), this.maxDelay);

        debug(`calculateDelay: Channel ${channelId} calculated delay: ${delay}ms (Processing Time: ${processingTime}ms).`);
        return delay;
    }

    /**
     * Schedules a message to be sent after the calculated adaptive delay.
     * This method uses setTimeout to defer message sending, providing a more natural response timing.
     *
     * @param channelId - The ID of the channel to which the message will be sent.
     * @param messageContent - The content of the message to send.
     * @param processingTime - The time taken by the processing step.
     * @param sendFunction - The function to call for sending the message.
     */
    public scheduleMessage(
        channelId: string,
        messageContent: string,
        processingTime: number,
        sendFunction: (message: string) => void
    ): void {
        const delay = this.calculateDelay(channelId, processingTime);
        debug(`scheduleMessage: Scheduling message in channel ${channelId} with delay of ${delay}ms.`);
        setTimeout(() => {
            sendFunction(messageContent);
            this.logIncomingMessage(channelId); // Log the time after sending the message
        }, delay);
    }
}

export default ResponseTimingManager;
