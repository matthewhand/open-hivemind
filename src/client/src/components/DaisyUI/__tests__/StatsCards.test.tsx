import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatsCards from '../StatsCards';

// Mock Lucide icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  Bot: () => <div data-testid="icon-bot" />,
  MessageCircle: () => <div data-testid="icon-message" />,
  CheckCircle: () => <div data-testid="icon-check" />,
  Clock: () => <div data-testid="icon-clock" />,
  Server: () => <div data-testid="icon-server" />,
  Zap: () => <div data-testid="icon-zap" />,
  HardDrive: () => <div data-testid="icon-harddrive" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  TrendingDown: () => <div data-testid="icon-trending-down" />,
  Minus: () => <div data-testid="icon-minus" />,
  Users: () => <div data-testid="icon-users" />,
  Activity: () => <div data-testid="icon-activity" />,
  Settings: () => <div data-testid="icon-settings" />,
  Database: () => <div data-testid="icon-database" />,
  Wifi: () => <div data-testid="icon-wifi" />,
}));

describe('StatsCards Component', () => {
  const mockStats = [
    {
      id: 'stat1',
      title: 'Total Users',
      value: 1000,
      icon: 'users',
      color: 'primary' as const,
    },
    {
      id: 'stat2',
      title: 'Revenue',
      value: 50000,
      change: 10,
      changeType: 'increase' as const,
      icon: 'activity',
      color: 'success' as const,
    },
    {
      id: 'stat3',
      title: 'Errors',
      value: 0,
      icon: 'alert',
      color: 'error' as const,
    },
  ];

  it('renders loading state correctly', () => {
    const { container } = render(<StatsCards stats={mockStats} isLoading={true} />);
    // Check for skeleton elements which usually have 'animate-pulse' class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders stats with correct titles', async () => {
    render(<StatsCards stats={mockStats} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('renders stat values (eventually)', async () => {
    // We cannot easily mock framer-motion's internal loop with just fake timers in this setup
    // without more extensive mocking of requestAnimationFrame and performance.now.
    // However, since we are testing the component logic, we can check if the correct values
    // are rendered eventually.

    // For this test, we can mock the animate function from framer-motion to immediately
    // update the value, or use waitFor.

    render(<StatsCards stats={mockStats} />);

    // Wait for the animation to complete (it takes 1s in the component)
    // In a real browser, this would animate. In JSDOM/Node with framer-motion default,
    // it might need some time.

    // Actually, let's just wait for the final text.
    // 1000 -> 1.0K
    await screen.findByText('1.0K', {}, { timeout: 2000 });
    // 50000 -> 50.0K
    await screen.findByText('50.0K', {}, { timeout: 2000 });
    // 0 -> 0
    await screen.findByText('0', {}, { timeout: 2000 });
  });

  it('renders changes correctly', () => {
      render(<StatsCards stats={mockStats} />);
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('vs last period')).toBeInTheDocument();
  });
});
