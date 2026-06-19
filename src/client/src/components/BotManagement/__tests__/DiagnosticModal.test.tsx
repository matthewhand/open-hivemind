import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DiagnosticModal from '../DiagnosticModal';
import { apiService } from '../../../services/api';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../../../services/api', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

// Mock the generic DaisyUI Modal
vi.mock('../../DaisyUI/Modal', () => {
  return {
    default: ({ isOpen, children }: { isOpen: boolean, children: React.ReactNode }) => {
      if (!isOpen) return null;
      return <div data-testid="mock-modal">{children}</div>;
    }
  };
});

describe('DiagnosticModal Semantic Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with role="status"', async () => {
    // Keep it loading by not resolving immediately
    let resolveGet: (value: unknown) => void;
    const promise = new Promise(resolve => { resolveGet = resolve; });
    (apiService.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue(promise);

    render(<DiagnosticModal botId="1" botName="Bot" isOpen={true} onClose={() => {}} />);

    // Check loading block
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Running multi-point handshake tests/i)).toBeInTheDocument();
    });

    resolveGet!({ success: true, data: { messageProvider: { status: 'ok' }, llm: { status: 'ok' } } });
  });

  it('renders error state with role="alert"', async () => {
    (apiService.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network Error'));

    render(<DiagnosticModal botId="1" botName="Bot" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Network Error/i);
    });
  });
});
