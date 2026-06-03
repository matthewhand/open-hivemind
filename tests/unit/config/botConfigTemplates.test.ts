/**
 * Unit tests for the data-driven bot-config template store.
 *
 * Regression coverage for bot-config-templates-store: the
 * `GET /webui/api/bot-config/templates` endpoint previously returned three
 * hardcoded inline templates. They are now loaded from
 * `config/bot-config-templates.json`, scaffolded from shippable defaults, so
 * templates can be added without code changes.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  BOT_CONFIG_TEMPLATES_FILE,
  getDefaultBotConfigTemplates,
  loadBotConfigTemplates,
} from '@src/config/botConfigTemplates';

describe('botConfigTemplates store', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-tpl-'));
    originalConfigDir = process.env.NODE_CONFIG_DIR;
    process.env.NODE_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    if (originalConfigDir === undefined) {
      delete process.env.NODE_CONFIG_DIR;
    } else {
      process.env.NODE_CONFIG_DIR = originalConfigDir;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const templatesPath = () => path.join(tmpDir, BOT_CONFIG_TEMPLATES_FILE);

  it('returns the shippable defaults when no file exists', () => {
    const templates = loadBotConfigTemplates();
    expect(templates).toEqual(getDefaultBotConfigTemplates());
    // The three original built-in pairings remain available by default.
    expect(Object.keys(templates)).toEqual(
      expect.arrayContaining(['discord_openai', 'slack_flowise', 'mattermost_openwebui'])
    );
    expect(templates.discord_openai.config).toEqual({
      discord: { token: '', voiceChannelId: '' },
      openai: { apiKey: '', model: 'gpt-3.5-turbo' },
    });
  });

  it('scaffolds the defaults to a JSON file on first load', () => {
    expect(fs.existsSync(templatesPath())).toBe(false);
    loadBotConfigTemplates();
    expect(fs.existsSync(templatesPath())).toBe(true);

    const written = JSON.parse(fs.readFileSync(templatesPath(), 'utf8'));
    expect(written).toEqual(getDefaultBotConfigTemplates());
  });

  it('loads templates added to the file without code changes', () => {
    const custom = {
      ...getDefaultBotConfigTemplates(),
      telegram_anthropic: {
        name: 'Telegram + Anthropic Bot',
        description: 'A Telegram bot using Anthropic for responses',
        messageProvider: 'telegram',
        llmProvider: 'anthropic',
        config: {
          telegram: { token: '' },
          anthropic: { apiKey: '', model: 'claude-3' },
        },
      },
    };
    fs.writeFileSync(templatesPath(), JSON.stringify(custom, null, 2), 'utf8');

    const templates = loadBotConfigTemplates();
    expect(templates.telegram_anthropic).toBeDefined();
    expect(templates.telegram_anthropic.messageProvider).toBe('telegram');
    expect(Object.keys(templates)).toContain('telegram_anthropic');
  });

  it('falls back to defaults when the file is malformed', () => {
    fs.writeFileSync(templatesPath(), '{ not valid json', 'utf8');
    const templates = loadBotConfigTemplates();
    expect(templates).toEqual(getDefaultBotConfigTemplates());
  });

  it('falls back to defaults when a template entry is invalid', () => {
    fs.writeFileSync(
      templatesPath(),
      JSON.stringify({ broken: { name: 'no config' } }),
      'utf8'
    );
    const templates = loadBotConfigTemplates();
    expect(templates).toEqual(getDefaultBotConfigTemplates());
  });
});
