import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import Breadcrumbs from '@/components/DaisyUI/Breadcrumbs';

describe('Breadcrumbs Component', () => {
  const mockItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/dashboard/settings' }
  ];

  it('renders without crashing', () => {
    render(<Breadcrumbs items={mockItems} />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders all breadcrumb items', () => {
    render(<Breadcrumbs items={mockItems} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Breadcrumbs items={mockItems} className="custom-breadcrumbs" />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-breadcrumbs');
  });

  it('handles click events on breadcrumb items', () => {
    const mockOnClick = jest.fn();
    render(<Breadcrumbs items={mockItems} onItemClick={mockOnClick} />);
    
    const homeLink = screen.getByText('Home');
    fireEvent.click(homeLink);
    
    expect(mockOnClick).toHaveBeenCalledWith('/', 'Home');
  });

  it('marks last item as current page', () => {
    render(<Breadcrumbs items={mockItems} />);
    
    const lastItem = screen.getByText('Settings');
    expect(lastItem).toHaveAttribute('aria-current', 'page');
  });

  it('renders with custom separator', () => {
    render(<Breadcrumbs items={mockItems} separator=">" />);
    
    const separators = screen.getAllByText('>');
    expect(separators).toHaveLength(2);
  });

  it('handles empty items array', () => {
    render(<Breadcrumbs items={[]} />);
    
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<Breadcrumbs items={mockItems} />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });
});