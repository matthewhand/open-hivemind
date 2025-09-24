import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfigurationWizard from '../ConfigurationWizard';
import * as apiService from '../../services/api';

// Mock the api service
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: jest.fn(),
  getConfig: jest.fn(),
}));

const mockApiService = apiService as any;

describe('ConfigurationWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.getConfig.mockResolvedValue({
      bots: [],
      success: true,
    } as any);
  });

  test('renders wizard with all steps', () => {
    render(<ConfigurationWizard />);
    
    expect(screen.getByText('Basic Setup')).toBeInTheDocument();
    expect(screen.getByText('Service Providers')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('Review & Deploy')).toBeInTheDocument();
  });

  test('loads existing bots on mount', async () => {
    const mockBots = [{ name: 'test-bot', id: '1' }];
    mockApiService.getConfig.mockResolvedValue({
      bots: mockBots,
      success: true,
    } as any);

    render(<ConfigurationWizard />);
    
    await waitFor(() => {
      expect(mockApiService.getConfig).toHaveBeenCalledTimes(1);
    });
  });

  test('validates bot name on basics step', async () => {
    render(<ConfigurationWizard />);
    
    // Should not advance without bot name
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Bot name is required')).toBeInTheDocument();
    });

    // Enter bot name and advance
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
  });

  test('validates existing bot name', async () => {
    const existingBots = [{ name: 'test-bot', id: '1' }];
    mockApiService.getConfig.mockResolvedValue({
      bots: existingBots,
      success: true,
    } as any);

    render(<ConfigurationWizard />);
    
    await waitFor(() => {
      expect(mockApiService.getConfig).toHaveBeenCalled();
    });

    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Bot name already exists')).toBeInTheDocument();
    });
  });

  test('validates providers selection', async () => {
    render(<ConfigurationWizard />);
    
    // Advance to providers step
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Try to advance without selecting providers
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Message provider is required')).toBeInTheDocument();
    });

    // Select providers
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();
    });
  });

  test('renders conditional fields for Discord', async () => {
    render(<ConfigurationWizard />);
    
    // Advance to providers
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Select Discord and advance to credentials
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Discord Settings')).toBeInTheDocument();
    });
    
    // Check Discord fields
    expect(screen.getByLabelText('Discord Bot Token')).toBeInTheDocument();
    expect(screen.getByLabelText('Discord Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Guild ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Channel ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Voice Channel ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Message Length')).toBeInTheDocument();
    
    // Slack and Mattermost fields should not be visible
    expect(screen.queryByLabelText('Slack Bot Token')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mattermost Server URL')).not.toBeInTheDocument();
  });

  test('renders conditional fields for Slack', async () => {
    render(<ConfigurationWizard />);
    
    // Advance to providers
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    // Select Slack and advance to credentials
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'slack' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Slack Settings')).toBeInTheDocument();
    });
    
    // Check Slack fields
    expect(screen.getByLabelText('Slack Bot Token')).toBeInTheDocument();
    expect(screen.getByLabelText('Slack App Token')).toBeInTheDocument();
    expect(screen.getByLabelText('Slack Signing Secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Channel ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Channels to Join')).toBeInTheDocument();
    expect(screen.getByLabelText('Slack Mode')).toBeInTheDocument();
  });

  test('renders conditional fields for Mattermost', async () => {
    render(<ConfigurationWizard />);
    
    // Advance to providers
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    // Select Mattermost and advance to credentials
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'mattermost' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Mattermost Settings')).toBeInTheDocument();
    });
    
    // Check Mattermost fields
    expect(screen.getByLabelText('Mattermost Server URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Mattermost Token')).toBeInTheDocument();
    expect(screen.getByLabelText('Mattermost Channel')).toBeInTheDocument();
  });

  test('renders conditional LLM fields', async () => {
    render(<ConfigurationWizard />);
    
    // Advance to providers
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    // Select OpenAI and advance to credentials
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Check OpenAI field
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
  });

  test('validates required credentials', async () => {
    render(<ConfigurationWizard />);
    
    // Advance to basics and providers
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();
    });
    
    // Try to advance without credentials
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Discord token is required')).toBeInTheDocument();
    });

    // Enter credentials
    const discordTokenInput = screen.getByLabelText('Discord Bot Token');
    fireEvent.change(discordTokenInput, { target: { value: 'fake-discord-token' } });
    
    const openaiKeyInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiKeyInput, { target: { value: 'fake-openai-key' } });
    
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Configure deployment environment')).toBeInTheDocument();
    });
  });

  test('handles deploy success', async () => {
    // Mock fetch for hot-reload endpoint
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Bot created successfully' }),
      } as Response)
    ) as jest.Mock;

    render(<ConfigurationWizard />);
    
    // Fill basic form
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Select providers
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Enter credentials
    await waitFor(() => {
      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();
    });
    
    const discordTokenInput = screen.getByLabelText('Discord Bot Token');
    fireEvent.change(discordTokenInput, { target: { value: 'fake-token' } });
    const openaiKeyInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiKeyInput, { target: { value: 'fake-key' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Advance through environment
    await waitFor(() => {
      expect(screen.getByText('Configure deployment environment')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Deploy
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
    });
    
    const deployButton = screen.getByRole('button', { name: /deploy/i });
    await act(async () => {
      fireEvent.click(deployButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Bot "test-bot" created and deployed successfully!/)).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/webui/api/config/hot-reload', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  test('handles deploy error', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, message: 'Deployment failed' }),
      } as Response)
    ) as jest.Mock;

    render(<ConfigurationWizard />);
    
    // Fill basic form (abbreviated for test)
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();
    });
    
    const discordTokenInput = screen.getByLabelText('Discord Bot Token');
    fireEvent.change(discordTokenInput, { target: { value: 'fake-token' } });
    const openaiKeyInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiKeyInput, { target: { value: 'fake-key' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Configure deployment environment')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
    });
    
    const deployButton = screen.getByRole('button', { name: /deploy/i });
    await act(async () => {
      fireEvent.click(deployButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Deployment failed')).toBeInTheDocument();
    });
  });

  test('navigates back and forth between steps', async () => {
    render(<ConfigurationWizard />);
    
    // Enter bot name and advance
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Check we're on providers step
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    // Go back
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    
    // Check we're back on basics
    await waitFor(() => {
      expect(screen.getByLabelText('Bot Name')).toBeInTheDocument();
    });
    
    expect(botNameInput).toHaveValue('test-bot');
  });

  test('can click on completed steps', async () => {
    render(<ConfigurationWizard />);
    
    // Complete first step
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Complete second step
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Click back to first step via stepper
    const basicsStepLabel = screen.getByText('Basic Setup');
    const basicsStep = basicsStepLabel.closest('button');
    if (basicsStep) {
      fireEvent.click(basicsStep);
    }
    
    await waitFor(() => {
      expect(screen.getByLabelText('Bot Name')).toBeInTheDocument();
    });
  });

  test('shows loading state during deploy', async () => {
    // Mock fetch to be slow
    global.fetch = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => {
        resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }, 1000))
    ) as jest.Mock;

    render(<ConfigurationWizard />);
    
    // Fill form (abbreviated)
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();
    });
    
    const discordTokenInput = screen.getByLabelText('Discord Bot Token');
    fireEvent.change(discordTokenInput, { target: { value: 'fake-token' } });
    const openaiKeyInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiKeyInput, { target: { value: 'fake-key' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Configure deployment environment')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
    });
    
    const deployButton = screen.getByRole('button', { name: /deploy/i });
    await act(async () => {
      fireEvent.click(deployButton);
    });
    
    // Button should show loading state (wait a bit for the slow fetch)
    await waitFor(() => {
      expect(deployButton).toBeDisabled();
    }, { timeout: 1500 });
    
    // The loading text might be in the button or a separate element
    // For now, verify the fetch was called
    expect(global.fetch).toHaveBeenCalled();
  });

  test('handles network error during deploy', async () => {
    global.fetch = jest.fn(() => 
      Promise.reject(new Error('Network error'))
    ) as jest.Mock;

    render(<ConfigurationWizard />);
    
    // Fill form (abbreviated)
    const botNameInput = screen.getByLabelText('Bot Name');
    fireEvent.change(botNameInput, { target: { value: 'test-bot' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
    });
    
    const messageProviderSelect = screen.getByLabelText('Message Provider');
    fireEvent.change(messageProviderSelect, { target: { value: 'discord' } });
    const llmProviderSelect = screen.getByLabelText('LLM Provider');
    fireEvent.change(llmProviderSelect, { target: { value: 'openai' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Platform Configuration')).toBeInTheDocument();
    });
    
    const discordTokenInput = screen.getByLabelText('Discord Bot Token');
    fireEvent.change(discordTokenInput, { target: { value: 'fake-token' } });
    const openaiKeyInput = screen.getByLabelText('OpenAI API Key');
    fireEvent.change(openaiKeyInput, { target: { value: 'fake-key' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Configure deployment environment')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
    });
    
    const deployButton = screen.getByRole('button', { name: /deploy/i });
    await act(async () => {
      fireEvent.click(deployButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (global.fetch) {
      (global.fetch as jest.Mock).mockRestore();
    }
  });
});