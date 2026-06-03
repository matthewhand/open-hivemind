import {
  DeliveryStatus,
  type AckPayload,
  type DeliveryStats,
  type MessageAckConfig,
  type MessageEnvelope,
  type RequestMissedPayload,
} from '../../../../types/websocket';

/**
 * Handles reliable message delivery, sequence tracking, and acknowledgments.
 */
export class MessageTracker {
  private pendingMessages = new Map<string, MessageEnvelope>();
  private sequenceNumbers = new Map<string, number>();
  private channelMessageHistory = new Map<string, MessageEnvelope[]>();
  private ackLatencies: number[] = [];
  private deliveryCounts = { sent: 0, acknowledged: 0, timedOut: 0, failed: 0 };
  private ackTimeoutTimers = new Map<string, NodeJS.Timeout>();
  private ackConfig: MessageAckConfig = {
    messageTimeoutMs: 10_000,
    maxRetries: 2,
    enabled: true,
  };

  public configureAck(config: Partial<MessageAckConfig>): void {
    this.ackConfig = { ...this.ackConfig, ...config };
  }

  public trackMessage(envelope: MessageEnvelope): void {
    if (!this.ackConfig.enabled) return;

    this.pendingMessages.set((envelope as any).id, envelope);
    this.deliveryCounts.sent++;

    // Track in channel history
    const history = this.channelMessageHistory.get((envelope as any).channel) || [];
    history.push(envelope);
    if (history.length > 100) history.shift();
    this.channelMessageHistory.set((envelope as any).channel, history);

    // Setup timeout
    const timer = setTimeout(() => {
      this.handleTimeout((envelope as any).id);
    }, this.ackConfig.messageTimeoutMs);
    this.ackTimeoutTimers.set((envelope as any).id, timer);
  }

  public getNextSequence(channel: string): number {
    const current = this.sequenceNumbers.get(channel) || 0;
    const next = current + 1;
    this.sequenceNumbers.set(channel, next);
    return next;
  }

  public handleAck(ack: AckPayload): boolean {
    const timer = this.ackTimeoutTimers.get(ack.messageId);
    if (timer) {
      clearTimeout(timer);
      this.ackTimeoutTimers.delete(ack.messageId);
    }

    const envelope = this.pendingMessages.get(ack.messageId);
    if (envelope) {
      (envelope as any).deliveryStatus = DeliveryStatus.ACKNOWLEDGED;
      (envelope as any).acknowledgedAt = (ack as any).timestamp;

      const latency =
        new Date((ack as any).timestamp).getTime() -
        new Date((envelope as any).timestamp).getTime();
      this.ackLatencies.push(latency);
      if (this.ackLatencies.length > 100) this.ackLatencies.shift();

      this.deliveryCounts.acknowledged++;
      this.pendingMessages.delete(ack.messageId);
      return true;
    }
    return false;
  }

  private handleTimeout(messageId: string): void {
    const envelope = this.pendingMessages.get(messageId);
    if (envelope) {
      (envelope as any).deliveryStatus = DeliveryStatus.TIMED_OUT;
      (envelope as any).retryCount++;
      this.deliveryCounts.timedOut++;
      this.pendingMessages.delete(messageId);
      this.ackTimeoutTimers.delete(messageId);
    }
  }

  public handleRequestMissed(request: RequestMissedPayload): MessageEnvelope[] {
    const history = this.channelMessageHistory.get(request.channel) ?? [];
    return history.filter((msg) => (msg as any).sequence > request.lastSequence);
  }

  public getStats(): DeliveryStats {
    const avgLatency =
      this.ackLatencies.length > 0
        ? Math.round(this.ackLatencies.reduce((a, b) => a + b, 0) / this.ackLatencies.length)
        : 0;

    const totalCompleted =
      this.deliveryCounts.acknowledged + this.deliveryCounts.timedOut + this.deliveryCounts.failed;
    const successRate = totalCompleted > 0 ? this.deliveryCounts.acknowledged / totalCompleted : 0;

    return {
      totalSent: this.deliveryCounts.sent,
      totalAcknowledged: this.deliveryCounts.acknowledged,
      totalTimedOut: this.deliveryCounts.timedOut,
      totalFailed: this.deliveryCounts.failed,
      pendingCount: this.pendingMessages.size,
      averageAckLatencyMs: avgLatency,
      successRate,
    } as any;
  }

  public getHistory(channel: string): MessageEnvelope[] {
    return this.channelMessageHistory.get(channel) || [];
  }

  public clear(): void {
    for (const timer of this.ackTimeoutTimers.values()) {
      clearTimeout(timer);
    }
    this.ackTimeoutTimers.clear();
    this.pendingMessages.clear();
    this.sequenceNumbers.clear();
    this.channelMessageHistory.clear();
    this.ackLatencies = [];
    this.deliveryCounts = { sent: 0, acknowledged: 0, timedOut: 0, failed: 0 };
  }
}
