import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { useSuccessToast } from '../ToastNotification';

// Mock ToastNotification hooks
vi.mock('../ToastNotification', () => ({
  useSuccessToast: vi.fn(),
  useErrorToast: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock confirm - just in case
global.confirm = vi.fn();

describe('SettingsPage', () => {
  const mockSuccessToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSuccessToast as any).mockReturnValue(mockSuccessToast);
  });

  it('renders settings page', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });

  it('opens confirmation modal when Reset to Defaults is clicked', async () => {
    render(<SettingsPage />);

    // Open Advanced Settings
    const showAdvancedButton = screen.getByText(/Show/i);
    fireEvent.click(showAdvancedButton);

    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    // Check if modal title is displayed (Wait for it)
    await waitFor(() => {
        // Find the modal heading
        expect(screen.getAllByText('Reset Settings')[0]).toBeInTheDocument();
    });
    expect(screen.getByText(/Are you sure you want to reset/i)).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', async () => {
    render(<SettingsPage />);

    // Open Advanced Settings
    const showAdvancedButton = screen.getByText(/Show/i);
    fireEvent.click(showAdvancedButton);

    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getAllByText('Reset Settings')[0]).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal content should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Are you sure you want to reset/i)).not.toBeInTheDocument();
    });
  });

  it('calls success toast when settings are saved', () => {
    render(<SettingsPage />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(mockSuccessToast).toHaveBeenCalledWith('Settings saved!', 'Your preferences have been updated.');
  });
});
