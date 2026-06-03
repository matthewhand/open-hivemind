/**
 * Pipeline activity recording collaborator.
 *
 * The staged pipeline (the DEFAULT message-processing path) must feed the same
 * response-scoring signals that the legacy `handleMessage()` path feeds:
 *
 *  - {@link GlobalActivityTracker.recordActivity} — drives the global "fatigue"
 *    penalty consulted by `shouldReplyToMessage()`.
 *  - `recordBotActivity()` — drives the grace-window / recently-posted /
 *    crosstalk signals in {@link ChannelActivity}.
 *  - {@link IdleResponseManager.recordInteraction} / `recordBotResponse` —
 *    drive idle-response scheduling.
 *
 * Without these recordings, fatigue, grace window, and idle response are dead
 * in pipeline mode. This interface lets the DecisionStage and SendStage emit
 * those recordings while remaining unit-testable (the default implementation
 * delegates to the real singletons).
 *
 * @module pipeline/ActivityRecorder
 */

import { recordBotActivity } from '@message/helpers/processing/ChannelActivity';
import { GlobalActivityTracker } from '@message/helpers/processing/GlobalActivityTracker';
import { IdleResponseManager } from '@message/management/IdleResponseManager';

/**
 * Records the response-scoring signals consumed by the reply-decision and
 * idle-response subsystems.
 */
export interface ActivityRecorder {
  /**
   * Record an inbound (human) interaction for idle-response tracking.
   * Mirrors the legacy `replyDecision.ts` recording.
   */
  recordInteraction(serviceName: string, channelId: string, messageId?: string): void;

  /**
   * Record a successfully-sent bot message. Updates the global fatigue score,
   * the per-channel grace-window/crosstalk activity, and the idle-response
   * last-bot-response timestamp. Mirrors the legacy `outputProcessor.ts`
   * recordings (plus the previously-dead `recordActivity` call).
   */
  recordBotResponse(serviceName: string, channelId: string, botId: string): void;
}

/**
 * Default {@link ActivityRecorder} that delegates to the application
 * singletons. All calls are defensive: a failure to record must never break
 * message delivery.
 */
export class DefaultActivityRecorder implements ActivityRecorder {
  recordInteraction(serviceName: string, channelId: string, messageId?: string): void {
    try {
      IdleResponseManager.getInstance().recordInteraction(serviceName, channelId, messageId);
    } catch {
      // Recording is best-effort; never block the pipeline.
    }
  }

  recordBotResponse(serviceName: string, channelId: string, botId: string): void {
    try {
      if (botId) {
        // Global "fatigue" score — previously never recorded in any path.
        GlobalActivityTracker.getInstance().recordActivity(botId);
        // Per-channel grace-window / recently-posted / crosstalk signal.
        recordBotActivity(channelId, botId);
      }
      // Idle-response last-bot-response timestamp.
      IdleResponseManager.getInstance().recordBotResponse(serviceName, channelId);
    } catch {
      // Recording is best-effort; never block the pipeline.
    }
  }
}
