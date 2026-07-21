export interface MessageLike {
  getChannelId(): string;
  getMessageId(): string;
  getText?(): string;
  getAuthorId?(): string;
  isFromBot?(): boolean;
  isDirectMessage?(): boolean;
  getUserMentions?(): string[];
  mentionsUsers?(id: string): boolean;
  isMentioning?(id: string): boolean;
  isReplyToBot?(): boolean;
  metadata?: { replyTo?: { userId?: string } };
}

export interface HistoryMessageLike {
  getAuthorId?(): string;
  getText?(): string;
  isFromBot?(): boolean;
  authorId?: string;
  timestamp?: number | Date;
  createdAt?: number | Date;
}

export interface ReplyDecision {
  shouldReply: boolean;
  reason: string;
  meta?: Record<string, unknown>;
}

/**
 * Options controlling side effects of {@link shouldReplyToMessage}.
 */
export interface ShouldReplyOptions {
  /**
   * When `true`, the `pipeline:decision` WebSocket event is NOT emitted from
   * this function. Set by the pipeline's {@link DecisionStrategyAdapter} so that
   * {@link DecisionStage} can own the broadcast (with full swarm/claim context)
   * and avoid emitting the event twice per message. The legacy non-pipeline
   * handler leaves this unset so the event is still emitted from here.
   */
  suppressBroadcast?: boolean;
}
