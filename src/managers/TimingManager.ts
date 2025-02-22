/**
 * TimingManager handles message timing delays.
 */
class TimingManager {
  config: { minDelay: number; maxDelay: number; decayRate: number; };
  channelsTimingInfo: { [channelId: string]: { lastIncomingMessageTime: number } };

  constructor(config: { minDelay: number; maxDelay: number; decayRate: number; }) {
    this.config = config;
    this.channelsTimingInfo = {};
  }
  
  get minDelay(): number {
    return this.config.minDelay;
  }
  
  get maxDelay(): number {
    return this.config.maxDelay;
  }

  logIncomingMessage(channelId: string): void {
    this.channelsTimingInfo[channelId] = { lastIncomingMessageTime: Date.now() };
  }

  calculateDelay(channelId: string, processingTime: number): number {
    // Simple adaptive delay: minDelay + processingTime,
    // ensuring it's between minDelay and maxDelay.
    let delay = this.config.minDelay + processingTime;
    if (delay < this.config.minDelay) {
      delay = this.config.minDelay;
    }
    if (delay > this.config.maxDelay) {
      delay = this.config.maxDelay;
    }
    return delay;
  }

  scheduleMessage(channelId: string, messageContent: string, processingTime: number, sendFunction: (text: string) => void): void {
    const delay = this.calculateDelay(channelId, processingTime);
    setTimeout(() => {
      sendFunction(messageContent);
    }, delay);
  }
}

module.exports = TimingManager;