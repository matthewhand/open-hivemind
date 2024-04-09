/**
 * Manages timing for sending messages, incorporating an adaptive delay mechanism to simulate
 * human-like response times based on conversation activity and processing delays.
 */
class TimingManager {
    /**
     * Initializes a new instance of the TimingManager.
     * @param {Object} options Configuration options for the TimingManager.
     * @param {number} options.maxDelay The maximum delay (in milliseconds) before sending a message.
     * @param {number} options.minDelay The minimum delay (in milliseconds) before sending a message.
     * @param {number} options.decayRate The rate at which the delay decreases over time.
     */
    constructor({ maxDelay = 10000, minDelay = 1000, decayRate = -0.5 } = {}) {

        if (TimingManager.instance) {
            return TimingManager.instance;
        }

        this.maxDelay = maxDelay;
        this.minDelay = minDelay;
        this.decayRate = decayRate;
        this.channelsTimingInfo = {}; // Object to store timing information for each channel.

        TimingManager.instance = this;
    }
    
    /**
     * Returns the singleton instance of TimingManager.
     * @returns {TimingManager} The singleton instance.
     */
    static getInstance() {
        if (!TimingManager.instance) {
            TimingManager.instance = new TimingManager({});
        }
        return TimingManager.instance;
    }


    /**
     * Logs the arrival of an incoming message for a specific channel. This information is
     * used to calculate the adaptive delay for outgoing messages.
     * @param {string} channelId The ID of the channel where the message was received.
     */
    logIncomingMessage(channelId) {
        const currentTime = Date.now();
        if (!this.channelsTimingInfo[channelId]) {
            this.channelsTimingInfo[channelId] = {};
        }
        this.channelsTimingInfo[channelId].lastIncomingMessageTime = currentTime;
    }

    /**
     * Calculates the delay before sending a message, based on the recent activity in the
     * channel and the time taken by processing the response.
     * @param {string} channelId The ID of the channel for which to calculate the delay.
     * @param {number} processingTime The time taken by the processing step (e.g., generating a response).
     * @returns {number} The calculated delay (in milliseconds) before sending the message.
     */
    calculateDelay(channelId, processingTime) {
        const currentTime = Date.now();
        const channelInfo = this.channelsTimingInfo[channelId];
        
        if (!channelInfo || !channelInfo.lastIncomingMessageTime) {
            // Apply the minimum delay if no recent activity is logged.
            return Math.max(this.minDelay - processingTime, 0);
        }

        const timeSinceLastIncomingMessage = currentTime - channelInfo.lastIncomingMessageTime;
        let delay = Math.exp(this.decayRate * timeSinceLastIncomingMessage / 1000) * this.maxDelay - processingTime;
        
        // Ensure the calculated delay falls within the specified min and max limits.
        delay = Math.min(Math.max(delay, this.minDelay), this.maxDelay);
        
        return delay;
    }

    /**
     * Schedules a message to be sent after an adaptive delay, taking into account recent
     * channel activity and processing time.
     * @param {string} channelId The ID of the channel to which the message will be sent.
     * @param {string} messageContent The content of the message to send.
     * @param {number} processingTime The time taken by the processing step.
     * @param {Function} sendFunction The function to call for sending the message.
     */
    scheduleMessage(channelId, messageContent, processingTime, sendFunction) {
        const delay = this.calculateDelay(channelId, processingTime);

        setTimeout(() => {
            sendFunction(messageContent);
            // Additional actions upon sending the message can be implemented here.
        }, delay);
    }
}

module.exports = TimingManager;
