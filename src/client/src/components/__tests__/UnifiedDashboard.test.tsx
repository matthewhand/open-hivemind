// Jest provides describe, it, expect, beforeEach as globals
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import UnifiedDashboard from '../UnifiedDashboard';
import { apiService } from '../../services/api';
import { vi } from 'vitest';

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
  StatsCards: () => <div className="stats-cards">Stats</div>,
  ToastNotification: {
    useSuccessToast: () => vi.fn(),
    useErrorToast: () => vi.fn(),
    Notifications: () => <div>Notifications</div>,
  },
  LoadingSpinner: () => <div className="loading-spinner">Loading...</div>,
}));

// Mock CreateBotWizard
vi.mock('../BotManagement/CreateBotWizard', () => ({
  CreateBotWizard: () => <div data-testid="create-bot-wizard">Create Bot Wizard</div>,
}));

describe('UnifiedDashboard', () => {
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

    // When bots are configured, the Getting Started tab content is not in the document
    await waitFor(() => {
        // Use toBeVisible if the element remains in DOM but hidden
        // Or if it's conditional rendering, ensure state update has propagated
        const welcomeElement = screen.queryByText('Welcome to Open Hivemind');
        if (welcomeElement) {
            expect(welcomeElement).not.toBeVisible();
        } else {
            expect(welcomeElement).toBeNull();
        }
    });
    // The Status tab is active (verified above) - this confirms correct default behavior
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
