import React from 'react';
import { render, screen } from '@/test-utils';
import LinearProgress from '@/components/DaisyUI/LinearProgress';

describe('LinearProgress Component', () => {
  it('renders without crashing', () => {
    render(<LinearProgress />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays correct progress value', () => {
    render(<LinearProgress value={50} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('applies correct CSS classes', () => {
    render(<LinearProgress className="custom-progress" />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveClass('custom-progress');
  });

  it('supports different variants', () => {
    render(<LinearProgress variant="primary" />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveClass('progress-primary');
  });

  it('shows indeterminate state when value is not provided', () => {
    render(<LinearProgress />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).not.toHaveAttribute('aria-valuenow');
  });

  it('is accessible', () => {
    render(<LinearProgress value={75} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
  });

  it('handles buffer value', () => {
    render(<LinearProgress value={50} buffer={75} />);
    
    // Test that buffer is rendered correctly
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
  });

  it('supports custom height', () => {
    render(<LinearProgress height={10} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveStyle('height: 10px');
  });
});