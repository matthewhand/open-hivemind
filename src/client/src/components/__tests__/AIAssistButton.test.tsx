import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIAssistButton from '../AIAssistButton';
import { apiService } from '../../services/api';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../services/api', () => ({
  apiService: {
    post: vi.fn(),
  },
}));

// Mock the toast hooks
vi.mock('../DaisyUI/ToastNotification', () => ({
  useWarningToast: () => vi.fn(),
}));

describe('AIAssistButton', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and has aria-label', () => {
    render(<AIAssistButton prompt="Test prompt" onSuccess={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Generate with AI' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('updates aria attributes and live region during loading and handles success', async () => {
    const onSuccess = vi.fn();
    (apiService.post as any).mockResolvedValueOnce({ result: 'Generated text' });

    render(<AIAssistButton prompt="Test prompt" onSuccess={onSuccess} />);
    const button = screen.getByRole('button', { name: 'Generate with AI' });

    fireEvent.click(button);

    // Immediate state check
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Generating with AI...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('Generated text');
    });

    // Post-resolve state check
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('announces error state to live region on failure', async () => {
    (apiService.post as any).mockRejectedValueOnce(new Error('Network error'));

    render(<AIAssistButton prompt="Test prompt" onSuccess={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Generate with AI' });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Failed to generate')).toBeInTheDocument();
    });

    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'false');
  });
});
