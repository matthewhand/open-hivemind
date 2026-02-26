export interface IBotInfo {
  botUserId?: string;
  botUserName?: string;
  webClient?: any; // Used by Slack
  client?: any; // Used by Discord
  config?: {
    name?: string;
    discord?: { token: string; clientId?: string };
    slack?: { botToken?: string; appToken?: string; signingSecret?: string; mode?: string };
    token?: string;
    BOT_ID?: string;
    [key: string]: any;
  };
}
