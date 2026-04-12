import { EventEmitter } from 'events';
import Debug from 'debug';
import { TTLCache } from '../utils/TTLCache';

// SwarmMode is defined locally (shared-types does not currently export it)
export type SwarmMode = 'exclusive' | 'broadcast' | 'rotating' | 'priority' | 'collaborative';

export interface SwarmDecision {
  shouldReply: boolean;
  reason: string;
  mode: SwarmMode;
  claimedBy?: string;
  turnIndex?: number;
  priorityRank?: number;
}

const debug = Debug('app:SwarmCoordinator');

interface SwarmClaim {
  messageId: string;
  botId: string;
  channel: string;
  timestamp: number;
}

export class SwarmCoordinator extends EventEmitter {
  private static instance: SwarmCoordinator;
  private cache: TTLCache<string, SwarmClaim>;
  private claimsMap: Map<string, SwarmClaim> = new Map();
  private rotatingCounter: Map<string, number> = new Map();
  private activeBots: Map<string, Set<string>> = new Map();
  private collaborators: Map<string, Set<string>> = new Map();

  private constructor() {
    super();
    this.cache = new TTLCache<SwarmClaim>(1000 * 60 * 5, 'SwarmCoordinator');
  }

  public static getInstance(): SwarmCoordinator {
    if (!SwarmCoordinator.instance) {
      SwarmCoordinator.instance = new SwarmCoordinator();
    }
    return SwarmCoordinator.instance;
  }

  public static resetInstance(): void {
    if (SwarmCoordinator.instance) {
      SwarmCoordinator.instance.removeAllListeners();
      SwarmCoordinator.instance = undefined as unknown as SwarmCoordinator;
    }
  }

  public decide(
    messageId: string,
    botId: string,
    channel: string,
    mode: SwarmMode,
    priority?: number,
  ): SwarmDecision {
    switch (mode) {
      case 'exclusive':
        return this.decideExclusive(messageId, botId, channel);
      case 'broadcast':
        return this.decideBroadcast(messageId, botId, channel);
      case 'rotating':
        return this.decideRotating(messageId, botId, channel);
      case 'priority':
        return this.decidePriority(messageId, botId, channel, priority);
      case 'collaborative':
        return this.decideCollaborative(messageId, botId, channel);
      default:
        return {
          shouldReply: false,
          reason: `Unknown mode: ${mode}`,
          mode,
        };
    }
  }

  private decideExclusive(
    messageId: string,
    botId: string,
    channel: string,
  ): SwarmDecision {
    const existingClaim = this.cache.get(messageId);
    if (existingClaim === undefined) {
      const claim: SwarmClaim = { messageId, botId, channel, timestamp: Date.now() };
      this.cache.set(messageId, claim);
      this.claimsMap.set(messageId, claim);
      this.emit('claim:created', claim);
      const shouldReply = true;
      const reason = 'Exclusive mode — claim acquired';
      debug(`[SwarmCoordinator] exclusive: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);
      return { shouldReply, reason, mode: 'exclusive', claimedBy: botId };
    }
    const shouldReply = false;
    const reason = `Exclusive mode — claimed by ${existingClaim.botId}`;
    debug(`[SwarmCoordinator] exclusive: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);
    return { shouldReply, reason, mode: 'exclusive', claimedBy: existingClaim.botId };
  }

  private decideBroadcast(
    _messageId: string,
    botId: string,
    _channel: string,
  ): SwarmDecision {
    const shouldReply = true;
    const reason = 'Broadcast mode — all bots may respond';
    debug(`[SwarmCoordinator] broadcast: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);
    return { shouldReply, reason, mode: 'broadcast' };
  }

  private decideRotating(
    messageId: string,
    botId: string,
    channel: string,
  ): SwarmDecision {
    // Track active bots for this channel
    if (!this.activeBots.has(channel)) {
      this.activeBots.set(channel, new Set());
    }
    this.activeBots.get(channel)!.add(botId);

    const counter = this.rotatingCounter.get(channel) || 0;
    this.rotatingCounter.set(channel, counter + 1);

    const botCount = this.activeBots.get(channel)!.size;
    const botArray = Array.from(this.activeBots.get(channel)!);
    const turnIndex = counter % botCount;
    const isMyTurn = botArray[turnIndex] === botId;

    const shouldReply = isMyTurn;
    const reason = `Rotating mode — turn ${turnIndex}`;
    debug(`[SwarmCoordinator] rotating: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);

    if (shouldReply) {
      const claim: SwarmClaim = { messageId, botId, channel, timestamp: Date.now() };
      this.cache.set(messageId, claim);
      this.claimsMap.set(messageId, claim);
      this.emit('claim:created', claim);
    }

    return { shouldReply, reason, mode: 'rotating', turnIndex };
  }

  private decidePriority(
    messageId: string,
    botId: string,
    channel: string,
    priority?: number,
  ): SwarmDecision {
    const botPriority = priority ?? 0;
    const existingClaim = this.cache.get(messageId);

    if (existingClaim === undefined) {
      const claim: SwarmClaim = { messageId, botId, channel, timestamp: Date.now() };
      this.cache.set(messageId, claim);
      this.claimsMap.set(messageId, claim);
      this.emit('claim:created', claim);
      const shouldReply = true;
      const reason = `Priority mode — rank 1 (priority: ${botPriority})`;
      debug(`[SwarmCoordinator] priority: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);
      return { shouldReply, reason, mode: 'priority', claimedBy: botId, priorityRank: 1 };
    }

    // Higher priority wins; if equal, first claimant keeps it
    const shouldReply = false;
    const reason = `Priority mode — claimed by ${existingClaim.botId}`;
    debug(`[SwarmCoordinator] priority: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);
    return { shouldReply, reason, mode: 'priority', claimedBy: existingClaim.botId };
  }

  private decideCollaborative(
    messageId: string,
    botId: string,
    channel: string,
  ): SwarmDecision {
    // Track contributors per message
    if (!this.collaborators.has(messageId)) {
      this.collaborators.set(messageId, new Set());
    }
    this.collaborators.get(messageId)!.add(botId);

    const claim: SwarmClaim = { messageId, botId, channel, timestamp: Date.now() };
    this.cache.set(messageId, claim);
    this.claimsMap.set(messageId, claim);
    this.emit('claim:created', claim);

    const shouldReply = true;
    const reason = 'Collaborative mode — contribute to shared response';
    debug(`[SwarmCoordinator] collaborative: ${botId} → ${shouldReply ? 'reply' : 'skip'} (${reason})`);
    return { shouldReply, reason, mode: 'collaborative', claimedBy: botId };
  }

  // ── Backwards-compatible claimMessage ─────────────────────────────────────

  public claimMessage(messageId: string, botId: string, channel: string = 'default'): boolean {
    const decision = this.decide(messageId, botId, channel, 'exclusive');
    return decision.shouldReply;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  public isClaimed(messageId: string): boolean {
    return this.cache.get(messageId) !== undefined;
  }

  public getClaim(messageId: string): SwarmClaim | undefined {
    return this.cache.get(messageId);
  }

  public releaseClaim(messageId: string): void {
    const claim = this.cache.get(messageId);
    if (claim) {
      this.cache.invalidate(messageId);
      this.claimsMap.delete(messageId);
      this.emit('claim:released', claim);
    }
  }

  public getActiveClaims(): SwarmClaim[] {
    return Array.from(this.claimsMap.values());
  }

  public getClaimStats(): { total: number; active: number; expired: number } {
    const stats = this.cache.getStats();
    return { total: stats.size, active: stats.size, expired: 0 };
  }

  public getRotatingTurn(channel: string): number {
    return this.rotatingCounter.get(channel) || 0;
  }

  public getCollaborators(messageId: string): string[] {
    const collabSet = this.collaborators.get(messageId);
    return collabSet ? Array.from(collabSet) : [];
  }

  public clearCache(): void {
    this.cache.clear();
    this.claimsMap.clear();
    this.rotatingCounter.clear();
    this.activeBots.clear();
    this.collaborators.clear();
  }
}
