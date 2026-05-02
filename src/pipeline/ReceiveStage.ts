/**
 * Pipeline Stage 1: ReceiveStage
 *
 * The entry point of the staged message pipeline. This stage:
 *  1. Receives raw messages via the `message:incoming` event.
 *  2. Sanitizes the message text (strips control characters, trims whitespace).
 *  3. Rejects empty messages after sanitization.
 *  4. Resolves bot identity and channel metadata from the message and config.
 *  5. Builds a {@link MessageContext} and emits `message:validated`.
 *
 * No external dependencies beyond `debug`.
 *
 * @module pipeline/ReceiveStage
 */

import Debug from 'debug';
import { container } from 'tsyringe';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import type { IMessage } from '@message/interfaces/IMessage';
import { PanicModeService } from '../server/services/PanicModeService';

const debug = Debug('app:pipeline:receive');

export class ReceiveStage {
  constructor(private bus: MessageBus) {}

  /**
   * Subscribe to `message:incoming` on the bus.
   *
   * Call this once during application bootstrap to wire the stage into the
   * pipeline. Subsequent `message:incoming` events will flow through
   * {@link process} automatically.
   */
  register(): void {
    this.bus.on('message:incoming', async (ctx) => {
      await this.process(ctx.message, ctx.history, ctx.botConfig);
    });
    debug('ReceiveStage registered on message:incoming');
  }

  /**
   * Validate and sanitize an incoming message, then emit `message:validated`.
   *
   * This method can also be called directly (without going through the bus)
   * for testing or imperative use.
   *
   * @param message  - The raw incoming message.
   * @param history  - Recent conversation history for this channel/thread.
   * @param botConfig - Active bot configuration snapshot.
   * @returns The built {@link MessageContext}, or `null` if the message was rejected.
   */
  async process(
    message: IMessage,
    history: IMessage[],
    botConfig: Record<string, unknown>
  ): Promise<MessageContext | null> {
    // 0. Global Kill Switch Check
    try {
      const panicService = container.resolve(PanicModeService);
      if (panicService.isPanicModeEnabled()) {
        debug('GLOBAL KILL SWITCH ACTIVE: Rejecting incoming message');
        return null;
      }
      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (e) {
      // Ignore DI errors during test/setup
    }

    // 1. Extract and sanitize text
    const rawText = message.getText();
    const text = this.sanitize(rawText);

    if (!text) {
      debug('Rejecting message: empty text after sanitization');
      return null;
    }

    // 2. Resolve identity fields
    const botName = (botConfig.BOT_NAME as string) || (botConfig.name as string) || 'hivemind';
    const platform = message.platform || 'unknown';
    const channelId = message.getChannelId();

    // 3. Build context
    const ctx: MessageContext = {
      message,
      history,
      botConfig,
      botName,
      platform,
      channelId,
      metadata: {
        receive: {
          rawTextLength: rawText.length,
          sanitizedTextLength: text.length,
          receivedAt: Date.now(),
        },
      },
    };

    // 4. Persist the sanitized text back onto the message
    message.setText(text);

    // 5. Emit downstream
    await this.bus.emitAsync('message:validated', ctx);
    debug('Message validated: bot=%s platform=%s channel=%s', botName, platform, channelId);

    return ctx;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Strip control characters (except newline `\n` and tab `\t`) and trim
   * leading/trailing whitespace.
   *
   * The regex removes:
   *  - `\x00`-`\x08` (NULL through BS)
   *  - `\x0B`         (vertical tab)
   *  - `\x0C`         (form feed)
   *  - `\x0E`-`\x1F` (shift-out through unit separator)
   *  - `\x7F`         (DEL)
   */
  private sanitize(text: string): string {
    const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return cleaned.trim();
  }
}
