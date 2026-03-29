import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MobileBottomNav from '../MobileBottomNav';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/admin/overview' }),
}));

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders all default navigation items', () => {
    render(
      <BrowserRouter>
        <MobileBottomNav />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('Overview')).toBeInTheDocument();
    expect(screen.getByLabelText('Bots')).toBeInTheDocument();
    expect(screen.getByLabelText('Providers')).toBeInTheDocument();
    expect(screen.getByLabelText('Activity')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('navigates to correct path on button click', () => {
    render(
      <BrowserRouter>
        <MobileBottomNav />
      </BrowserRouter>
    );

    const botsButton = screen.getByLabelText('Bots');
    fireEvent.click(botsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/bots');
  });

  it('applies active styles to current page', () => {
    render(
      <BrowserRouter>
        <MobileBottomNav />
      </BrowserRouter>
    );

    const overviewButton = screen.getByLabelText('Overview');
    expect(overviewButton).toHaveClass('text-primary');
  });

  it('displays badge when provided', () => {
    const customItems = [
      {
        id: 'notifications',
        label: 'Notifications',
        icon: <span>🔔</span>,
        path: '/notifications',
        badge: 5,
      },
    ];

    render(
      <BrowserRouter>
        <MobileBottomNav items={customItems} />
      </BrowserRouter>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('meets minimum touch target size (44x44px)', () => {
    render(
      <BrowserRouter>
        <MobileBottomNav />
      </BrowserRouter>
    );

    const overviewButton = screen.getByLabelText('Overview');
    expect(overviewButton).toHaveClass('min-h-[44px]');
    expect(overviewButton).toHaveClass('min-w-[44px]');
  });

  it('has proper ARIA attributes', () => {
    render(
      <BrowserRouter>
        <MobileBottomNav />
      </BrowserRouter>
    );

    const nav = screen.getByRole('navigation', { name: 'Bottom navigation' });
    expect(nav).toBeInTheDocument();

    const overviewButton = screen.getByLabelText('Overview');
    expect(overviewButton).toHaveAttribute('aria-current', 'page');
  });
});
