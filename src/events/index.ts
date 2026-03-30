/**
 * Public API surface for the event infrastructure.
 *
 * @example
 * ```ts
 * import { MessageBus } from '@src/events';
 * import type { MessageContext, ReplyDecision, MessageEvents } from '@src/events';
 * ```
 *
 * @module events
 */

export { MessageBus } from './MessageBus';
export type { MessageContext, MessageEvents, ReplyDecision } from './types';
