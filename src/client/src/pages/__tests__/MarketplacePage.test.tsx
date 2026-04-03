import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import MarketplacePage from '../MarketplacePage';
import { apiService } from '../../services/api';
import { vi } from 'vitest';

vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn().mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/marketplace/packages') return [];
      return {};
    }),
    post: vi.fn(),
  },
}));

vi.mock('../../hooks/useUrlParams', () => ({
  default: vi.fn(() => ({
    values: { search: '' },
    setValue: vi.fn(),
  })),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual };
});

// Mock ResizeObserver for react-virtual
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React 19 unmount state-update warnings from async fetch
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <MemoryRouter>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    );

  it('renders page title and description', async () => {
    renderWithProviders(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText(/Package Marketplace/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse, install, and manage provider packages/i)).toBeInTheDocument();
    });
  });
});
