import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import HamburgerMenu from '@/components/DaisyUI/HamburgerMenu';

describe('HamburgerMenu Component', () => {
  const mockItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/dashboard/settings' }
  ];

  it('renders without crashing', () => {
    render(<HamburgerMenu items={mockItems} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(<HamburgerMenu items={mockItems} />);
    
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens when clicked', () => {
    render(<HamburgerMenu items={mockItems} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('renders all menu items', () => {
    render(<HamburgerMenu items={mockItems} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('handles item clicks', () => {
    const mockOnClick = jest.fn();
    render(<HamburgerMenu items={mockItems} onItemClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const homeLink = screen.getByText('Home');
    fireEvent.click(homeLink);
    
    expect(mockOnClick).toHaveBeenCalledWith('/', 'Home');
  });

  it('applies correct CSS classes', () => {
    render(<HamburgerMenu items={mockItems} className="custom-menu" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-menu');
  });

  it('is accessible', () => {
    render(<HamburgerMenu items={mockItems} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('handles empty items array', () => {
    render(<HamburgerMenu items={[]} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports custom icon', () => {
    render(<HamburgerMenu items={mockItems} icon={<span data-testid="custom-icon" />} />);
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});