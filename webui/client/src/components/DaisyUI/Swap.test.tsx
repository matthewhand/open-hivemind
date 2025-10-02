import { render, fireEvent } from '@testing-library/react';
import Swap from './Swap';

describe('Swap Component', () => {
  it('renders onContent and offContent correctly', () => {
    const { getByText } = render(
      <Swap onContent="On" offContent="Off" />
    );
    expect(getByText('On')).toBeInTheDocument();
    expect(getByText('Off')).toBeInTheDocument();
  });

  it('swaps content on click', () => {
    const { getByLabelText, container } = render(
      <Swap onContent="On" offContent="Off" aria-label="Toggle Swap" />
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    
    expect(checkbox).not.toBeChecked();
    
    fireEvent.click(getByLabelText('Toggle Swap'));
    expect(checkbox).toBeChecked();
    
    fireEvent.click(getByLabelText('Toggle Swap'));
    expect(checkbox).not.toBeChecked();
  });

  it('is active by default when defaultActive is true', () => {
    const { container } = render(
      <Swap onContent="On" offContent="Off" defaultActive />
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeChecked();
  });

  it('calls onChange callback when state changes', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Swap onContent="On" offContent="Off" onChange={onChange} aria-label="Toggle Swap" />
    );
    
    fireEvent.click(getByLabelText('Toggle Swap'));
    expect(onChange).toHaveBeenCalledWith(true);
    
    fireEvent.click(getByLabelText('Toggle Swap'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('applies correct animation class', () => {
    const { container } = render(
      <Swap onContent="On" offContent="Off" animation="flip" />
    );
    expect(container.firstChild).toHaveClass('swap-flip');
  });

  it('is disabled when disabled prop is true', () => {
    const onChange = jest.fn();
    const { getByLabelText, container } = render(
      <Swap onContent="On" offContent="Off" disabled onChange={onChange} aria-label="Toggle Swap" />
    );
    
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeDisabled();
    
    fireEvent.click(getByLabelText('Toggle Swap'));
    expect(onChange).not.toHaveBeenCalled();
  });
});