import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MCPServerManager from '../MCPServerManager';
import { apiService } from '../../services/api';

// Mock apiService
vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Lightweight DataTable mock that surfaces the `data` rows it receives so we can
// assert the component parsed the API envelope into the right shape.
vi.mock('../DaisyUI/DataTable', () => ({
  __esModule: true,
  default: ({ data }: { data: Array<{ name: string; serverUrl: string; connected: boolean }> }) => (
    <div data-testid="data-table">
      {data.map((row) => (
        <div key={row.name} data-testid="server-row">
          {row.name}|{row.serverUrl}|{row.connected ? 'connected' : 'disconnected'}
        </div>
      ))}
    </div>
  ),
}));

describe('MCPServerManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders servers from the nested data.data.servers envelope returned by the API', async () => {
    // This mirrors the real /api/admin/mcp-servers response: an envelope with
    // `data.servers` as an ARRAY (not an object keyed by name).
    vi.mocked(apiService.get).mockResolvedValue({
      success: true,
      data: {
        servers: [
          { name: 'alpha', serverUrl: 'https://alpha.example.com', connected: true },
        ],
        configurations: [
          { name: 'beta', serverUrl: 'https://beta.example.com' },
        ],
      },
      message: 'ok',
    } as never);

    render(<MCPServerManager />);

    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('server-row').map((el) => el.textContent);
    // Connected server parsed from data.data.servers
    expect(rows).toContain('alpha|https://alpha.example.com|connected');
    // Stored-but-not-connected config parsed from data.data.configurations
    expect(rows).toContain('beta|https://beta.example.com|disconnected');
  });

  it('renders no rows when the servers array is empty', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      success: true,
      data: { servers: [], configurations: [] },
      message: 'ok',
    } as never);

    render(<MCPServerManager />);

    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    expect(screen.queryAllByTestId('server-row')).toHaveLength(0);
  });
});
