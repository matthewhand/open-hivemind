import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import NavbarWithSearch from '@/components/DaisyUI/NavbarWithSearch';

describe('NavbarWithSearch Component', () => {
  it('renders without crashing', () => {
    render(<NavbarWithSearch />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<NavbarWithSearch title="My App" />);
    
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<NavbarWithSearch />);
    
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    const mockOnSearch = jest.fn();
    render(<NavbarWithSearch onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('applies correct CSS classes', () => {
    render(<NavbarWithSearch className="custom-navbar" />);
    
    const navbar = screen.getByRole('navigation');
    expect(navbar).toHaveClass('custom-navbar');
  });

  it('renders navigation items', () => {
    const navItems = [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' }
    ];
    
    render(<NavbarWithSearch navItems={navItems} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('handles navigation item clicks', () => {
    const mockOnNavClick = jest.fn();
    const navItems = [{ label: 'Home', href: '/' }];
    
    render(<NavbarWithSearch navItems={navItems} onNavClick={mockOnNavClick} />);
    
    const homeLink = screen.getByText('Home');
    fireEvent.click(homeLink);
    
    expect(mockOnNavClick).toHaveBeenCalledWith('/', 'Home');
  });

  it('is accessible', () => {
    render(<NavbarWithSearch />);
    
    const navbar = screen.getByRole('navigation');
    expect(navbar).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('supports search placeholder', () => {
    render(<NavbarWithSearch searchPlaceholder="Search here..." />);
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('placeholder', 'Search here...');
  });

  it('renders with user menu', () => {
    render(<NavbarWithSearch userMenu={<div>User Menu</div>} />);
    
    expect(screen.getByText('User Menu')).toBeInTheDocument();
  });
});