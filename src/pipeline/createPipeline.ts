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
import { PipelineTracer, setActiveTracer } from '@src/observability';
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
 * Tracks which {@link MessageBus} instances already have a pipeline wired.
 *
 * The pipeline stages subscribe to shared, bus-wide events (`message:incoming`,
 * `message:validated`, …) that carry no per-service identity. Registering them
 * again on the same bus — e.g. once per messenger service — would add duplicate
 * listeners and cause every message to be processed N times (and sent N times).
 *
 * A {@link WeakSet} lets registered buses be garbage-collected (and re-registered
 * after a `bus.reset()` returns a brand-new instance).
 */
const registeredBuses = new WeakSet<MessageBus>();

/**
 * Create and register the full 5-stage message pipeline on the given
 * {@link MessageBus}.
 *
 * After calling this function, emitting a `message:incoming` event on
 * the bus will drive the message through all stages automatically.
 *
 * Registration is **idempotent per bus instance**: calling this multiple times
 * with the same bus (for example, once per messenger service) wires the stages
 * exactly once. Subsequent calls are no-ops and return `false`.
 *
 * @returns `true` if the pipeline was registered, `false` if the bus already had one.
 */
export function createPipeline(bus: MessageBus, deps: PipelineDependencies): boolean {
  if (registeredBuses.has(bus)) {
    return false;
  }
  registeredBuses.add(bus);

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

  return true;
}
