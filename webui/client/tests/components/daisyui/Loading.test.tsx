import React from 'react';
import { render, screen } from '@/test-utils';
import Loading from '@/components/DaisyUI/Loading';

describe('Loading Component', () => {
  it('renders without crashing', () => {
    render(<Loading />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays loading text', () => {
    render(<Loading text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Loading className="custom-loading" />);
    
    const loading = screen.getByRole('status');
    expect(loading).toHaveClass('custom-loading');
  });

  it('supports different variants', () => {
    render(<Loading variant="spinner" />);
    
    const loading = screen.getByRole('status');
    expect(loading).toHaveClass('loading-spinner');
  });

  it('supports different sizes', () => {
    render(<Loading size="lg" />);
    
    const loading = screen.getByRole('status');
    expect(loading).toHaveClass('loading-lg');
  });

  it('shows overlay when enabled', () => {
    render(<Loading overlay />);
    
    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<Loading />);
    
    const loading = screen.getByRole('status');
    expect(loading).toHaveAttribute('aria-label', 'Loading');
  });

  it('supports custom loading indicator', () => {
    render(<Loading indicator={<div data-testid="custom-indicator" />} />);
    
    expect(screen.getByTestId('custom-indicator')).toBeInTheDocument();
  });

  it('handles empty text', () => {
    render(<Loading text="" />);
    
    const loading = screen.getByRole('status');
    expect(loading).toBeInTheDocument();
  });
});