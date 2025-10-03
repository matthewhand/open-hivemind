import React from 'react';
import { render, screen } from '@/test-utils';
import Container from '@/components/DaisyUI/Container';

describe('Container Component', () => {
  it('renders without crashing', () => {
    render(<Container />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Container>
        <h1>Container Content</h1>
        <p>This is inside a container</p>
      </Container>
    );
    
    expect(screen.getByText('Container Content')).toBeInTheDocument();
    expect(screen.getByText('This is inside a container')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Container className="custom-container" />);
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('custom-container');
  });

  it('supports different sizes', () => {
    render(<Container size="lg" />);
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('container-lg');
  });

  it('supports fluid layout', () => {
    render(<Container fluid />);
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('container-fluid');
  });

  it('supports centered layout', () => {
    render(<Container centered />);
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('mx-auto');
  });

  it('has accessibility attributes', () => {
    render(<Container />);
    
    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
  });

  it('renders with custom tag', () => {
    render(<Container as="section" />);
    
    const container = screen.getByRole('region');
    expect(container).toBeInTheDocument();
  });

  it('handles empty children', () => {
    render(<Container />);
    
    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});