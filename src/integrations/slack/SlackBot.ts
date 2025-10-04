import { WebClient } from '@slack/web-api';
import { SocketModeClient } from '@slack/socket-mode';
import { RTMClient } from '@slack/rtm-api';
import Debug from 'debug';
import { HivemindError, ErrorUtils } from '@src/types/errors';
const debug = Debug('app:SlackBot');

export interface ISlackBotOptions {
  botToken: string;
  appToken?: string;
  signingSecret: string;
  mode: 'socket' | 'rtm';
}

export class SlackBot {
  public botToken: string;
  public appToken?: string;
  public signingSecret: string;
  public mode: 'socket' | 'rtm';
  public webClient: WebClient;
  public socketClient?: SocketModeClient;
  public rtmClient?: RTMClient;
  public botUserId?: string;
  public botUserName?: string;

  constructor(options: ISlackBotOptions) {
    this.botToken = options.botToken;
    this.appToken = options.appToken;
    this.signingSecret = options.signingSecret;
    this.mode = options.mode;
    this.webClient = new WebClient(this.botToken);
    if (this.mode === 'socket' && this.appToken) {
      this.socketClient = new SocketModeClient({ appToken: this.appToken });
    } else if (this.mode === 'rtm') {
      this.rtmClient = new RTMClient(this.botToken);
    }
  }

  public async authenticate(): Promise<void> {
    try {
      const authTest = await this.webClient.auth.test();
      this.botUserId = authTest.user_id;
      this.botUserName = authTest.user;
      debug(`Authenticated as: ${this.botUserName} (ID: ${this.botUserId})`);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Authentication failed:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity
      });
      throw hivemindError;
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    try {
      await this.webClient.conversations.join({ channel });
      debug(`Joined channel: ${channel}`);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Failed to join channel ${channel}:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        channel
      });
    }
  }

  public async sendMessage(channel: string, text: string): Promise<void> {
    try {
      await this.webClient.chat.postMessage({ channel, text });
      debug(`Message sent to channel: ${channel}`);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Failed to send message:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        channel
      });
    }
  }
}
