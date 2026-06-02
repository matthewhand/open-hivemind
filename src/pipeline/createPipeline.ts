/**
 * Factory that wires all 5 pipeline stages with their adapter-backed
 * dependencies and registers them on a {@link MessageBus}.
 *
 * This creates a **parallel** message-processing path that can run
 * alongside the existing `handleMessage` function.  Toggle the pipeline
 * on/off via the `USE_PIPELINE` feature flag (or however the caller
 * chooses to gate it).
 *
 * ```
 *   message:incoming  →  ReceiveStage  →  DecisionStage  →  EnrichStage
 *                         →  InferenceStage  →  SendStage
 * ```
 *
 * @module pipeline/createPipeline
 */

import type { MessageBus } from '@src/events/MessageBus';
import { ActivityRecorder, PipelineTracer, setActiveTracer } from '@src/observability';
import { ActivityLogger } from '@src/server/services/ActivityLogger';
import { WebSocketService } from '@src/server/services/WebSocketService';
import {
  DecisionStrategyAdapter,
  LlmInvokerAdapter,
  MemoryRetrieverAdapter,
  MemoryStorerAdapter,
  MessageSenderAdapter,
  PromptBuilderAdapter,
} from '@src/pipeline/adapters';
import { DecisionStage } from '@src/pipeline/DecisionStage';
import { EnrichStage } from '@src/pipeline/EnrichStage';
import { InferenceStage } from '@src/pipeline/InferenceStage';
import { ReceiveStage } from '@src/pipeline/ReceiveStage';
import { SendStage } from '@src/pipeline/SendStage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';

// ---------------------------------------------------------------------------
// Pipeline dependencies
// ---------------------------------------------------------------------------

/**
 * All external dependencies needed by the pipeline factory.
 *
 * Callers assemble this from the application's existing singletons and
 * config objects.
 */
export interface PipelineDependencies {
  /** The bot's user ID on the platform. */
  botId?: string;
  /** Active bot configuration snapshot. */
  botConfig: Record<string, unknown>;
  /** Default channel ID (used by decision logic). */
  defaultChannelId?: string;
  /** Platform messenger service for sending replies. */
  messengerService: IMessengerService;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and register the full 5-stage message pipeline on the given
 * {@link MessageBus}.
 *
 * After calling this function, emitting a `message:incoming` event on
 * the bus will drive the message through all stages automatically.
 */
export function createPipeline(bus: MessageBus, deps: PipelineDependencies): void {
  const receive = new ReceiveStage(bus);

  const decision = new DecisionStage(
    bus,
    new DecisionStrategyAdapter({
      botId: deps.botId,
      defaultChannelId: deps.defaultChannelId,
    })
  );

  const enrich = new EnrichStage(bus, new MemoryRetrieverAdapter(), new PromptBuilderAdapter());

  const inference = new InferenceStage(bus, new LlmInvokerAdapter({ botConfig: deps.botConfig }));

  const send = new SendStage(
    bus,
    new MessageSenderAdapter({ messengerService: deps.messengerService }),
    new MemoryStorerAdapter()
  );

  receive.register();
  decision.register();
  enrich.register();
  inference.register();
  send.register();

  // Register the observability tracer and store it as a singleton so
  // health / diagnostic routes can query pipeline stats.
  const tracer = new PipelineTracer(bus);
  tracer.register();
  setActiveTracer(tracer);

  // Record real message activity to the persistent ActivityLogger (JSONL) and
  // the live WebSocket feed so the dashboard ActivityPage / DashboardService
  // surface real events — not just demo-mode simulations.
  const activityLogger = ActivityLogger.getInstance();
  let flowSink: { recordMessageFlow(event: unknown): void } | undefined;
  try {
    flowSink = WebSocketService.getInstance();
  } catch {
    // WebSocketService may be unavailable (e.g. HTTP disabled); recording to
    // the persistent log is sufficient and must not break the pipeline.
    flowSink = undefined;
  }
  const activityRecorder = new ActivityRecorder(
    bus,
    activityLogger,
    flowSink as ConstructorParameters<typeof ActivityRecorder>[2]
  );
  activityRecorder.register();
}
