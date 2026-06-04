import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpecDetailPage from '../SpecDetailPage';

const mockUseSpec = vi.fn();
vi.mock('../../hooks/useSpec', () => ({
  __esModule: true,
  default: () => mockUseSpec(),
}));

const mockSuccessToast = vi.fn();
const mockErrorToast = vi.fn();
vi.mock('../../components/DaisyUI/ToastNotification', () => ({
  useSuccessToast: () => mockSuccessToast,
  useErrorToast: () => mockErrorToast,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/specs/demo']}>
      <SpecDetailPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSpec.mockReturnValue({
    spec: {
      id: 'demo',
      topic: 'Demo Spec',
      author: 'Ada',
      timestamp: new Date('2024-01-01').toISOString(),
      tags: ['x'],
      content: '# Demo',
    },
    loading: false,
    error: null,
  });
});

describe('SpecDetailPage share action', () => {
  it('copies the current URL to the clipboard and shows a success toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPage();
    fireEvent.click(screen.getByTestId('share-spec-button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(mockSuccessToast).toHaveBeenCalled();
    expect(mockErrorToast).not.toHaveBeenCalled();
  });

  it('shows an error toast when clipboard access fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderPage();
    fireEvent.click(screen.getByTestId('share-spec-button'));

    await waitFor(() => expect(mockErrorToast).toHaveBeenCalled());
    expect(mockSuccessToast).not.toHaveBeenCalled();
  });
});
