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
  
  const ts = event.ts ?? event.event_ts ?? event.message_ts ?? event.message?.ts;
  const user = event.user ?? event.message?.user ?? event.bot_id;
  const thread = event.thread_ts ?? event.message?.thread_ts;
  const team = event.team ?? event.message?.team;

  return {
    slackUser: user,
    slackChannel: event.channel,
    slackTimestamp: ts,
    slackThread: thread || undefined,
    slackTeam: team || undefined,
  };
}
