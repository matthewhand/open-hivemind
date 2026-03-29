/**
 * Types for WebSocket message acknowledgment and delivery tracking.
 */

/** Delivery status of an outbound WebSocket message. */
export const DeliveryStatus = {
  SENT: 'SENT',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  FAILED: 'FAILED',
  TIMED_OUT: 'TIMED_OUT',
} as const;

export type DeliveryStatus = typeof DeliveryStatus[keyof typeof DeliveryStatus];

/** Envelope wrapping every outbound message with tracking metadata. */
export interface MessageEnvelope {
  /** Unique message identifier. */
  messageId: string;
  /** Per-channel sequence number for ordering / gap detection. */
  sequenceNumber: number;
  /** The original Socket.IO event name. */
  event: string;
  /** The original payload. */
  payload: unknown;
  /** ISO-8601 timestamp when the message was first sent. */
  sentAt: string;
  /** Current delivery status. */
  status: DeliveryStatus;
  /** Number of times the message has been sent (initial + retries). */
  attempts: number;
}

/** Payload the client sends back to acknowledge receipt. */
export interface AckPayload {
  messageId: string;
}

/** Payload the client sends to request missed messages. */
export interface RequestMissedPayload {
  /** Channel / room identifier. */
  channel: string;
  /** The last sequence number the client successfully received. */
  lastSequence: number;
}

/** Snapshot of delivery statistics exposed by getDeliveryStats(). */
export interface DeliveryStats {
  /** Total messages sent (including retries). */
  totalSent: number;
  /** Total acknowledgments received. */
  totalAcknowledged: number;
  /** Total messages that timed out without acknowledgment. */
  totalTimedOut: number;
  /** Total messages marked as failed. */
  totalFailed: number;
  /** Current number of messages awaiting acknowledgment. */
  pendingCount: number;
  /** Average ack latency in milliseconds (0 when no data). */
  averageAckLatencyMs: number;
  /** Delivery success rate as a fraction 0-1 (0 when no data). */
  deliverySuccessRate: number;
}

/** Configuration for the message acknowledgment system. */
export interface MessageAckConfig {
  /** Milliseconds to wait before marking unacked messages as timed out. Default 10 000. */
  messageTimeoutMs: number;
  /** Maximum number of retry attempts for unacked messages. Default 2. */
  maxRetries: number;
  /** Whether acknowledgment tracking is enabled. Default true. */
  enabled: boolean;
}
