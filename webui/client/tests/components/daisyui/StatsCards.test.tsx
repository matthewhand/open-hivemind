import React from 'react';
import { render, screen } from '@/test-utils';
import StatsCards from '@/components/DaisyUI/StatsCards';

describe('StatsCards Component', () => {
  const mockStats = [
    { title: 'Total Users', value: '1,200', change: '+5%' },
    { title: 'Revenue', value: '$50,000', change: '+10%' },
    { title: 'Active Sessions', value: '300', change: '-2%' }
  ];

  it('renders without crashing', () => {
    render(<StatsCards stats={mockStats} />);
    
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('displays all stat cards', () => {
    render(<StatsCards stats={mockStats} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('displays correct stat values', () => {
    render(<StatsCards stats={mockStats} />);
    
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('displays change indicators', () => {
    render(<StatsCards stats={mockStats} />);
    
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toBeInTheDocument();
    expect(screen.getByText('-2%')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<StatsCards stats={mockStats} className="custom-stats" />);
    
    const statsGroup = screen.getByRole('group');
    expect(statsGroup).toHaveClass('custom-stats');
  });

  it('handles empty stats array', () => {
    render(<StatsCards stats={[]} />);
    
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<StatsCards stats={mockStats} />);
    
    const statsGroup = screen.getByRole('group');
    expect(statsGroup).toHaveAttribute('aria-label', 'Statistics cards');
  });

  it('supports custom card layout', () => {
    render(<StatsCards stats={mockStats} cardLayout="vertical" />);
    
    const statsGroup = screen.getByRole('group');
    expect(statsGroup).toHaveClass('vertical-layout');
  });
});