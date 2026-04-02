import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PluginSecurityPage from '../../../../src/client/src/pages/PluginSecurityPage';

// Mock fetch
global.fetch = jest.fn();

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
    render(<PluginSecurityPage />);

    expect(screen.getByText('Plugin Security Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('Monitor and manage security settings for all installed plugins')
    ).toBeInTheDocument();
  });

  it('should fetch and display plugin security status', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
      expect(screen.getByText('community-plugin')).toBeInTheDocument();
      expect(screen.getByText('untrusted-plugin')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/plugins/security');
  });

  it('should display statistics correctly', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total
      expect(screen.getByText('2')).toBeInTheDocument(); // Trusted
      expect(screen.getByText('1')).toBeInTheDocument(); // Untrusted or Built-in or Failed
    });
  });

  it('should filter plugins by trust level', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
    });

    // Click on "Trusted" filter
    const trustedTab = screen.getByRole('button', { name: /Trusted/i });
    fireEvent.click(trustedTab);

    await waitFor(() => {
      expect(screen.getByText('llm-openai')).toBeInTheDocument();
      expect(screen.getByText('community-plugin')).toBeInTheDocument();
      expect(screen.queryByText('untrusted-plugin')).not.toBeInTheDocument();
    });
  });

  it('should filter plugins by untrusted status', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('untrusted-plugin')).toBeInTheDocument();
    });

    // Click on "Untrusted" filter
    const untrustedTab = screen.getByRole('button', { name: /^Untrusted$/i });
    fireEvent.click(untrustedTab);

    await waitFor(() => {
      expect(screen.queryByText('llm-openai')).not.toBeInTheDocument();
      expect(screen.queryByText('community-plugin')).not.toBeInTheDocument();
      expect(screen.getByText('untrusted-plugin')).toBeInTheDocument();
    });
  });

  it('should display error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load plugin security status/i)).toBeInTheDocument();
    });
  });

  it('should show no plugins message when list is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { plugins: [] } }),
    });

    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('No plugins found')).toBeInTheDocument();
    });
  });

  it('should display built-in badge for built-in plugins', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      const builtInBadges = screen.getAllByText('Built-in');
      expect(builtInBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display signature status badges', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Invalid')).toBeInTheDocument();
      expect(screen.getByText('No Signature')).toBeInTheDocument();
    });
  });

  it('should show action buttons for non-built-in plugins', async () => {
    render(<PluginSecurityPage />);

    await waitFor(() => {
      const reverifyButtons = screen.getAllByLabelText(/Re-verify/i);
      // Should have Re-verify buttons for 2 non-built-in plugins
      expect(reverifyButtons.length).toBe(2);
    });
  });

  it('should not show action buttons for built-in plugins', async () => {
    render(<PluginSecurityPage />);

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

    render(<PluginSecurityPage />);

    await waitFor(() => {
      expect(screen.getByText('community-plugin')).toBeInTheDocument();
    });

    const reverifyButtons = screen.getAllByLabelText(/Re-verify/i);
    fireEvent.click(reverifyButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/plugins/community-plugin/verify',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should refresh plugin list when refresh button is clicked', async () => {
    render(<PluginSecurityPage />);

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
