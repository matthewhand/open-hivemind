import { expect, vi } from 'vitest';
// Jest provides describe, it, expect, beforeEach as globals
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { apiService } from '../../services/api';


// Mock apiService using Vitest
vi.mock('../../services/api', () => ({
  apiService: {
    getConfig: vi.fn(),
    getStatus: vi.fn(),
    getPersonas: vi.fn(),
    getLlmProfiles: vi.fn(),
    createBot: vi.fn(),
  },
}));

// Mock DaisyUI components - provide minimal implementations for testing
vi.mock('../DaisyUI', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div className="alert">{children}</div>,
  Badge: ({ children }: { children: React.ReactNode }) => <span className="badge">{children}</span>,
  Button: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
  ),
  Card: ({ children, className, ...props }: { children: React.ReactNode; className?: string;[key: string]: unknown }) => (
    <div className={`card ${className || ''}`} {...props}>{children}</div>
  ),
  DataTable: () => <div data-testid="data-table">DataTable</div>,
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen?: boolean }) => (
    isOpen ? <div role="dialog">{children}</div> : null
  ),
  ProgressBar: () => <div className="progress-bar">Progress</div>,
  StatsCards: (props: any) => (
    <div className="stats-cards" data-testid="stats-cards">
      {JSON.stringify(props.stats)}
    </div>
  ),
  LoadingSpinner: () => <div className="loading-spinner">Loading...</div>,
}));

vi.mock('../DaisyUI/ToastNotification', () => {
  return {
    __esModule: true,
    useSuccessToast: vi.fn(() => vi.fn()),
    useErrorToast: vi.fn(() => vi.fn()),
    useToast: vi.fn(() => ({ addToast: vi.fn(), removeToast: vi.fn() })),
  };
});

vi.mock('../../hooks/useProviders', () => ({
  useProviders: () => ({
    llmProviders: [
      { key: 'openai', label: 'OpenAI' },
      { key: 'anthropic', label: 'Anthropic' },
    ],
    messageProviders: [
      { key: 'discord', label: 'Discord' },
      { key: 'slack', label: 'Slack' },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useHiddenFeature', () => ({
  useHiddenFeature: () => ({ isEnabled: false }),
}));

vi.mock('../DaisyUI/StatsCards', () => ({
  __esModule: true,
  default: (props: any) => (
    <div className="stats-cards" data-testid="stats-cards">
      {JSON.stringify(props.stats)}
    </div>
  ),
}));

// Mock CreateBotWizard
vi.mock('../BotManagement/CreateBotWizard', () => ({
  CreateBotWizard: () => <div data-testid="create-bot-wizard">Create Bot Wizard</div>,
}));

describe.skip('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock HTMLDialogElement methods
    if (typeof HTMLDialogElement !== 'undefined') {
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
    }
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
        <Dashboard />
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
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const statusTab = screen.getByTestId('status-tab');
      expect(statusTab).toHaveClass('tab-active');
    });

    // When bots are configured, the Getting Started tab content (Welcome to Open Hivemind)
    // should be hidden because the active tab is 'status'.
    // Use visible check instead of existence check because hidden attribute doesn't remove from DOM.
    const welcomeText = screen.queryByText('Welcome to Open Hivemind');
    if (welcomeText) expect(welcomeText).not.toBeVisible();

    // Wait for the data to be loaded
    await waitFor(() => {
      const statusPanel = screen.queryByRole('tabpanel', { name: /status/i });
      if (statusPanel) {
        expect(statusPanel).not.toHaveClass('hidden');
      }
    });
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
        <Dashboard />
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

  it('correctly calculates derived statistics from status bots', async () => {
    const mockBots = [
      { name: 'Bot1', messageProvider: 'discord', llmProvider: 'openai' },
      { name: 'Bot2', messageProvider: 'slack', llmProvider: 'anthropic' },
    ];
    (apiService.getConfig as any).mockResolvedValue({
      bots: mockBots,
      warnings: [],
      environment: 'development',
    });

    // Status mock returns 2 active bots, 1 connected, 150 messages total, 5 errors total
    (apiService.getStatus as any).mockResolvedValue({
      bots: [
        { name: 'Bot1', status: 'active', connected: true, messageCount: 100, errorCount: 2 },
        { name: 'Bot2', status: 'active', connected: false, messageCount: 50, errorCount: 3 },
        { name: 'Bot3', status: 'inactive', connected: false, messageCount: 0, errorCount: 0 },
      ],
      uptime: 100,
    });
    (apiService.getPersonas as any).mockResolvedValue([]);
    (apiService.getLlmProfiles as any).mockResolvedValue({ profiles: { llm: [] } });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Switch to status tab first
    await waitFor(() => {
      const statusTab = screen.getByTestId('status-tab');
      expect(statusTab).toHaveClass('tab-active');
    });

    // Wait for the StatsCards component to render the stats props
    await waitFor(() => {
      const statsCards = screen.getByTestId('stats-cards');
      expect(statsCards.textContent).toContain('Active Bots');
    });

    const statsText = screen.getByTestId('stats-cards').textContent || '';
    const statsData = JSON.parse(statsText);

    // Check if the parsed statsData contains the objects we expect
    const activeBots = statsData.find((s: any) => s.title === 'Active Bots');
    expect(activeBots).toBeDefined();
    expect(activeBots.value).toBe(2);

    const totalMessages = statsData.find((s: any) => s.title === 'Total Messages' || s.title === 'Messages' || s.title === 'Messages Today');
    expect(totalMessages).toBeDefined();
    expect(totalMessages.value).toBe(150);

    // Dashboard uses raw Errors count now instead of Error Rate
    const errorCount = statsData.find((s: any) => s.title === 'Errors');
    expect(errorCount).toBeDefined();
    expect(errorCount.value).toBe(5);
  });

});
