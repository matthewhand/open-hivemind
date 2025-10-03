import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import DashboardWidgetSystem from '@/components/DaisyUI/DashboardWidgetSystem';

describe('DashboardWidgetSystem Component', () => {
  const mockWidgets = [
    {
      id: 'widget1',
      title: 'User Activity',
      content: <div>Activity data</div>,
      size: 'small',
      position: { x: 0, y: 0 }
    },
    {
      id: 'widget2',
      title: 'System Status',
      content: <div>Status data</div>,
      size: 'medium',
      position: { x: 1, y: 0 }
    },
    {
      id: 'widget3',
      title: 'Performance Metrics',
      content: <div>Metrics data</div>,
      size: 'large',
      position: { x: 0, y: 1 }
    }
  ];

  it('renders without crashing', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays all widgets', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} />);
    
    expect(screen.getByText('User Activity')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} className="custom-dashboard" />);
    
    const dashboard = screen.getByRole('main');
    expect(dashboard).toHaveClass('custom-dashboard');
  });

  it('handles widget reordering', () => {
    const mockOnReorder = jest.fn();
    render(<DashboardWidgetSystem widgets={mockWidgets} onWidgetReorder={mockOnReorder} />);
    
    const widget1 = screen.getByText('User Activity');
    fireEvent.dragStart(widget1);
    fireEvent.drop(screen.getByText('System Status'));
    
    expect(mockOnReorder).toHaveBeenCalled();
  });

  it('handles widget resizing', () => {
    const mockOnResize = jest.fn();
    render(<DashboardWidgetSystem widgets={mockWidgets} onWidgetResize={mockOnResize} />);
    
    const resizeHandle = screen.getByLabelText('Resize widget');
    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseUp(resizeHandle);
    
    expect(mockOnResize).toHaveBeenCalled();
  });

  it('shows widget controls on hover', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} />);
    
    const widget = screen.getByText('User Activity');
    fireEvent.mouseEnter(widget);
    
    expect(screen.getByLabelText('Widget controls')).toBeInTheDocument();
  });

  it('handles widget removal', () => {
    const mockOnRemove = jest.fn();
    render(<DashboardWidgetSystem widgets={mockWidgets} onWidgetRemove={mockOnRemove} />);
    
    const removeButton = screen.getByLabelText('Remove widget');
    fireEvent.click(removeButton);
    
    expect(mockOnRemove).toHaveBeenCalledWith('widget1');
  });

  it('supports different layout modes', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} layoutMode="grid" />);
    
    const dashboard = screen.getByRole('main');
    expect(dashboard).toHaveClass('grid-layout');
  });

  it('is accessible', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} />);
    
    const dashboard = screen.getByRole('main');
    expect(dashboard).toHaveAttribute('aria-label', 'Dashboard widgets');
  });

  it('handles empty widgets array', () => {
    render(<DashboardWidgetSystem widgets={[]} />);
    
    expect(screen.getByText('No widgets to display')).toBeInTheDocument();
  });

  it('supports widget customization', () => {
    render(<DashboardWidgetSystem widgets={mockWidgets} customizable />);
    
    const customizeButton = screen.getByLabelText('Customize widget');
    expect(customizeButton).toBeInTheDocument();
  });
});