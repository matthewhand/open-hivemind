export class SlackService {
  async sendMessage(channel: string, text: string) {
    console.log(`Sending message to Slack channel ${channel}: ${text}`);
  }

  async fetchMessages(channel: string, limit = 10) {
    console.log(`Fetching last ${limit} messages from Slack channel ${channel}`);
    return [{ text: "Test message from Slack" }];
  }
}
