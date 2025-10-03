import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import Accordion from '@/components/DaisyUI/Accordion';

describe('Accordion Component', () => {
  const mockItems = [
    {
      title: 'Section 1',
      content: 'Content for section 1',
      isOpen: false
    },
    {
      title: 'Section 2', 
      content: 'Content for section 2',
      isOpen: true
    },
    {
      title: 'Section 3',
      content: 'Content for section 3',
      isOpen: false
    }
  ];

  it('renders accordion with all sections', () => {
    render(<Accordion items={mockItems} />);
    
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
    expect(screen.getByText('Section 3')).toBeInTheDocument();
  });

  it('displays content for open sections by default', () => {
    render(<Accordion items={mockItems} />);
    
    expect(screen.getByText('Content for section 2')).toBeInTheDocument();
    expect(screen.queryByText('Content for section 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Content for section 3')).not.toBeInTheDocument();
  });

  it('toggles section when clicked', () => {
    render(<Accordion items={mockItems} />);
    
    const section1 = screen.getByText('Section 1');
    fireEvent.click(section1);
    
    expect(screen.getByText('Content for section 1')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<Accordion items={mockItems} className="custom-accordion" />);
    
    const accordion = screen.getByRole('region');
    expect(accordion).toHaveClass('custom-accordion');
  });

  it('handles empty items array', () => {
    render(<Accordion items={[]} />);
    
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('supports custom icons', () => {
    const customIcon = <span data-testid="custom-icon">+</span>;
    render(<Accordion items={mockItems} icon={customIcon} />);
    
    expect(screen.getAllByTestId('custom-icon')).toHaveLength(mockItems.length);
  });

  it('is accessible', () => {
    render(<Accordion items={mockItems} />);
    
    const sections = screen.getAllByRole('button');
    sections.forEach(section => {
      expect(section).toHaveAttribute('aria-expanded');
    });
  });
});