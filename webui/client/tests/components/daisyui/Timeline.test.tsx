import React from 'react';
import { render, screen } from '@/test-utils';
import Timeline from '@/components/DaisyUI/Timeline';

describe('Timeline Component', () => {
  const mockItems = [
    {
      time: '2023-10-26',
      title: 'Event 1',
      description: 'Description for event 1'
    },
    {
      time: '2023-10-27',
      title: 'Event 2',
      description: 'Description for event 2'
    },
    {
      time: '2023-10-28',
      title: 'Event 3',
      description: 'Description for event 3'
    }
  ];

  it('renders without crashing', () => {
    render(<Timeline items={mockItems} />);
    
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('displays all timeline items', () => {
    render(<Timeline items={mockItems} />);
    
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
  });

  it('displays item times and descriptions', () => {
    render(<Timeline items={mockItems} />);
    
    expect(screen.getByText('2023-10-26')).toBeInTheDocument();
    expect(screen.getByText('Description for event 1')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Timeline items={mockItems} className="custom-timeline" />);
    
    const timeline = screen.getByRole('list');
    expect(timeline).toHaveClass('custom-timeline');
  });

  it('supports vertical orientation', () => {
    render(<Timeline items={mockItems} orientation="vertical" />);
    
    const timeline = screen.getByRole('list');
    expect(timeline).toHaveClass('timeline-vertical');
  });

  it('supports horizontal orientation', () => {
    render(<Timeline items={mockItems} orientation="horizontal" />);
    
    const timeline = screen.getByRole('list');
    expect(timeline).toHaveClass('timeline-horizontal');
  });

  it('is accessible', () => {
    render(<Timeline items={mockItems} />);
    
    const timeline = screen.getByRole('list');
    expect(timeline).toHaveAttribute('aria-label', 'Timeline of events');
  });

  it('handles empty items array', () => {
    render(<Timeline items={[]} />);
    
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('supports custom item rendering', () => {
    const customItems = [
      {
        ...mockItems[0],
        render: (item: any) => <div data-testid="custom-item">{item.title}</div>
      }
    ];
    
    render(<Timeline items={customItems} />);
    
    expect(screen.getByTestId('custom-item')).toBeInTheDocument();
  });
});