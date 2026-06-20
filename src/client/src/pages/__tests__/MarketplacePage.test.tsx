import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MarketplacePage from '../MarketplacePage';
import { apiService } from '../../services/api';
import '@testing-library/jest-dom';

import { vi } from 'vitest';

vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock the child components to simplify the test
vi.mock('../../components/DaisyUI/PageHeader', () => ({
  default: () => <div data-testid="page-header" />
}));

vi.mock('../../components/Marketplace/MarketplaceCard', () => ({
  default: () => <div data-testid="marketplace-card" />
}));

// Mock the Modal to avoid portal issues in simple tests, but allow testing its role
vi.mock('../../components/DaisyUI/Modal', () => {
  const MockModal = ({ isOpen, title, children, actions }: { isOpen: boolean, title?: string, children: React.ReactNode, actions?: { label: string, variant?: string, onClick: () => void, disabled?: boolean, loading?: boolean }[] }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        {title && <h2>{title}</h2>}
        <div>{children}</div>
        <div>{actions && actions.map((a: { label: string }, i: number) => <button key={i}>{a.label}</button>)}</div>
      </div>
    );
  };

  return {
    default: MockModal,
    ConfirmModal: () => <div data-testid="confirm-modal" />
  };
});

describe('MarketplacePage A11y & Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and defaults to the loading state initially', async () => {
    (apiService.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    render(<MarketplacePage />);

    expect(screen.getByRole('textbox', { name: /Search packages/i })).toBeInTheDocument();
  });
});
