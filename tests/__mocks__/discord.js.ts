export class User {
  id: string;
  username: string;
  discriminator: string;
  bot: boolean;

  constructor(id: string, username: string, discriminator: string, bot: boolean) {
    this.id = id;
    this.username = username;
    this.discriminator = discriminator;
    this.bot = bot;
  }
}

export class TextChannel {
  id: string;
  name: string;
  topic: string | null;
  messages: { fetch: jest.Mock };
  members: Collection<string, any>;
  type: number; // Corresponds to ChannelType.GuildText
  guild: any;

  constructor(id: string, name: string, topic: string | null, type: number = 0) {
    this.id = id;
    this.name = name;
    this.topic = topic;
    this.messages = { fetch: jest.fn() };
    this.members = new Collection();
    this.type = type;
    this.guild = {};
  }
}

export class Message {
  id: string;
  content: string;
  channelId: string;
  author: User;
  channel: TextChannel | any;
  editable: boolean;
  edit: jest.Mock;
  mentions: { users: Collection<string, User> };
  reference: { messageId: string; channelId: string; guildId: string; type: number } | null;
  createdAt: Date;

  constructor(
    id: string,
    content: string,
    channelId: string,
    author: User,
    channel: TextChannel | any,
    editable: boolean,
    createdAt: Date,
    reference: { messageId: string; channelId: string; guildId: string; type: number } | null = null
  ) {
    this.id = id;
    this.content = content;
    this.channelId = channelId;
    this.author = author;
    this.channel = channel;
    this.editable = editable;
    this.edit = jest.fn();
    this.mentions = { users: new Collection() };
    this.reference = reference;
    this.createdAt = createdAt;
  }
}

export class Collection<K, V> {
  private _map: Map<K, V>;

  constructor(entries?: readonly (readonly [K, V])[] | null) {
    this._map = new Map(entries);
  }

  has(key: K): boolean {
    return this._map.has(key);
  }
  set(key: K, value: V): this {
    this._map.set(key, value);
    return this;
  }
  get(key: K): V | undefined {
    return this._map.get(key);
  }
  values(): IterableIterator<V> {
    return this._map.values();
  }
  entries(): IterableIterator<[K, V]> {
    return this._map.entries();
  }
  [Symbol.iterator](): IterableIterator<V> {
    return this._map.values();
  }

  get map(): Map<K, V> {
    return this._map;
  }
}

export const ChannelType = {
  GuildText: 0,
  // Add other channel types if necessary
};

export const MessageType = {
  Default: 0,
  // Add other message types if necessary
};
