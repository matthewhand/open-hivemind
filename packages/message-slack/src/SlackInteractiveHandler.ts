import Debug from 'debug';
import type { Request, Response } from 'express';

const debug = Debug('app:SlackInteractiveHandler');

/**
 * Context describing a single interactive action extracted from a Slack
 * `block_actions` or `view_submission` payload.
 */
export interface SlackActionContext {
  /** `action_id` for block actions, `callback_id` for view submissions. */
  actionId: string;
  /** The Slack payload type the action originated from. */
  type: 'block_actions' | 'view_submission';
  /** Channel the interaction happened in, when Slack includes it. */
  channelId?: string;
  /** Slack user ID of the person who triggered the action. */
  userId?: string;
  /** Slack username of the person who triggered the action. */
  userName?: string;
  /**
   * Button/option value for block actions; newline-joined input values for
   * view submissions.
   */
  value?: string;
  /** Visible label of the element that triggered the action, when available. */
  text?: string;
  /** Trigger ID usable for opening modals (block actions only). */
  triggerId?: string;
  /** The full parsed Slack interactive payload. */
  payload: any;
}

/** Handler invoked when an action matches a registered pattern. */
export type SlackActionHandler = (context: SlackActionContext) => Promise<void> | void;

/** Exact `action_id` string or a RegExp tested against the `action_id`. */
export type SlackActionPattern = string | RegExp;

/**
 * Generic dispatcher for Slack interactive payloads.
 *
 * Incoming `block_actions` and `view_submission` payloads are acknowledged
 * immediately, then routed by `action_id` (or `callback_id` for view
 * submissions) through a registry of pattern → handler entries. Exact string
 * matches win over RegExp patterns; RegExp patterns are tested in
 * registration order.
 *
 * When no registered pattern matches, the `defaultHandler` provided at
 * construction time is invoked. The intended default behavior (wired up in
 * `SlackService`) is to forward the action as a message through the normal
 * message-handler path so bots/LLMs can respond to it.
 */
export class SlackInteractiveHandler {
  private registry: Map<SlackActionPattern, SlackActionHandler> = new Map();
  private defaultHandler: SlackActionHandler;

  constructor(defaultHandler?: SlackActionHandler) {
    this.defaultHandler =
      defaultHandler ??
      ((context) => {
        debug(`No default handler configured; action "${context.actionId}" acknowledged only`);
      });
  }

  /** Register a handler for an exact `action_id` or a RegExp pattern. */
  public registerAction(pattern: SlackActionPattern, handler: SlackActionHandler): void {
    this.registry.set(pattern, handler);
  }

  /** Remove a previously registered pattern. Returns true when removed. */
  public unregisterAction(pattern: SlackActionPattern): boolean {
    return this.registry.delete(pattern);
  }

  /** Replace the default (fallback) handler. */
  public setDefaultHandler(handler: SlackActionHandler): void {
    this.defaultHandler = handler;
  }

  /**
   * Resolve the handler for an action_id: exact string match first, then
   * RegExp patterns in registration order. Returns undefined when nothing
   * matches.
   */
  public resolveHandler(actionId: string): SlackActionHandler | undefined {
    const exact = this.registry.get(actionId);
    if (exact) {
      return exact;
    }
    for (const [pattern, handler] of this.registry) {
      if (pattern instanceof RegExp && pattern.test(actionId)) {
        return handler;
      }
    }
    return undefined;
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const payload = JSON.parse(req.body.payload);
      debug(`Parsed interactive payload of type: ${payload?.type}`);
      if (payload?.type === 'block_actions') {
        await this.handleBlockAction(payload, res);
      } else if (payload?.type === 'view_submission') {
        await this.handleViewSubmission(payload, res);
      } else {
        // Unknown payload types are acknowledged so Slack does not retry.
        res.status(200).send();
      }
    } catch (error) {
      debug(`Error handling interactive request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  /**
   * Acknowledge a `block_actions` payload immediately, then dispatch every
   * contained action through the registry (falling back to the default
   * handler).
   */
  public async handleBlockAction(payload: any, res: Response): Promise<void> {
    // Always acknowledge first — Slack requires a response within 3 seconds.
    res.status(200).send();

    const actions = Array.isArray(payload?.actions) ? payload.actions : [];
    if (actions.length === 0) {
      debug('block_actions payload contained no actions; acknowledged only');
      return;
    }

    for (const action of actions) {
      const context = this.buildBlockActionContext(payload, action);
      await this.dispatch(context);
    }
  }

  /**
   * Acknowledge a `view_submission` payload (clearing the modal stack), then
   * dispatch it through the registry keyed by the view `callback_id`.
   */
  public async handleViewSubmission(payload: any, res: Response): Promise<void> {
    res.status(200).json({ response_action: 'clear' });
    const context = this.buildViewSubmissionContext(payload);
    await this.dispatch(context);
  }

  private async dispatch(context: SlackActionContext): Promise<void> {
    if (!context.actionId && !context.value) {
      debug('Skipping dispatch: action has neither an action_id nor a value');
      return;
    }
    const handler = this.resolveHandler(context.actionId);
    try {
      if (handler) {
        debug(`Dispatching action "${context.actionId}" to registered handler`);
        await handler(context);
      } else {
        debug(`No registered handler for "${context.actionId}"; using default handler`);
        await this.defaultHandler(context);
      }
    } catch (error) {
      // The HTTP response is already acknowledged; just log handler failures.
      debug(`Handler for action "${context.actionId}" failed: ${error}`);
    }
  }

  private buildBlockActionContext(payload: any, action: any): SlackActionContext {
    return {
      actionId: typeof action?.action_id === 'string' ? action.action_id : '',
      type: 'block_actions',
      channelId: payload?.channel?.id || payload?.container?.channel_id || undefined,
      userId: payload?.user?.id || undefined,
      userName: payload?.user?.username || payload?.user?.name || undefined,
      value: this.extractActionValue(action),
      text: typeof action?.text?.text === 'string' ? action.text.text : undefined,
      triggerId: payload?.trigger_id || undefined,
      payload,
    };
  }

  private buildViewSubmissionContext(payload: any): SlackActionContext {
    return {
      actionId: typeof payload?.view?.callback_id === 'string' ? payload.view.callback_id : '',
      type: 'view_submission',
      channelId: undefined,
      userId: payload?.user?.id || undefined,
      userName: payload?.user?.username || payload?.user?.name || undefined,
      value: this.extractViewInputValues(payload?.view?.state?.values),
      text: typeof payload?.view?.title?.text === 'string' ? payload.view.title.text : undefined,
      triggerId: payload?.trigger_id || undefined,
      payload,
    };
  }

  private extractActionValue(action: any): string | undefined {
    if (typeof action?.value === 'string' && action.value) {
      return action.value;
    }
    if (typeof action?.selected_option?.value === 'string') {
      return action.selected_option.value;
    }
    if (typeof action?.selected_date === 'string') {
      return action.selected_date;
    }
    return undefined;
  }

  /** Flatten a view_submission `state.values` object into newline-joined text. */
  private extractViewInputValues(stateValues: any): string | undefined {
    if (!stateValues || typeof stateValues !== 'object') {
      return undefined;
    }
    const values: string[] = [];
    for (const block of Object.values(stateValues) as any[]) {
      if (!block || typeof block !== 'object') {
        continue;
      }
      for (const input of Object.values(block) as any[]) {
        const value =
          (typeof input?.value === 'string' && input.value) ||
          (typeof input?.selected_option?.value === 'string' && input.selected_option.value) ||
          (typeof input?.selected_date === 'string' && input.selected_date) ||
          '';
        if (value.trim()) {
          values.push(value.trim());
        }
      }
    }
    return values.length > 0 ? values.join('\n') : undefined;
  }
}
