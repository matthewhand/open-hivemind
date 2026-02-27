import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatsCards from '../StatsCards';

// Mock Web Animations API since it's not available in JSDOM
const mockAnimate = vi.fn().mockReturnValue({
  playState: 'finished',
  effect: {
    getComputedTiming: () => ({ progress: 1 }),
  },
  cancel: vi.fn(),
});

// Apply mock to HTMLElement prototype
Object.defineProperty(globalThis.HTMLElement.prototype, 'animate', {
  value: mockAnimate,
  writable: true,
});

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((callback) => {
  callback();
  return 0;
});
globalThis.cancelAnimationFrame = vi.fn();

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
    {
      id: 'stat4',
      title: 'Status',
      value: 'Active',
      icon: 'check',
      color: 'info' as const,
    },
  ];

  beforeEach(() => {
    mockAnimate.mockClear();
  });

  it('renders loading state correctly', () => {
    const { container } = render(<StatsCards stats={mockStats} isLoading={true} />);
    // Check for skeleton elements which usually have 'animate-pulse' class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders stats with correct titles', () => {
    render(<StatsCards stats={mockStats} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders string values directly', () => {
    render(<StatsCards stats={mockStats} />);
    // String value should render directly
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders changes correctly', () => {
    render(<StatsCards stats={mockStats} />);
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('vs last period')).toBeInTheDocument();
  });

  it('renders correct number of stat cards', () => {
    const { container } = render(<StatsCards stats={mockStats} />);
    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBe(mockStats.length);
  });

  it('uses Web Animations API for number values', () => {
    render(<StatsCards stats={mockStats} />);
    // Number stats should use the AnimatedCounter which calls animate()
    expect(mockAnimate).toHaveBeenCalled();
  });
});
