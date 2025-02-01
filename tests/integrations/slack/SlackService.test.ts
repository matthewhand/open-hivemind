// Set a dummy token so that SlackService does not throw in its constructor.
process.env.SLACK_BOT_TOKEN = "dummy-token";

import { SlackService } from "../../../src/integrations/slack/SlackService";
import { WebClient } from "@slack/web-api";
import Debug from "debug";

const debug = Debug("test:SlackService");

// Mock the WebClient class from @slack/web-api
jest.mock("@slack/web-api", () => {
  return {
    WebClient: jest.fn().mockImplementation(() => ({
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true }),
      },
      conversations: {
        history: jest.fn().mockResolvedValue({ messages: [{ text: "Test message" }] }),
        join: jest.fn().mockResolvedValue({ ok: true }),
      },
    })),
  };
});

// Helper function to retrieve the mocked slackClient from our SlackService instance.
const getMockedSlackClientInstance = (slackServiceInstance: SlackService) => {
  return (slackServiceInstance as any).slackClient;
};

describe("SlackService", () => {
  let slackService: SlackService;

  beforeEach(() => {
    // Reset the singleton instance before each test.
    SlackService.resetInstance();
    slackService = SlackService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should send a plain message", async () => {
    const channel = "C11111";
    const message = "Hello Slack!";
    await slackService.sendMessage(channel, message);
    const mockedClient = getMockedSlackClientInstance(slackService);
    expect(mockedClient.chat.postMessage).toHaveBeenCalledWith({ channel, text: message });
  });

  it("should send a welcome message", async () => {
    const channel = "C12345";
    await slackService.sendWelcomeMessage(channel);
    const mockedClient = getMockedSlackClientInstance(slackService);
    expect(mockedClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel,
        blocks: expect.any(Array),
        text: expect.any(String),
      })
    );
  });

  it("should join a channel and send a welcome message", async () => {
    const channel = "C67890";
    await slackService.joinChannel(channel);
    const mockedClient = getMockedSlackClientInstance(slackService);
    expect(mockedClient.conversations.join).toHaveBeenCalledWith({ channel });
    // Ensure that after joining, a welcome message is sent.
    expect(mockedClient.chat.postMessage).toHaveBeenCalled();
  });

  it("should fetch messages from a channel", async () => {
    const channel = "C22222";
    const messages = await slackService.fetchMessages(channel);
    const mockedClient = getMockedSlackClientInstance(slackService);
    expect(mockedClient.conversations.history).toHaveBeenCalledWith({ channel });
    expect(messages).toEqual([{ text: "Test message" }]);
  });
});
