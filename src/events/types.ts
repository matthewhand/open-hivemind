/**
 * Event type definitions for the MessageBus.
 *
 * These types define the strongly-typed contract for all events flowing
 * through the message processing pipeline. Each event carries a specific
 * payload shape, enabling compile-time safety for publishers and subscribers.
 *
 * @module events/types
 */

import type { IMessage } from '@message/interfaces/IMessage';

/**
 * The outcome of a reply-decision evaluation.
 *
 * Produced by reply-decision logic and attached to `message:accepted` or
 * `message:skipped` events so downstream listeners know *why* the bot chose
 * to reply (or not).
 */
export interface ReplyDecision {
  /** Whether the bot should reply to the incoming message. */
  shouldReply: boolean;
  /** Human-readable explanation for the decision (useful for logging/debugging). */
  reason: string;
  /** Arbitrary decision metadata (e.g. confidence scores, matched rules). */
  meta?: Record<string, any>;
}

/**
 * The canonical context object that accompanies every message-lifecycle event.
 *
 * This is the "envelope" — it carries the message itself plus all the
 * ambient state that listeners might need to react.
 */
export interface MessageContext {
  /** The message being processed. */
  message: IMessage;
  /** Recent conversation history for this channel/thread. */
  history: IMessage[];
  /** Active bot configuration snapshot. */
  botConfig: Record<string, unknown>;
  /** Display name of the bot identity handling this message. */
  botName: string;
  /** Originating platform identifier (e.g. "discord", "slack"). */
  platform: string;
  /** Channel where the message was received. */
  channelId: string;
  /** Open-ended metadata bag for cross-cutting concerns. */
  metadata: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

/**
 * Strongly-typed mapping from event name to its payload type.
 *
 * Every key is a dot-namespaced event string; every value is the exact
 * object shape that `emit` / `emitAsync` will deliver to listeners.
 *
 * Adding a new event here automatically propagates type safety to
 * `MessageBus.on()`, `MessageBus.emit()`, and `MessageBus.emitAsync()`.
 */
export type MessageEvents = {
  /** A raw message has arrived from a platform adapter. */
  'message:incoming': MessageContext;

  /** The message passed validation checks (e.g. not from self, not empty). */
  'message:validated': MessageContext;

  /** The bot decided to reply to this message. */
  'message:accepted': MessageContext & { decision: ReplyDecision };

  /** The bot decided NOT to reply. */
  'message:skipped': MessageContext & { reason: string };

  /** Context has been enriched with memories and a system prompt. */
  'message:enriched': MessageContext & { memories: string[]; systemPrompt: string };

  /** An LLM response has been generated (not yet sent). */
  'message:response': MessageContext & { responseText: string };

  /** The response was delivered back to the platform. */
  'message:sent': MessageContext & { responseText: string; parts: string[] };

  /** An error occurred at some stage of processing. */
  'message:error': MessageContext & { error: Error; stage: string };
};
