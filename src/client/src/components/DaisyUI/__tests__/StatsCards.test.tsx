import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsCards from '../StatsCards';

// Mock framer-motion to avoid timing-dependent tests
const mockStop = jest.fn();

jest.mock('framer-motion', () => ({
  animate: (from: number, to: number, options: { duration?: number; onUpdate?: (v: number) => void; onComplete?: () => void }) => {
    // Immediately call onUpdate with the target value and onComplete
    // This makes tests deterministic and not dependent on animation timing
    if (options?.onUpdate) {
      options.onUpdate(to);
    }
    if (options?.onComplete) {
      options.onComplete();
    }

    return {
      stop: mockStop,
    };
  },
}));

// Mock Lucide icons to avoid rendering issues
jest.mock('lucide-react', () => ({
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
      title: 'String Value',
      value: '99.9%',
      icon: 'check',
      color: 'primary' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.getByText('String Value')).toBeInTheDocument();
  });

  it('renders stat values correctly (with mocked animation)', () => {
    render(<StatsCards stats={mockStats} />);

    // With mocked framer-motion, values should be rendered immediately
    // 1000 -> 1.0K
    expect(screen.getByText('1.0K')).toBeInTheDocument();
    // 50000 -> 50.0K
    expect(screen.getByText('50.0K')).toBeInTheDocument();
    // 0 -> 0
    expect(screen.getByText('0')).toBeInTheDocument();
    // String value should render as-is
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });

  it('renders changes correctly', () => {
    render(<StatsCards stats={mockStats} />);
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('vs last period')).toBeInTheDocument();
  });

  it('renders icons correctly', () => {
    render(<StatsCards stats={mockStats} />);
    expect(screen.getByTestId('icon-users')).toBeInTheDocument();
    expect(screen.getByTestId('icon-activity')).toBeInTheDocument();
    expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('handles empty stats array', () => {
    const { container } = render(<StatsCards stats={[]} />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatsCards stats={mockStats} className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
