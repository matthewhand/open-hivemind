import { describe, it, expect } from 'vitest';
import {
  buildConnectedBotsMap,
  getConnectedBotsFrom,
} from '../connectedBots';

interface TestBot {
  name: string;
  llmProvider?: string | null;
  messageProvider?: string | null;
}

const bots: TestBot[] = [
  { name: 'alpha', llmProvider: 'openai', messageProvider: 'discord' },
  { name: 'beta', llmProvider: 'openai', messageProvider: 'slack' },
  { name: 'gamma', llmProvider: 'ollama', messageProvider: 'discord' },
  { name: 'delta', llmProvider: 'openai' }, // no message provider
  { name: 'epsilon', messageProvider: 'slack' }, // no llm provider
];

describe('buildConnectedBotsMap', () => {
  it('returns an empty map for no bots', () => {
    expect(buildConnectedBotsMap([]).size).toBe(0);
  });

  it('indexes a bot under both its llm and message providers', () => {
    const map = buildConnectedBotsMap([bots[0]]);
    expect(map.get('openai')?.llm.map((b) => b.name)).toEqual(['alpha']);
    expect(map.get('discord')?.message.map((b) => b.name)).toEqual(['alpha']);
  });

  it('groups multiple bots sharing a provider', () => {
    const map = buildConnectedBotsMap(bots);
    expect(map.get('openai')?.llm.map((b) => b.name)).toEqual(['alpha', 'beta', 'delta']);
    expect(map.get('discord')?.message.map((b) => b.name)).toEqual(['alpha', 'gamma']);
    expect(map.get('slack')?.message.map((b) => b.name)).toEqual(['beta', 'epsilon']);
  });

  it('does not cross-pollute llm and message buckets', () => {
    const map = buildConnectedBotsMap(bots);
    // openai is only ever an LLM provider here, never a message provider
    expect(map.get('openai')?.message).toEqual([]);
    // discord is only ever a message provider here
    expect(map.get('discord')?.llm).toEqual([]);
  });

  it('ignores falsy/empty provider names', () => {
    const map = buildConnectedBotsMap<TestBot>([
      { name: 'noproviders' },
      { name: 'emptystrings', llmProvider: '', messageProvider: '' },
      { name: 'nulls', llmProvider: null, messageProvider: null },
    ]);
    expect(map.size).toBe(0);
  });
});

describe('getConnectedBotsFrom', () => {
  const map = buildConnectedBotsMap(bots);

  it('resolves llm-connected bots', () => {
    expect(getConnectedBotsFrom(map, 'openai', 'llm').map((b) => b.name)).toEqual([
      'alpha',
      'beta',
      'delta',
    ]);
  });

  it('resolves message-connected bots', () => {
    expect(getConnectedBotsFrom(map, 'slack', 'message').map((b) => b.name)).toEqual([
      'beta',
      'epsilon',
    ]);
  });

  it('returns an empty array for an unknown integration', () => {
    expect(getConnectedBotsFrom(map, 'does-not-exist', 'llm')).toEqual([]);
  });

  it('treats any non-llm category as a message connection', () => {
    // historical getConnectedBots fell through to messageProvider for unknown categories
    expect(getConnectedBotsFrom(map, 'discord', 'something-else').map((b) => b.name)).toEqual([
      'alpha',
      'gamma',
    ]);
  });
});
