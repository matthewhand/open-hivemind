/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import PluginSecurityPage from '../../../../src/client/src/pages/PluginSecurityPage';

// Mock fetch (authFetch delegates to global fetch internally)
global.fetch = jest.fn();

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('PluginSecurityPage', () => {
  const mockPlugins = [
    {
      pluginName: 'llm-openai',
      trustLevel: 'trusted' as const,
      isBuiltIn: true,
      signatureValid: null,
      grantedCapabilities: ['network', 'llm'],
      deniedCapabilities: [],
      requiredCapabilities: ['network', 'llm'],
    },
    {
      pluginName: 'community-plugin',
      trustLevel: 'trusted' as const,
      isBuiltIn: false,
      signatureValid: true,
      grantedCapabilities: ['network'],
      deniedCapabilities: [],
      requiredCapabilities: ['network'],
    },
    {
      pluginName: 'untrusted-plugin',
      trustLevel: 'untrusted' as const,
      isBuiltIn: false,
      signatureValid: false,
      grantedCapabilities: [],
      deniedCapabilities: ['database'],
      requiredCapabilities: ['database'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { plugins: mockPlugins } }),
    });
  });

  it('should render the page title and description', async () => {
    renderWithRouter(<PluginSecurityPage />);

    expect(screen.getByText('Plugin Security Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('Monitor and manage security settings for all installed plugins')
    ).toBeInTheDocument();
  });

  it('should fetch and display plugin security status', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
      expect(screen.getByText('community-plugin')).toBeInTheDocument();
      expect(screen.getByText('untrusted-plugin')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/plugins/security', expect.any(Object));
  });

  it('should display statistics correctly', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      // Stats cards show numeric counts; some numbers appear in multiple stat cards
      const threes = screen.getAllByText('3');
      expect(threes.length).toBeGreaterThanOrEqual(1); // Total
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThanOrEqual(1); // Trusted
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThanOrEqual(1); // Untrusted/Built-in/Failed
    });
  });

  it('should filter plugins by trust level', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
    });

    // Click on "Trusted" filter
    const trustedTab = screen.getByRole('tab', { name: /^Trusted$/i });
    fireEvent.click(trustedTab);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
      expect(screen.getByText('community-plugin')).toBeInTheDocument();
      expect(screen.queryByText('untrusted-plugin')).not.toBeInTheDocument();
    });
  });

  it('should filter plugins by untrusted status', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('untrusted-plugin')).toBeInTheDocument();
    });

    // Click on "Untrusted" filter
    const untrustedTab = screen.getByRole('tab', { name: /^Untrusted$/i });
    fireEvent.click(untrustedTab);

    await waitFor(() => {
      expect(screen.queryByText('llm-openai')).not.toBeInTheDocument();
      expect(screen.queryByText('community-plugin')).not.toBeInTheDocument();
      expect(screen.getByText('untrusted-plugin')).toBeInTheDocument();
    });
  });

  it('should display error message when fetch fails', async () => {
    // Reset all mocks and set fetch to reject for this test
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch plugin security status/i)).toBeInTheDocument();
    });
  });

  it('should show no plugins message when list is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { plugins: [] } }),
    });

    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('No plugins found')).toBeInTheDocument();
    });
  });

  it('should display built-in badge for built-in plugins', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      const builtInBadges = screen.getAllByText('Built-in');
      expect(builtInBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display signature status badges', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Invalid')).toBeInTheDocument();
      expect(screen.getByText('No Signature')).toBeInTheDocument();
    });
  });

  it('should show action buttons for non-built-in plugins', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      const reverifyButtons = screen.getAllByLabelText(/^Verify /i);
      // Should have Re-verify buttons for 2 non-built-in plugins
      expect(reverifyButtons.length).toBe(2);
    });
  });

  it('should not show action buttons for built-in plugins', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
    });

    // Built-in plugins should show a message instead of buttons
    expect(screen.getByText('Built-in plugins are always trusted')).toBeInTheDocument();
  });

  it('should handle verify action', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { plugins: mockPlugins } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Plugin verified' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { plugins: mockPlugins } }),
      });

    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('community-plugin')).toBeInTheDocument();
    });

    const reverifyButtons = screen.getAllByLabelText(/^Verify /i);
    fireEvent.click(reverifyButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/community-plugin/verify',
        expect.objectContaining({ method: 'POST', headers: expect.any(Object) })
      );
    });
  });

  it('should refresh plugin list when refresh button is clicked', async () => {
    renderWithRouter(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText(/Refresh plugin security status/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });
});
