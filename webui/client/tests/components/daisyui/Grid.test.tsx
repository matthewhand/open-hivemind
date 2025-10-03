import React from 'react';
import { render, screen } from '@/test-utils';
import Grid from '@/components/DaisyUI/Grid';

describe('Grid Component', () => {
  it('renders without crashing', () => {
    render(<Grid />);
    
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Grid>
        <div>Grid Item 1</div>
        <div>Grid Item 2</div>
      </Grid>
    );
    
    expect(screen.getByText('Grid Item 1')).toBeInTheDocument();
    expect(screen.getByText('Grid Item 2')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Grid className="custom-grid" />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toHaveClass('custom-grid');
  });

  it('supports different column layouts', () => {
    render(<Grid cols={3} />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toHaveClass('grid-cols-3');
  });

  it('supports different row layouts', () => {
    render(<Grid rows={2} />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toHaveClass('grid-rows-2');
  });

  it('supports gap configuration', () => {
    render(<Grid gap={4} />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toHaveClass('gap-4');
  });

  it('supports responsive columns', () => {
    render(<Grid cols={{ base: 1, md: 2, lg: 3 }} />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('is accessible', () => {
    render(<Grid />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
  });

  it('handles empty children', () => {
    render(<Grid />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toBeEmptyDOMElement();
  });

  it('supports custom grid items', () => {
    render(
      <Grid>
        <div className="grid-item">Item 1</div>
        <div className="grid-item">Item 2</div>
      </Grid>
    );
    
    const items = screen.getAllByRole('gridcell');
    expect(items).toHaveLength(2);
  });
});