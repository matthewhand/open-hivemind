import React from 'react';
import { render, screen } from '@/test-utils';
import Typography from '@/components/DaisyUI/Typography';

describe('Typography Component', () => {
  it('renders without crashing', () => {
    render(<Typography>Test text</Typography>);
    
    expect(screen.getByText('Test text')).toBeInTheDocument();
  });

  it('renders as different HTML elements', () => {
    render(<Typography as="h1">Heading 1</Typography>);
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Typography className="custom-typography">Test text</Typography>);
    
    const element = screen.getByText('Test text');
    expect(element).toHaveClass('custom-typography');
  });

  it('supports different variants', () => {
    render(<Typography variant="h1">Heading 1</Typography>);
    
    const element = screen.getByText('Heading 1');
    expect(element).toHaveClass('h1');
  });

  it('supports text alignment', () => {
    render(<Typography align="center">Centered text</Typography>);
    
    const element = screen.getByText('Centered text');
    expect(element).toHaveClass('text-center');
  });

  it('supports text colors', () => {
    render(<Typography color="primary">Primary text</Typography>);
    
    const element = screen.getByText('Primary text');
    expect(element).toHaveClass('text-primary');
  });

  it('supports text weights', () => {
    render(<Typography weight="bold">Bold text</Typography>);
    
    const element = screen.getByText('Bold text');
    expect(element).toHaveClass('font-bold');
  });

  it('is accessible', () => {
    render(<Typography as="h2">Accessible heading</Typography>);
    
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
  });

  it('handles truncation', () => {
    render(<Typography truncate>Long text that should be truncated</Typography>);
    
    const element = screen.getByText('Long text that should be truncated');
    expect(element).toHaveClass('truncate');
  });

  it('supports responsive text', () => {
    render(<Typography responsive>Responsive text</Typography>);
    
    const element = screen.getByText('Responsive text');
    expect(element).toBeInTheDocument();
  });
});