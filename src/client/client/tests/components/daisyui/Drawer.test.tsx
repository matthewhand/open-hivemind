import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import Drawer from '@/components/DaisyUI/Drawer';

describe('Drawer Component', () => {
  it('renders without crashing', () => {
    render(
      <Drawer>
        <div>Drawer Content</div>
      </Drawer>
    );
    
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Drawer>
        <div>Drawer Content</div>
      </Drawer>
    );
    
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(
      <Drawer>
        <div>Drawer Content</div>
      </Drawer>
    );
    
    const drawerContent = screen.getByText('Drawer Content');
    expect(drawerContent).not.toBeVisible();
  });

  it('opens when isOpen prop is true', () => {
    render(
      <Drawer isOpen>
        <div>Drawer Content</div>
      </Drawer>
    );
    
    const drawerContent = screen.getByText('Drawer Content');
    expect(drawerContent).toBeVisible();
  });

  it('closes when overlay is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <Drawer isOpen onClose={mockOnClose}>
        <div>Drawer Content</div>
      </Drawer>
    );
    
    const overlay = screen.getByRole('button', { name: /close drawer/i });
    fireEvent.click(overlay);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('applies correct CSS classes', () => {
    render(
      <Drawer className="custom-drawer">
        <div>Drawer Content</div>
      </Drawer>
    );
    
    const drawer = screen.getByRole('complementary');
    expect(drawer).toHaveClass('custom-drawer');
  });

  it('supports different positions', () => {
    render(
      <Drawer position="right">
        <div>Drawer Content</div>
      </Drawer>
    );
    
    const drawer = screen.getByRole('complementary');
    expect(drawer).toHaveClass('drawer-right');
  });

  it('is accessible', () => {
    render(
      <Drawer isOpen>
        <div>Drawer Content</div>
      </Drawer>
    );
    
    const drawer = screen.getByRole('complementary');
    expect(drawer).toHaveAttribute('aria-hidden', 'false');
  });
});