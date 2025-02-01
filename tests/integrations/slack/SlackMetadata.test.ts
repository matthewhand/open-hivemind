import { extractSlackMetadata } from "../../../src/integrations/slack/slackMetadata";

describe("Slack Metadata Extraction", () => {
  it("should extract metadata from a Slack event", () => {
    const event = {
      user: "U12345",
      channel: "C67890",
      ts: "1610000000.000200",
      thread_ts: "1610000000.000100",
      team: "T11111"
    };
    const metadata = extractSlackMetadata(event);
    expect(metadata).toEqual({
      slackUser: "U12345",
      slackChannel: "C67890",
      slackTimestamp: "1610000000.000200",
      slackThread: "1610000000.000100",
      slackTeam: "T11111"
    });
  });
});
