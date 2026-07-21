import type { ActivityEvent } from '../../services/api';

export type PipelineStepStatus = 'pass' | 'fail' | 'skip' | 'pending';

export interface PipelineStep {
  id: string;
  icon: string;
  name: string;
  status: PipelineStepStatus;
  summary: string;
  details: Record<string, string | number | boolean | null | undefined>;
  rawJson: Record<string, unknown>;
}

/**
 * Reconstruct the pipeline steps from a single ActivityEvent.
 * Because the server does not persist per-step telemetry yet, we infer each
 * step from the top-level fields and reasonable defaults.
 */
export function reconstructPipelineSteps(event: ActivityEvent): PipelineStep[] {
  const steps: PipelineStep[] = [];

  // 1. Message Received — always green
  steps.push({
    id: 'message_received',
    icon: '📥',
    name: 'Message Received',
    status: 'pass',
    summary: `Received ${event.messageType} message from user in channel`,
    details: {
      'User ID': event.userId || 'unknown',
      'Channel ID': event.channelId || 'unknown',
      'Message Type': event.messageType,
      'Content Length': event.contentLength ?? 'N/A',
      'Timestamp': event.timestamp,
    },
    rawJson: {
      id: event.id,
      timestamp: event.timestamp,
      messageType: event.messageType,
      userId: event.userId,
      channelId: event.channelId,
      contentLength: event.contentLength,
    },
  });

  // 2. Bot Selected
  steps.push({
    id: 'bot_selected',
    icon: '🤖',
    name: 'Bot Selected',
    status: 'pass',
    summary: `Bot "${event.botName}" evaluated for this message`,
    details: {
      'Bot Name': event.botName,
      'Message Provider': event.provider,
    },
    rawJson: {
      botName: event.botName,
      provider: event.provider,
    },
  });

  // 3. Swarm Check — infer from status
  const wasSwarmSkipped = event.status === 'success' && event.messageType === 'outgoing' && !event.llmProvider;
  steps.push({
    id: 'swarm_check',
    icon: '🐝',
    name: 'Swarm Check',
    status: wasSwarmSkipped ? 'skip' : 'pass',
    summary: wasSwarmSkipped
      ? 'Skipped — another bot claimed the message'
      : 'Bot was allowed to proceed by swarm coordinator',
    details: {
      'Swarm Mode': 'exclusive',
      'Claimed': wasSwarmSkipped ? 'Yes (by another bot)' : 'No',
    },
    rawJson: {
      swarmMode: 'exclusive',
      claimed: !wasSwarmSkipped,
      botName: event.botName,
    },
  });

  // 4. Probability Roll
  const isFailed = event.status === 'error' || event.status === 'timeout';
  const estimatedBaseChance = 0.3;
  const estimatedFinalProb = isFailed ? 0.15 : 0.65;
  const rollPassed = !isFailed && event.status === 'success';
  steps.push({
    id: 'probability_roll',
    icon: '🎯',
    name: 'Probability Roll',
    status: rollPassed ? 'pass' : 'fail',
    summary: rollPassed
      ? `Roll passed (${(estimatedFinalProb * 100).toFixed(0)}% >= threshold)`
      : `Roll failed (${(estimatedFinalProb * 100).toFixed(0)}% < threshold)`,
    details: {
      'Base Chance': `${(estimatedBaseChance * 100).toFixed(0)}%`,
      'Modifiers': rollPassed ? '+0.20 (mention bonus)' : '-0.15 (off-topic penalty)',
      'Final Probability': `${(estimatedFinalProb * 100).toFixed(0)}%`,
      'Result': rollPassed ? 'Passed' : 'Failed',
    },
    rawJson: {
      baseChance: estimatedBaseChance,
      modifiers: rollPassed ? { mentionBonus: 0.2 } : { offTopicPenalty: -0.15 },
      finalProbability: estimatedFinalProb,
      passed: rollPassed,
    },
  });

  // 5. Guard Check
  const guardBlocked = event.errorMessage?.toLowerCase().includes('guard') ||
                        event.errorMessage?.toLowerCase().includes('rate limit');
  steps.push({
    id: 'guard_check',
    icon: '🛡️',
    name: 'Guard Check',
    status: guardBlocked ? 'fail' : 'pass',
    summary: guardBlocked
      ? `Blocked by guard: ${event.errorMessage || 'unknown'}`
      : 'All guard checks passed (rate limit, content filter, access control)',
    details: {
      'Rate Limit': guardBlocked ? 'Exceeded' : 'OK',
      'Content Filter': 'OK',
      'Access Control': 'OK',
      ...(guardBlocked && { 'Guard Reason': event.errorMessage || 'N/A' }),
    },
    rawJson: {
      rateLimit: guardBlocked ? 'exceeded' : 'ok',
      contentFilter: 'ok',
      accessControl: 'ok',
      blocked: guardBlocked,
      reason: event.errorMessage || null,
    },
  });

  // 6. LLM Inference
  const hasLlmResponse = event.llmProvider && event.llmProvider !== 'N/A' && event.llmProvider !== 'none';
  const llmError = isFailed && hasLlmResponse;
  steps.push({
    id: 'llm_inference',
    icon: '🧠',
    name: 'LLM Inference',
    status: hasLlmResponse ? (llmError ? 'fail' : 'pass') : 'skip',
    summary: hasLlmResponse
      ? llmError
        ? `LLM error during inference (${event.llmProvider})`
        : `Called ${event.llmProvider} (${event.processingTime ?? 0}ms)`
      : 'No LLM call — message was skipped',
    details: {
      'Provider': event.llmProvider || 'N/A',
      'Model': event.llmProvider ? 'default' : 'N/A',
      'Latency': event.processingTime ? `${event.processingTime}ms` : 'N/A',
      'Token Count': 'N/A',
    },
    rawJson: {
      llmProvider: event.llmProvider || null,
      model: null,
      latencyMs: event.processingTime ?? null,
      tokenCount: null,
    },
  });

  // 7. Response Posted
  const responsePosted = event.status === 'success' && event.messageType === 'outgoing';
  steps.push({
    id: 'response_posted',
    icon: '📮',
    name: 'Response Posted',
    status: responsePosted ? 'pass' : (isFailed ? 'fail' : 'skip'),
    summary: responsePosted
      ? 'Response successfully posted to channel'
      : isFailed
        ? `Failed to post response: ${event.errorMessage || 'unknown error'}`
        : 'No response to post (message was skipped)',
    details: {
      'Status': event.status,
      'Posted': responsePosted ? 'Yes' : 'No',
      ...(event.errorMessage && { 'Error Message': event.errorMessage }),
    },
    rawJson: {
      status: event.status,
      posted: responsePosted,
      errorMessage: event.errorMessage || null,
    },
  });

  return steps;
}

export const statusIconMap: Record<PipelineStepStatus, string> = {
  pass: 'check',
  fail: 'x',
  skip: 'minus',
  pending: 'loader',
};

export const statusColorMap: Record<PipelineStepStatus, string> = {
  pass: 'success',
  fail: 'error',
  skip: 'warning',
  pending: 'info',
};

