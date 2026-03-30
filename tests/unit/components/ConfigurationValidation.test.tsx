/* @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the apiService before importing the component
jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

import ConfigurationValidation, {
  runClientChecks,
} from '../../../src/client/src/components/ConfigurationValidation';
import { apiService } from '../../../src/client/src/services/api';
import type { BotConfig } from '../../../src/client/src/types/bot';

const mockedGet = apiService.get as jest.MockedFunction<typeof apiService.get>;

function makeBotConfig(overrides: Partial<BotConfig> = {}): BotConfig {
  return {
    id: 'bot-1',
    name: 'test-bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    status: 'active',
    ...overrides,
  } as BotConfig;
}

const validationResponse = {
  isValid: true,
  errors: [],
  warnings: [],
  recommendations: [],
  botValidation: [
    { name: 'test-bot', valid: true, errors: [], warnings: [] },
  ],
  environmentValidation: { valid: true, errors: [], warnings: [] },
  timestamp: new Date().toISOString(),
};

describe('runClientChecks', () => {
  it('passes for a well-configured bot', () => {
    const bot = makeBotConfig({
      discord: { token: 'MTE0OTk0NjY2.Gg3vZw.valid-token-here12' },
      openai: { apiKey: 'sk-abc123456789' },
    });
    const checks = runClientChecks(bot);
    const failures = checks.filter(c => c.status === 'fail');
    expect(failures).toHaveLength(0);
  });

  it('fails when name is missing', () => {
    const bot = makeBotConfig({ name: '' });
    const checks = runClientChecks(bot);
    const nameCheck = checks.find(c => c.label === 'Bot name');
    expect(nameCheck?.status).toBe('fail');
  });

  it('warns when name is very short', () => {
    const bot = makeBotConfig({ name: 'a' });
    const checks = runClientChecks(bot);
    const nameCheck = checks.find(c => c.label === 'Bot name');
    expect(nameCheck?.status).toBe('warn');
  });

  it('fails when messageProvider is missing', () => {
    const bot = makeBotConfig({ messageProvider: '' });
    const checks = runClientChecks(bot);
    const mpCheck = checks.find(c => c.label === 'Message provider');
    expect(mpCheck?.status).toBe('fail');
  });

  it('fails when llmProvider is missing', () => {
    const bot = makeBotConfig({ llmProvider: '' });
    const checks = runClientChecks(bot);
    const llmCheck = checks.find(c => c.label === 'LLM provider');
    expect(llmCheck?.status).toBe('fail');
  });

  it('fails for discord bot without token', () => {
    const bot = makeBotConfig({ messageProvider: 'discord', discord: undefined });
    const checks = runClientChecks(bot);
    const tokenCheck = checks.find(c => c.label === 'Discord token');
    expect(tokenCheck?.status).toBe('fail');
  });

  it('fails for slack bot without botToken', () => {
    const bot = makeBotConfig({
      messageProvider: 'slack',
      slack: { signingSecret: 'secret' } as any,
    });
    const checks = runClientChecks(bot);
    const tokenCheck = checks.find(c => c.label === 'Slack bot token');
    expect(tokenCheck?.status).toBe('fail');
  });

  it('fails for slack bot without signingSecret', () => {
    const bot = makeBotConfig({
      messageProvider: 'slack',
      slack: { botToken: 'xoxb-token' } as any,
    });
    const checks = runClientChecks(bot);
    const secretCheck = checks.find(c => c.label === 'Slack signing secret');
    expect(secretCheck?.status).toBe('fail');
  });

  it('warns for openai key not starting with sk-', () => {
    const bot = makeBotConfig({
      llmProvider: 'openai',
      openai: { apiKey: 'bad-key' },
    });
    const checks = runClientChecks(bot);
    const keyCheck = checks.find(c => c.label === 'OpenAI API key');
    expect(keyCheck?.status).toBe('warn');
  });

  it('passes for openai key starting with sk-', () => {
    const bot = makeBotConfig({
      llmProvider: 'openai',
      openai: { apiKey: 'sk-abc123' },
    });
    const checks = runClientChecks(bot);
    const keyCheck = checks.find(c => c.label === 'OpenAI API key');
    expect(keyCheck?.status).toBe('pass');
  });
});

describe('ConfigurationValidation component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders client-side checks immediately', () => {
    mockedGet.mockResolvedValue(validationResponse);
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    expect(screen.getByText('Client Checks')).toBeInTheDocument();
    expect(screen.getByText('Bot name')).toBeInTheDocument();
    expect(screen.getByText('Message provider')).toBeInTheDocument();
    expect(screen.getByText('LLM provider')).toBeInTheDocument();
  });

  it('shows loading state while fetching backend validation', () => {
    // Never resolve the promise to keep loading state
    mockedGet.mockReturnValue(new Promise(() => {}));
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    expect(screen.getByTestId('validation-loading')).toBeInTheDocument();
    expect(screen.getByText('Validating configuration...')).toBeInTheDocument();
  });

  it('shows backend validation results after loading', async () => {
    mockedGet.mockResolvedValue(validationResponse);
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('No issues detected')).toBeInTheDocument();
    });
  });

  it('displays backend errors for the selected bot', async () => {
    mockedGet.mockResolvedValue({
      ...validationResponse,
      isValid: false,
      botValidation: [
        { name: 'test-bot', valid: false, errors: ['Missing API key'], warnings: [] },
      ],
    });
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('Missing API key')).toBeInTheDocument();
    });
  });

  it('displays backend warnings for the selected bot', async () => {
    mockedGet.mockResolvedValue({
      ...validationResponse,
      botValidation: [
        { name: 'test-bot', valid: false, errors: [], warnings: ['Token may be invalid'] },
      ],
    });
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('Token may be invalid')).toBeInTheDocument();
    });
  });

  it('shows error state when backend fetch fails', async () => {
    mockedGet.mockRejectedValue(new Error('Network error'));
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows "Configuration Valid" when everything passes', async () => {
    mockedGet.mockResolvedValue(validationResponse);
    const bot = makeBotConfig({
      discord: { token: 'MTE0OTk0NjY2.Gg3vZw.valid-token-here12' },
      openai: { apiKey: 'sk-abc123456789' },
    });
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('Configuration Valid')).toBeInTheDocument();
    });
  });

  it('shows "Issues Found" when client checks fail', async () => {
    mockedGet.mockResolvedValue(validationResponse);
    const bot = makeBotConfig({ name: '' });
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('Issues Found')).toBeInTheDocument();
    });
  });

  it('displays recommendations from backend', async () => {
    mockedGet.mockResolvedValue({
      ...validationResponse,
      recommendations: ['Consider adding a backup provider'],
    });
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('Consider adding a backup provider')).toBeInTheDocument();
    });
  });

  it('displays environment warnings from backend', async () => {
    mockedGet.mockResolvedValue({
      ...validationResponse,
      environmentValidation: {
        valid: false,
        errors: [],
        warnings: ['Missing environment variable'],
      },
    });
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('Missing environment variable')).toBeInTheDocument();
    });
  });

  it('calls refresh when clicking the refresh button', async () => {
    mockedGet.mockResolvedValue(validationResponse);
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    await waitFor(() => {
      expect(screen.getByText('No issues detected')).toBeInTheDocument();
    });

    // First call is from useEffect
    expect(mockedGet).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Refresh validation'));

    // Second call from clicking refresh
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledTimes(2);
    });
  });

  it('has the correct test id on the root element', () => {
    mockedGet.mockResolvedValue(validationResponse);
    const bot = makeBotConfig();
    render(<ConfigurationValidation bot={bot} />);

    expect(screen.getByTestId('configuration-validation')).toBeInTheDocument();
  });
});
