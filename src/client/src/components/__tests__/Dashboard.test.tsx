import { expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock DaisyUI components
vi.mock('../DaisyUI/Alert', () => ({
  Alert: ({ children, message }: { children?: React.ReactNode; message?: string }) => (
    <div className="alert">{message ?? children}</div>
  ),
}));

vi.mock('../DaisyUI/Button', () => ({
  default: ({ children, onClick, disabled, className, loading }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    loading?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled ?? loading} className={className} aria-busy={String(!!loading)}>
      {children}
    </button>
  ),
}));

vi.mock('../DaisyUI/Card', () => ({
  default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`card ${className || ''}`}>{children}</div>
  ),
}));

vi.mock('../DaisyUI/Hero', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div className="hero">{children}</div>,
}));

vi.mock('../DaisyUI/RadialProgress', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div className="radial-progress">{children}</div>,
}));

vi.mock('../DaisyUI/Skeleton', () => ({
  SkeletonCard: () => <div className="skeleton-card" />,
}));

vi.mock('../DaisyUI/Stat', () => ({
  Stat: ({ title, value, description, children }: {
    title?: React.ReactNode;
    value?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div className="stat">
      {title && <div className="stat-title">{title}</div>}
      {value !== undefined && <div className="stat-value">{value}</div>}
      {description && <div className="stat-desc">{description}</div>}
      {children}
    </div>
  ),
  Stats: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`stats ${className || ''}`}>{children}</div>
  ),
}));

vi.mock('../DaisyUI/Badge', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span className="badge">{children}</span>,
}));

vi.mock('../DashboardBotCard', () => ({
  default: ({ bot }: { bot: { name: string } }) => (
    <div data-testid={`bot-card-${bot.name}`}>{bot.name}</div>
  ),
}));

vi.mock('../Dashboard/AgentGrid', () => ({
  default: () => <div data-testid="agent-grid">AgentGrid</div>,
}));

vi.mock('../Monitoring/CommandCenterStream', () => ({
  default: () => <div data-testid="command-center-stream">CommandCenterStream</div>,
}));

vi.mock('../DaisyUI/ToastNotification', () => ({
  useSuccessToast: vi.fn(() => vi.fn()),
  useErrorToast: vi.fn(() => vi.fn()),
  useToast: vi.fn(() => ({ addToast: vi.fn(), removeToast: vi.fn() })),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowUp: () => <span>up</span>,
  ArrowDown: () => <span>down</span>,
  RefreshCw: () => <span>refresh</span>,
  Save: () => <span>save</span>,
  Settings2: () => <span>settings</span>,
  Plus: () => <span>plus</span>,
  Bot: () => <span>bot-icon</span>,
}));

function setupDefaultMocks() {
  (apiService.get as any).mockImplementation((url: string) => {
    if (url === '/api/webui/config') return Promise.resolve({ success: false });
    if (url === '/api/health') return Promise.resolve(null);
    return Promise.resolve(null);
  });
  (apiService.post as any).mockResolvedValue({ success: true });
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders the Dashboard header after data loads', async () => {
    (apiService.getConfig as any).mockResolvedValue({
      bots: [],
      warnings: [],
      environment: 'development',
    });
    (apiService.getStatus as any).mockResolvedValue({ bots: [], uptime: 0 });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hivemind Dashboard')).toBeInTheDocument();
    });
  });

  it('shows "No agents yet" when no bots are configured', async () => {
    (apiService.getConfig as any).mockResolvedValue({
      bots: [],
      warnings: [],
      environment: 'development',
    });
    (apiService.getStatus as any).mockResolvedValue({ bots: [], uptime: 0 });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No agents yet')).toBeInTheDocument();
    });
  });

  it('shows bot cards when bots are configured', async () => {
    const mockBots = [
      { name: 'TestBot', messageProvider: 'discord', llmProvider: 'openai' },
    ];
    (apiService.getConfig as any).mockResolvedValue({
      bots: mockBots,
      warnings: [],
      environment: 'development',
    });
    (apiService.getStatus as any).mockResolvedValue({
      bots: [{ id: undefined, name: 'TestBot', status: 'active', connected: true }],
      uptime: 100,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bot-card-TestBot')).toBeInTheDocument();
    });
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

    // Status mock: 2 active bots, 150 total messages
    (apiService.getStatus as any).mockResolvedValue({
      bots: [
        { name: 'Bot1', status: 'active', connected: true, messageCount: 100, errorCount: 2 },
        { name: 'Bot2', status: 'active', connected: false, messageCount: 50, errorCount: 3 },
        { name: 'Bot3', status: 'inactive', connected: false, messageCount: 0, errorCount: 0 },
      ],
      uptime: 100,
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Hivemind Dashboard')).toBeInTheDocument();
    });

    // Active count: 2 (Bot1 and Bot2 are 'active')
    const activeStatValues = screen.getAllByText('2');
    expect(activeStatValues.length).toBeGreaterThan(0);

    // Message volume: 150 (100 + 50)
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});
