import { render, fireEvent, screen } from '@testing-library/react';
import Collapsible from './Collapsible';

describe('Collapsible Component', () => {
  it('renders with the correct title', () => {
    render(
      <Collapsible title="Test Title">
        <p>Collapsible content</p>
      </Collapsible>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('toggles content visibility on click', () => {
    const { getByLabelText } = render(
      <Collapsible title="Test Title">
        <p>Collapsible content</p>
      </Collapsible>
    );
    const checkbox = getByLabelText('Toggle Test Title');
    
    // Initially, content should be hidden
    expect(checkbox).not.toBeChecked();

    // Click to expand
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Click to collapse
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('is open by default when defaultOpen is true', () => {
    const { getByLabelText } = render(
      <Collapsible title="Test Title" defaultOpen>
        <p>Collapsible content</p>
      </Collapsible>
    );
    expect(getByLabelText('Toggle Test Title')).toBeChecked();
  });

  it('calls onToggle callback when state changes', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <Collapsible title="Test Title" onToggle={onToggle}>
        <p>Collapsible content</p>
      </Collapsible>
    );
    const checkbox = getByLabelText('Toggle Test Title');
    
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(true);
    
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('applies correct variant classes', () => {
    const { container } = render(
      <Collapsible title="Test Title" variant="plus">
        <p>Collapsible content</p>
      </Collapsible>
    );
    expect(container.firstChild).toHaveClass('collapse-plus');
  });

  it('displays custom icons when provided', () => {
    const { getByText, getByLabelText } = render(
      <Collapsible 
        title="Test Title" 
        collapsedIcon="▶" 
        expandedIcon="▼"
      >
        <p>Collapsible content</p>
      </Collapsible>
    );
    
    expect(getByText('▶')).toBeInTheDocument();
    
    const checkbox = getByLabelText('Toggle Test Title');
    fireEvent.click(checkbox);
    
    expect(getByText('▼')).toBeInTheDocument();
  });
});