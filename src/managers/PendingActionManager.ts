import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import Debug from 'debug';
import { MessageBus } from '@src/events/MessageBus';

const debug = Debug('app:PendingActionManager');

export interface PendingAction {
  id: string;
  botName: string;
  toolName: string;
  args: Record<string, unknown>;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  context?: any;
}

interface PendingPromise {
  resolve: (approved: boolean) => void;
  timer: NodeJS.Timeout;
}

/**
 * Manages tool execution requests that require human-in-the-loop approval.
 */
export class PendingActionManager extends EventEmitter {
  private static instance: PendingActionManager;
  private pendingActions = new Map<string, PendingAction>();
  private promises = new Map<string, PendingPromise>();
  private readonly DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    super();
  }

  public static getInstance(): PendingActionManager {
    if (!PendingActionManager.instance) {
      PendingActionManager.instance = new PendingActionManager();
    }
    return PendingActionManager.instance;
  }

  /**
   * Request approval for a sensitive tool execution.
   * Returns a promise that resolves when an admin approves or denies the action.
   */
  public async requestApproval(
    botName: string,
    toolName: string,
    args: Record<string, unknown>,
    context?: any
  ): Promise<boolean> {
    const id = randomUUID();
    const action: PendingAction = {
      id,
      botName,
      toolName,
      args,
      timestamp: new Date().toISOString(),
      status: 'pending',
      context,
    };

    this.pendingActions.set(id, action);
    debug(`Requesting approval for action ${id}: ${botName}.${toolName}`);

    // Notify dashboard via MessageBus
    MessageBus.getInstance().emit('tool:approval_requested', action);

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.resolveAction(id, false, 'expired');
      }, this.DEFAULT_TIMEOUT);

      this.promises.set(id, { resolve, timer });
    });
  }

  /**
   * Resolve a pending action (approve or deny).
   */
  public resolveAction(id: string, approved: boolean, finalStatus?: 'approved' | 'denied' | 'expired'): void {
    const action = this.pendingActions.get(id);
    const pendingPromise = this.promises.get(id);

    if (!action || !pendingPromise) {
      debug(`Attempted to resolve non-existent action: ${id}`);
      return;
    }

    clearTimeout(pendingPromise.timer);
    
    const status = finalStatus || (approved ? 'approved' : 'denied');
    action.status = status;
    
    debug(`Action ${id} resolved as: ${status}`);

    // Resolve the original requester
    pendingPromise.resolve(approved);

    // Notify dashboard via MessageBus
    MessageBus.getInstance().emit('tool:approval_resolved', { id, status, approved });

    // Cleanup after a short delay to allow UI to show final state
    setTimeout(() => {
      this.pendingActions.delete(id);
      this.promises.delete(id);
    }, 10000);
  }

  /**
   * Get all currently pending actions.
   */
  public getPendingActions(): PendingAction[] {
    return Array.from(this.pendingActions.values()).filter(a => a.status === 'pending');
  }

  /**
   * Get a specific action by ID.
   */
  public getAction(id: string): PendingAction | undefined {
    return this.pendingActions.get(id);
  }
}
