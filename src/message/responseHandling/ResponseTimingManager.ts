import Debug from "debug";
const debug = Debug("app");

class ResponseTimingManager {
    private static instance: ResponseTimingManager;
    private maxDelay: number = 0;
    private minDelay: number = 0;
    private decayRate: number = 0;
    private channelsTimingInfo: Record<string, { lastIncomingMessageTime?: number }> = {};
    private constructor({ maxDelay = 10000, minDelay = 1000, decayRate = -0.5 } = {}) {
        if (ResponseTimingManager.instance) {
            return ResponseTimingManager.instance;
        }
        this.maxDelay = maxDelay;
        this.minDelay = minDelay;
        this.decayRate = decayRate;
        ResponseTimingManager.instance = this;
    }
    static getInstance(): ResponseTimingManager {
        if (!ResponseTimingManager.instance) {
            ResponseTimingManager.instance = new ResponseTimingManager({});
        }
        return ResponseTimingManager.instance;
    }
    /**
     * Logs the arrival of an incoming message for a specific channel.
     * 
     * @param channelId - The ID of the channel where the message was received.
     */
    logIncomingMessage(channelId: string): void {
        const currentTime = Date.now();
        if (!this.channelsTimingInfo[channelId]) {
            this.channelsTimingInfo[channelId] = {};
        }
        this.channelsTimingInfo[channelId].lastIncomingMessageTime = currentTime;
    }
    /**
     * Calculates the delay before sending a message.
     * 
     * @param channelId - The ID of the channel for which to calculate the delay.
     * @param processingTime - The time taken by the processing step.
     * @returns The calculated delay (in milliseconds) before sending the message.
     */
    calculateDelay(channelId: string, processingTime: number): number {
        const currentTime = Date.now();
        const channelInfo = this.channelsTimingInfo[channelId];
        if (!channelInfo || !channelInfo.lastIncomingMessageTime) {
            return Math.max(this.minDelay - processingTime, 0);
        }
        const timeSinceLastIncomingMessage = currentTime - channelInfo.lastIncomingMessageTime;
        let delay = Math.exp(this.decayRate * timeSinceLastIncomingMessage / 1000) * this.maxDelay - processingTime;
        delay = Math.min(Math.max(delay, this.minDelay), this.maxDelay);
        console.debug('calculateDelay: Channel ' + channelId + ' calculated delay: ' + delay);
        return delay;
    }
    /**
     * Schedules a message to be sent after an adaptive delay.
     * 
     * @param channelId - The ID of the channel to which the message will be sent.
     * @param messageContent - The content of the message to send.
     * @param processingTime - The time taken by the processing step.
     * @param sendFunction - The function to call for sending the message.
     */
    scheduleMessage(channelId: string, messageContent: string, processingTime: number, sendFunction: (message: string) => void): void {
        const delay = this.calculateDelay(channelId, processingTime);
        setTimeout(() => {
            sendFunction(messageContent);
        }, delay);
    }
}
export default ResponseTimingManager;
