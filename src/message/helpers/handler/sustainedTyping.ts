import Debug from 'debug';
import type { NewsChannel, TextChannel } from 'discord.js';

const debug = Debug('app:sustainedTyping');

/**
 * Sustained Typing Indicator
 *
 * For longer messages, this utility sends typing indicators periodically
 * to maintain the "typing..." indicator visible while the bot "reads" and
 * prepares its response. Discord's typing indicator lasts ~10 seconds, so
 * we resend every 8 seconds for sustained effect.
 *
 * Usage:
 *   const typing = new SustainedTypingIndicator(channel);
 *   await typing.start(15000); // 15 second delay with sustained typing
 *   await channel.send(message);
 *   typing.stop();
 */
export class SustainedTypingIndicator {
  private channel: TextChannel | NewsChannel;
  private interval: NodeJS.Timeout | null = null;
  private static readonly TYPING_REFRESH_MS = 8000; // Resend every 8 seconds

  constructor(channel: TextChannel | NewsChannel) {
    this.channel = channel;
  }

  /**
   * Start sustained typing for a specified duration
   * @param durationMs - How long to show typing indicator (e.g., 15000 for 15 seconds)
   * @returns Promise that resolves after the duration
   */
  async start(durationMs: number): Promise<void> {
    debug(`Starting sustained typing for ${durationMs}ms in channel ${this.channel.id}`);

    // Send initial typing indicator
    try {
      await this.channel.sendTyping();
    } catch (err) {
      debug(`Failed to send initial typing: ${err}`);
    }

    // For durations longer than 8 seconds, set up interval to refresh typing
    if (durationMs > SustainedTypingIndicator.TYPING_REFRESH_MS) {
      this.interval = setInterval(async () => {
        try {
          await this.channel.sendTyping();
          debug(`Refreshed typing indicator in ${this.channel.id}`);
        } catch (err) {
          debug(`Failed to refresh typing: ${err}`);
        }
      }, SustainedTypingIndicator.TYPING_REFRESH_MS);
    }

    // Wait for the specified duration
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    // Clean up
    this.stop();
  }

  /**
   * Stop the sustained typing indicator
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      debug(`Stopped sustained typing in ${this.channel.id}`);
    }
  }
}

/**
 * Calculate delay based on message length
 * Longer messages = longer "reading and thinking" delay
 *
 * @param messageLength - Length of the incoming message
 * @param responseLength - Length of the response (if known)
 * @returns Delay in milliseconds
 */
export function calculateTypingDelay(messageLength: number, responseLength = 0): number {
  // Base delay: 3 seconds
  const baseDelay = 3000;

  // Additional delay based on incoming message length (simulating reading)
  // ~1 second per 100 characters
  const readingDelay = Math.floor(messageLength / 100) * 1000;

  // Additional delay based on response length (simulating writing)
  // ~0.5 seconds per 100 characters
  const writingDelay = Math.floor(responseLength / 100) * 500;

  // Total delay with caps
  const totalDelay = baseDelay + readingDelay + writingDelay;

  // Min 3 seconds, max 20 seconds
  return Math.min(20000, Math.max(3000, totalDelay));
}
