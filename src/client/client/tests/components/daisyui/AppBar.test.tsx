import React from 'react';
import { render, screen } from '@/test-utils';
import AppBar from '@/components/DaisyUI/AppBar';

describe('AppBar Component', () => {
  it('renders without crashing', () => {
    render(<AppBar />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<AppBar title="My Application" />);
    
    expect(screen.getByText('My Application')).toBeInTheDocument();
  });

  it('renders with children content', () => {
    render(
      <AppBar>
        <button>Action 1</button>
        <button>Action 2</button>
      </AppBar>
    );
    
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<AppBar className="custom-appbar" />);
    
    const appbar = screen.getByRole('banner');
    expect(appbar).toHaveClass('custom-appbar');
  });

  it('has accessibility attributes', () => {
    render(<AppBar title="My App" />);
    
    const appbar = screen.getByRole('banner');
    expect(appbar).toHaveAttribute('aria-label', 'Application header');
  });

  it('renders with fixed position when specified', () => {
    render(<AppBar fixed />);
    
    const appbar = screen.getByRole('banner');
    expect(appbar).toHaveClass('fixed');
  });

  it('renders with different variants', () => {
    render(<AppBar variant="primary" />);
    
    const appbar = screen.getByRole('banner');
    expect(appbar).toHaveClass('bg-primary');
  });
});