import { injectable, singleton } from 'tsyringe';
import { 
  DeliveryStatus, 
  type MessageAckConfig, 
  type MessageEnvelope 
} from '../../../types/websocket';

/**
 * Manages message acknowledgment, delivery tracking, and retries
 */
@singleton()
@injectable()
export class MessageDeliveryTracker {
  private pendingMessages = new Map<string, MessageEnvelope>();
  private sequenceNumbers = new Map<string, number>();
  private channelMessageHistory = new Map<string, MessageEnvelope[]>();
  private deliveryCounts = { sent: 0, acknowledged: 0, timedOut: 0, failed: 0 };
  private ackConfig: MessageAckConfig = {
    messageTimeoutMs: 10_000,
    maxRetries: 2,
    enabled: true,
  };

  public getNextSequence(channelId: string): number {
    const seq = (this.sequenceNumbers.get(channelId) || 0) + 1;
    this.sequenceNumbers.set(channelId, seq);
    return seq;
  }

  public trackMessage(envelope: MessageEnvelope): void {
    this.pendingMessages.set(envelope.id, envelope);
    this.deliveryCounts.sent++;

    // Add to history
    const history = this.channelMessageHistory.get(envelope.channelId) || [];
    history.push(envelope);
    if (history.length > 50) history.shift();
    this.channelMessageHistory.set(envelope.channelId, history);
  }

  public handleAck(messageId: string): MessageEnvelope | undefined {
    const envelope = this.pendingMessages.get(messageId);
    if (envelope) {
      envelope.status = DeliveryStatus.DELIVERED;
      envelope.ackTimestamp = Date.now();
      this.pendingMessages.delete(messageId);
      this.deliveryCounts.acknowledged++;
    }
    return envelope;
  }

  public handleTimeout(messageId: string): MessageEnvelope | undefined {
    const envelope = this.pendingMessages.get(messageId);
    if (envelope) {
      this.deliveryCounts.timedOut++;
      // Retries would happen in the service layer using this information
    }
    return envelope;
  }

  public getDeliveryStats(): any {
    return {
      ...this.deliveryCounts,
      pending: this.pendingMessages.size,
      successRate: this.deliveryCounts.sent > 0 
        ? Math.round((this.deliveryCounts.acknowledged / this.deliveryCounts.sent) * 100) 
        : 100,
    };
  }

  public getHistory(channelId: string): MessageEnvelope[] {
    return this.channelMessageHistory.get(channelId) || [];
  }
}
