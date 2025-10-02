import { render, screen, fireEvent } from '@testing-library/react';
import Tabs from './Tabs';

describe('Tabs', () => {
  const mockTabs = [
    {
      id: 'tab1',
      title: 'Tab 1',
      content: <div>Content for Tab 1</div>,
    },
    {
      id: 'tab2', 
      title: 'Tab 2',
      content: <div>Content for Tab 2</div>,
    },
    {
      id: 'tab3',
      title: 'Tab 3',
      content: <div>Content for Tab 3</div>,
    },
  ];

  test('renders tabs with correct titles and content', () => {
    render(<Tabs tabs={mockTabs} />);
    
    // Check that all tab titles are rendered
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
    
    // Check that first tab content is active by default
    expect(screen.getByText('Content for Tab 1')).toBeInTheDocument();
  });

  test('sets first tab as active by default', () => {
    render(<Tabs tabs={mockTabs} />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab2).toHaveAttribute('aria-selected', 'false');
  });

  test('sets specified initial active tab', () => {
    render(<Tabs tabs={mockTabs} initialActiveTab="tab2" />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    
    expect(tab1).toHaveAttribute('aria-selected', 'false');
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
  });

  test('changes active tab on click', () => {
    render(<Tabs tabs={mockTabs} />);
    
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.click(tab2);
    
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'false');
  });

  test('renders with correct ARIA attributes', () => {
    render(<Tabs tabs={mockTabs} />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-controls', 'tabpanel-tab1');
    expect(tab1).toHaveAttribute('id', 'tab-tab1');
    
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-tab1');
    expect(tabpanel).toHaveAttribute('id', 'tabpanel-tab1');
  });

  test('applies custom className', () => {
    render(<Tabs tabs={mockTabs} className="custom-class" />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass('custom-class');
  });

  test('applies boxed variant class', () => {
    render(<Tabs tabs={mockTabs} variant="boxed" />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass('tabs-boxed');
  });

  test('applies size classes', () => {
    render(<Tabs tabs={mockTabs} size="lg" />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveClass('tab-lg');
  });

  test('handles empty tabs array gracefully', () => {
    render(<Tabs tabs={[]} />);
    
    // Should not throw errors and should render empty tablist and tabpanel
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});