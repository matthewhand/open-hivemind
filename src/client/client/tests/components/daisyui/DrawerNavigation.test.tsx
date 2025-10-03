import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import DrawerNavigation from '@/components/DaisyUI/DrawerNavigation';

describe('DrawerNavigation Component', () => {
  const mockItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/dashboard/settings' }
  ];

  it('renders without crashing', () => {
    render(<DrawerNavigation items={mockItems} />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    render(<DrawerNavigation items={mockItems} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<DrawerNavigation items={mockItems} className="custom-nav" />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-nav');
  });

  it('handles click events on navigation items', () => {
    const mockOnClick = jest.fn();
    render(<DrawerNavigation items={mockItems} onItemClick={mockOnClick} />);
    
    const homeLink = screen.getByText('Home');
    fireEvent.click(homeLink);
    
    expect(mockOnClick).toHaveBeenCalledWith('/', 'Home');
  });

  it('marks active item based on current path', () => {
    render(<DrawerNavigation items={mockItems} activePath="/dashboard" />);
    
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink).toHaveClass('active');
  });

  it('renders with header and footer', () => {
    render(
      <DrawerNavigation
        items={mockItems}
        header={<div>Header</div>}
        footer={<div>Footer</div>}
      />
    );
    
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<DrawerNavigation items={mockItems} />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('handles empty items array', () => {
    render(<DrawerNavigation items={[]} />);
    
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('supports nested navigation items', () => {
    const nestedItems = [
      ...mockItems,
      {
        label: 'Account',
        children: [
          { label: 'Profile', href: '/account/profile' },
          { label: 'Billing', href: '/account/billing' }
        ]
      }
    ];
    
    render(<DrawerNavigation items={nestedItems} />);
    
    expect(screen.getByText('Account')).toBeInTheDocument();
  });
});