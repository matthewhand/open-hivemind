/**
 * Extracts relevant metadata from a Slack event.
 *
 * @param event - The Slack event payload.
 * @returns An object containing metadata such as user, channel, timestamp, thread, and team.
 */
export function extractSlackMetadata(event: any): Record<string, any> {
  return {
    slackUser: event.user,
    slackChannel: event.channel,
    slackTimestamp: event.ts,
    slackThread: event.thread_ts || null,
    slackTeam: event.team || null,
  };
}
