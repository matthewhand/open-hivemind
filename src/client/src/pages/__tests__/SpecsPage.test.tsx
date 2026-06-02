import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpecsPage from '../SpecsPage';

// --- Mocks ---------------------------------------------------------------

const mockRefetch = vi.fn().mockResolvedValue(undefined);
const mockUseSpecs = vi.fn();
vi.mock('../../hooks/useSpecs', () => ({
  __esModule: true,
  default: () => mockUseSpecs(),
}));

const mockPost = vi.fn();
vi.mock('../../services/api', () => ({
  apiService: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockSuccessToast = vi.fn();
const mockErrorToast = vi.fn();
vi.mock('../../components/DaisyUI/ToastNotification', () => ({
  useSuccessToast: () => mockSuccessToast,
  useErrorToast: () => mockErrorToast,
}));

// Render the Modal inline (and its actions) without the <dialog> showModal machinery.
vi.mock('../../components/DaisyUI/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, title, children, actions = [] }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
        {actions.map((a: any) => (
          <button key={a.label} onClick={a.onClick} disabled={a.disabled || a.loading}>
            {a.label}
          </button>
        ))}
      </div>
    ) : null,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <SpecsPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSpecs.mockReturnValue({
    specs: [],
    loading: false,
    error: null,
    refetch: mockRefetch,
  });
});

describe('SpecsPage create specification', () => {
  it('opens the create modal when "Add Specification" is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('add-spec-button'));
    expect(screen.getByTestId('create-spec-form')).toBeInTheDocument();
  });

  it('validates that a topic is required', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('add-spec-button'));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockErrorToast).toHaveBeenCalledWith('Topic required', expect.any(String));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('POSTs a new specification to /api/specs and refetches on success', async () => {
    mockPost.mockResolvedValue({ success: true });
    renderPage();

    fireEvent.click(screen.getByTestId('add-spec-button'));
    fireEvent.change(screen.getByTestId('spec-topic-input'), {
      target: { value: 'My New Spec' },
    });
    fireEvent.change(screen.getByTestId('spec-author-input'), {
      target: { value: 'Ada' },
    });
    fireEvent.change(screen.getByTestId('spec-tags-input'), {
      target: { value: 'alpha, beta' },
    });
    fireEvent.change(screen.getByTestId('spec-content-input'), {
      target: { value: '# Heading' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));

    const [endpoint, payload] = mockPost.mock.calls[0];
    expect(endpoint).toBe('/api/specs');
    expect(payload).toMatchObject({
      id: 'my-new-spec',
      topic: 'My New Spec',
      author: 'Ada',
      tags: ['alpha', 'beta'],
      version: '1.0.0',
      content: '# Heading',
    });
    expect(typeof payload.timestamp).toBe('string');

    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
    expect(mockSuccessToast).toHaveBeenCalled();
  });

  it('shows an error toast and does not close when the API fails', async () => {
    mockPost.mockResolvedValue({ success: false, error: 'boom' });
    renderPage();

    fireEvent.click(screen.getByTestId('add-spec-button'));
    fireEvent.change(screen.getByTestId('spec-topic-input'), {
      target: { value: 'Doomed Spec' },
    });
    fireEvent.change(screen.getByTestId('spec-content-input'), {
      target: { value: 'content' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(mockErrorToast).toHaveBeenCalledWith('Failed to create specification', 'boom')
    );
    expect(mockRefetch).not.toHaveBeenCalled();
    // Modal stays open
    expect(screen.getByTestId('create-spec-form')).toBeInTheDocument();
  });
});
