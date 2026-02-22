import { EventEmitter } from 'events';

/**
 * Discord Mock Factory
 *
 * Creates mock Discord.js clients with proper EventEmitter behavior
 * for testing DiscordService. This factory ensures:
 * 1. Event handlers can be properly registered and invoked
 * 2. Singleton instances can be properly isolated between tests
 * 3. Debug logs can be captured for verification
 */

export interface MockDiscordClient extends EventEmitter {
  on: jest.MockedFunction<(event: string, listener: (...args: any[]) => void) => this>;
  once: jest.MockedFunction<(event: string, listener: (...args: any[]) => void) => this>;
  login: jest.MockedFunction<(token: string) => Promise<string>>;
  destroy: jest.MockedFunction<() => Promise<void>>;
  user: {
    id: string;
    tag: string;
    username: string;
    globalName: string;
    setActivity: jest.Mock;
  };
  ws: {
    status: number;
    ping: number;
  };
  uptime: number;
  channels: {
    fetch: jest.Mock;
  };
}

export interface DiscordMockFactoryOptions {
  botId?: string;
  botTag?: string;
  botUsername?: string;
  autoReady?: boolean;
}

let clientCounter = 0;

/**
 * Creates a mock Discord client with EventEmitter functionality
 */
export function createMockDiscordClient(
  options: DiscordMockFactoryOptions = {}
): MockDiscordClient {
  clientCounter++;
  const {
    botId = `bot${clientCounter}`,
    botTag = `Bot${clientCounter}#1234`,
    botUsername = `Bot${clientCounter}`,
    autoReady = true,
  } = options;

  const emitter = new EventEmitter();

  const client: MockDiscordClient = Object.assign(emitter, {
    on: jest.fn((event: string, listener: (...args: any[]) => void) => {
      emitter.on(event, listener);
      return client;
    }),
    once: jest.fn((event: string, listener: (...args: any[]) => void) => {
      // For 'ready' event, auto-call if autoReady is true
      if (event === 'ready' && autoReady) {
        // Call listener immediately to simulate ready state
        setTimeout(() => listener(), 0);
      } else {
        emitter.once(event, listener);
      }
      return client;
    }),
    login: jest.fn().mockResolvedValue('mock-token'),
    destroy: jest.fn().mockResolvedValue(undefined),
    user: {
      id: botId,
      tag: botTag,
      username: botUsername,
      globalName: botUsername,
      setActivity: jest.fn(),
    },
    ws: {
      status: 0, // READY
      ping: 42,
    },
    uptime: 123456,
    channels: {
      fetch: jest.fn(),
    },
  }) as MockDiscordClient;

  return client;
}

/**
 * Resets the client counter for test isolation
 */
export function resetDiscordMockState(): void {
  clientCounter = 0;
}

/**
 * Creates a complete discord.js mock module
 */
export function createDiscordJsMock(options: DiscordMockFactoryOptions = {}) {
  const client = createMockDiscordClient(options);

  return {
    Client: jest.fn(() => client),
    GatewayIntentBits: {
      Guilds: 1 << 0,
      GuildMessages: 1 << 9,
      MessageContent: 1 << 15,
      GuildVoiceStates: 1 << 7,
    },
    __getMockClient: () => client,
  };
}

/**
 * Helper to get all registered event handlers for a specific event
 */
export function getEventHandlers(client: MockDiscordClient, event: string): Function[] {
  // EventEmitter stores listeners internally, we can access them via listeners()
  return client.listeners(event) as Function[];
}

/**
 * Helper to emit events on the mock client
 */
export function emitEvent(client: MockDiscordClient, event: string, ...args: any[]): boolean {
  return client.emit(event, ...args);
}
