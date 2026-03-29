/**
 * TimingManager handles message timing delays.
 */
class TimingManager {
  config: { minDelay: number; maxDelay: number; decayRate: number };
  channelsTimingInfo: Record<string, { lastIncomingMessageTime: number }>;
  channelTimers: Record<string, NodeJS.Timeout>;

  constructor(
    config: { minDelay: number; maxDelay: number; decayRate: number } = {
      minDelay: 1000,
      maxDelay: 10000,
      decayRate: -0.5,
    }
  ) {
    if (config.minDelay > config.maxDelay) {
      throw new Error('minDelay cannot be greater than maxDelay');
    }
    this.config = config;
    this.channelsTimingInfo = {};
    this.channelTimers = {};
  }

  get minDelay(): number {
    return this.config.minDelay;
  }

  get maxDelay(): number {
    return this.config.maxDelay;
  }

  get decayRate(): number {
    return this.config.decayRate;
  }

  logIncomingMessage(channelId: string): void {
    this.channelsTimingInfo[channelId] = { lastIncomingMessageTime: Date.now() };
  }

  calculateDelay(channelId: string, processingTime: number): number {
    const channelInfo = this.channelsTimingInfo[channelId];
    if (!channelInfo || !channelInfo.lastIncomingMessageTime) {
      return this.config.maxDelay;
    }

    const timeSinceLastMessage = Date.now() - channelInfo.lastIncomingMessageTime;
    const baseDelay = this.config.minDelay + processingTime;

    // Adaptive delay based on time since last message
    let adaptiveDelay = baseDelay;
    if (timeSinceLastMessage < 1000) {
      // Very recent activity
      adaptiveDelay = this.config.minDelay;
    } else if (timeSinceLastMessage > 30000) {
      // Old activity
      adaptiveDelay = this.config.maxDelay;
    }

    // Ensure delay is within bounds
    if (adaptiveDelay < this.config.minDelay) {
      adaptiveDelay = this.config.minDelay;
    }
    if (adaptiveDelay > this.config.maxDelay) {
      adaptiveDelay = this.config.maxDelay;
    }

    return adaptiveDelay;
  }

  scheduleMessage(
    channelId: string,
    messageContent: string,
    processingTime: number,
    sendFunction: (text: string) => void
  ): void {
    // Clear any existing timer for this channel
    if (this.channelTimers[channelId]) {
      clearTimeout(this.channelTimers[channelId]);
    }

    const delay = this.calculateDelay(channelId, processingTime);
    this.channelTimers[channelId] = setTimeout(() => {
      try {
        sendFunction(messageContent);
      } catch (error) {
        // Log error but don't throw to prevent crashing
        console.error('Error in send function:', error);
      }
      // Clean up the timer reference
      delete this.channelTimers[channelId];
    }, delay);
  }
}

module.exports = TimingManager;
