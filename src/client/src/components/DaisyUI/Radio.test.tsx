import { render, screen, fireEvent } from '@testing-library/react';
import Radio from './Radio';

describe('Radio Component', () => {
  test('renders with default props', () => {
    render(<Radio />);
    const radio = screen.getByRole('radio');
    expect(radio).toBeInTheDocument();
    expect(radio).not.toBeChecked();
    expect(radio).not.toBeDisabled();
  });

  test('renders with label', () => {
    render(<Radio label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Radio radioSize="xs" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-xs');

    rerender(<Radio radioSize="sm" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-sm');

    rerender(<Radio radioSize="md" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-md');

    rerender(<Radio radioSize="lg" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-lg');
  });

  test('renders with different colors', () => {
    const { rerender } = render(<Radio color="primary" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-primary');

    rerender(<Radio color="secondary" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-secondary');

    rerender(<Radio color="accent" />);
    expect(screen.getByRole('radio')).toHaveClass('radio-accent');
  });

  test('handles checked state', () => {
    render(<Radio checked={true} />);
    const radio = screen.getByRole('radio');
    expect(radio).toBeChecked();
  });

  test('handles disabled state', () => {
    render(<Radio disabled={true} />);
    const radio = screen.getByRole('radio');
    expect(radio).toBeDisabled();
  });

  test('handles change event', () => {
    const handleChange = jest.fn();
    render(<Radio onChange={handleChange} />);
    const radio = screen.getByRole('radio');
    
    fireEvent.click(radio);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('renders with additional className', () => {
    render(<Radio className="custom-class" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveClass('custom-class');
  });

  test('supports radio group functionality', () => {
    render(
      <>
        <Radio name="test-group" value="option1" />
        <Radio name="test-group" value="option2" />
      </>
    );
    
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    
    const radio1 = radios[0];
    const radio2 = radios[1];
    
    expect(radio1).toHaveAttribute('name', 'test-group');
    expect(radio2).toHaveAttribute('name', 'test-group');
    
    expect(radio1).toHaveAttribute('value', 'option1');
    expect(radio2).toHaveAttribute('value', 'option2');
  });
});