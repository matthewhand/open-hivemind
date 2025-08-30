/**
 * Extracts relevant metadata from a Slack event.
 *
 * @param event - The Slack event payload.
 * @returns An object containing metadata such as user, channel, timestamp, thread, and team.
 */
export function extractSlackMetadata(event: any): Record<string, any> {
  if (!event) {
    return {
      slackUser: undefined,
      slackChannel: undefined,
      slackTimestamp: undefined,
      slackThread: undefined,
      slackTeam: undefined,
    };
  }
  
  return {
    slackUser: event.user,
    slackChannel: event.channel,
    slackTimestamp: event.ts,
    slackThread: event.thread_ts || undefined,
    slackTeam: event.team || undefined,
  };
}
