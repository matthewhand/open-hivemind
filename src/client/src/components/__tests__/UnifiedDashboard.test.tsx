import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import UnifiedDashboard from '../UnifiedDashboard';
import { apiService } from '../../services/api';

// Mock apiService
vi.mock('../../services/api', () => ({
  apiService: {
    getConfig: vi.fn(),
    getStatus: vi.fn(),
    getPersonas: vi.fn(),
    getLlmProfiles: vi.fn(),
    createBot: vi.fn(),
  },
}));

// Mock ToastNotification
vi.mock('../DaisyUI', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ToastNotification: {
      useSuccessToast: () => vi.fn(),
      useErrorToast: () => vi.fn(),
      Notifications: () => <div>Notifications</div>,
    },
  };
});

// Mock CreateBotWizard
vi.mock('../BotManagement/CreateBotWizard', () => ({
  CreateBotWizard: () => <div data-testid="create-bot-wizard">Create Bot Wizard</div>,
}));

describe('UnifiedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock HTMLDialogElement methods
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it('renders "Getting Started" tab by default when no bots are configured', async () => {
    (apiService.getConfig as any).mockResolvedValue({
      bots: [],
      warnings: [],
      environment: 'development',
    });
    (apiService.getStatus as any).mockResolvedValue({ bots: [], uptime: 0 });
    (apiService.getPersonas as any).mockResolvedValue([]);
    (apiService.getLlmProfiles as any).mockResolvedValue({ profiles: { llm: [] } });

    render(
      <BrowserRouter>
        <UnifiedDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const gettingStartedTab = screen.getByTestId('getting-started-tab');
      expect(gettingStartedTab).toHaveClass('tab-active');
    });

    expect(screen.getByText('Welcome to Open Hivemind')).toBeInTheDocument();
    expect(screen.getByText('No valid configuration found')).toBeInTheDocument();
  });

  it('renders "Status" tab by default when bots are configured', async () => {
    const mockBots = [{ name: 'TestBot', messageProvider: 'discord', llmProvider: 'openai' }];
    (apiService.getConfig as any).mockResolvedValue({
      bots: mockBots,
      warnings: [],
      environment: 'development',
    });
    (apiService.getStatus as any).mockResolvedValue({
      bots: [{ name: 'TestBot', status: 'active', connected: true }],
      uptime: 100,
    });
    (apiService.getPersonas as any).mockResolvedValue([]);
    (apiService.getLlmProfiles as any).mockResolvedValue({ profiles: { llm: [] } });

    render(
      <BrowserRouter>
        <UnifiedDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const statusTab = screen.getByTestId('status-tab');
      expect(statusTab).toHaveClass('tab-active');
    });

    expect(screen.queryByText('Welcome to Open Hivemind')).not.toBeVisible();
    expect(screen.getByText('Bot Status')).toBeInTheDocument();
  });

  it('allows switching tabs', async () => {
    (apiService.getConfig as any).mockResolvedValue({
      bots: [],
      warnings: [],
      environment: 'development',
    });
    (apiService.getStatus as any).mockResolvedValue({ bots: [], uptime: 0 });
    (apiService.getPersonas as any).mockResolvedValue([]);
    (apiService.getLlmProfiles as any).mockResolvedValue({ profiles: { llm: [] } });

    render(
      <BrowserRouter>
        <UnifiedDashboard />
      </BrowserRouter>
    );

    // Initial state: Getting Started
    await waitFor(() => {
      expect(screen.getByTestId('getting-started-tab')).toHaveClass('tab-active');
    });

    // Switch to Status
    fireEvent.click(screen.getByTestId('status-tab'));
    expect(screen.getByTestId('status-tab')).toHaveClass('tab-active');
    expect(screen.getByTestId('getting-started-tab')).not.toHaveClass('tab-active');

    // Switch to Performance
    fireEvent.click(screen.getByTestId('performance-tab'));
    expect(screen.getByTestId('performance-tab')).toHaveClass('tab-active');
  });
});
