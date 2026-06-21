/** Shared bot status → UI variant utilities used by DashboardBotCard, BotStatusCard, BotConfigCard. */

export type StatusBadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

/**
 * Map a bot status string to the DaisyUI Badge variant.
 * Covers both runtime status strings (active/connected/healthy) and
 * config-level strings (running/inactive/stopped/disabled/starting/stopping).
 */
export function botStatusVariant(status: string): StatusBadgeVariant {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'running':
    case 'connected':
    case 'healthy':
      return 'success';
    case 'error':
    case 'disconnected':
      return 'error';
    case 'warning':
    case 'connecting':
    case 'starting':
    case 'stopping':
      return 'warning';
    default:
      return 'neutral';
  }
}

/**
 * Human-readable label for a bot status string.
 */
export function botStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'running':
      return 'Running';
    case 'inactive':
    case 'stopped':
      return 'Stopped';
    case 'disabled':
      return 'Disabled';
    case 'error':
      return 'Error';
    case 'starting':
      return 'Starting';
    case 'stopping':
      return 'Stopping';
    case 'connected':
    case 'healthy':
      return 'Healthy';
    case 'disconnected':
      return 'Disconnected';
    default:
      return status || 'Unknown';
  }
}
