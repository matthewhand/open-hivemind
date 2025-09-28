import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Rating } from './Rating';

describe('Rating', () => {
  test('renders with default props', () => {
    render(<Rating />);
    const ratingContainer = screen.getByRole('radiogroup');
    expect(ratingContainer).toBeInTheDocument();
    expect(ratingContainer).toHaveClass('rating');
    const inputs = screen.getAllByRole('radio');
    // 1 hidden (for 0) + 5 full stars
    expect(inputs.length).toBe(6);
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Rating size="xs" />);
    expect(screen.getByRole('radiogroup')).toHaveClass('rating-xs');

    rerender(<Rating size="sm" />);
    expect(screen.getByRole('radiogroup')).toHaveClass('rating-sm');

    rerender(<Rating size="lg" />);
    expect(screen.getByRole('radiogroup')).toHaveClass('rating-lg');
  });

  test('renders with different shapes', () => {
    const { rerender } = render(<Rating shape="star" />);
    let inputs = screen.getAllByRole('radio');
    inputs.slice(1).forEach(input => {
        expect(input).toHaveClass('mask-star-2');
    });

    rerender(<Rating shape="heart" />);
    inputs = screen.getAllByRole('radio');
    inputs.slice(1).forEach(input => {
        expect(input).toHaveClass('mask-heart');
    });
  });

  test('handles value change', () => {
    const handleChange = jest.fn();
    render(<Rating onChange={handleChange} />);
    const ratingInputs = screen.getAllByRole('radio');
    fireEvent.click(ratingInputs[3]); // Click on the 3rd star
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  test('supports half ratings', () => {
    const handleChange = jest.fn();
    render(<Rating half={true} onChange={handleChange} />);
    const ratingInputs = screen.getAllByRole('radio');
    // With half ratings, there are 1 (0) + 5*2 = 11 inputs
    expect(ratingInputs.length).toBe(11);
    fireEvent.click(ratingInputs[6]); // 3rd full star
    expect(handleChange).toHaveBeenCalledWith(3);
    fireEvent.click(ratingInputs[5]); // 3rd half star
    expect(handleChange).toHaveBeenCalledWith(2.5);
  });

  test('renders in read-only mode', () => {
    const handleChange = jest.fn();
    render(<Rating value={3} readOnly onChange={handleChange} />);
    const ratingInputs = screen.getAllByRole('radio');
    ratingInputs.forEach(input => {
      expect(input).toBeDisabled();
    });
    fireEvent.click(ratingInputs[4]);
    expect(handleChange).not.toHaveBeenCalled();
  });

  test('sets initial value correctly', () => {
    render(<Rating value={4} />);
    const ratingInputs = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(ratingInputs[4]).toBeChecked();
  });

  test('sets initial half value correctly', () => {
    render(<Rating value={3.5} half />);
    const ratingInputs = screen.getAllByRole('radio') as HTMLInputElement[];
    // The 7th input corresponds to 3.5 stars
    expect(ratingInputs[7]).toBeChecked();
  });

  test('applies custom className', () => {
    render(<Rating className="my-custom-class" />);
    expect(screen.getByRole('radiogroup')).toHaveClass('my-custom-class');
  });

  test('has correct ARIA attributes', () => {
    render(<Rating aria-label="Agent Performance" />);
    const ratingContainer = screen.getByRole('radiogroup');
    expect(ratingContainer).toHaveAttribute('aria-label', 'Agent Performance');
  });

  test('handles hover state', () => {
    render(<Rating value={1} />);
    const ratingInputs = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(ratingInputs[1]).toBeChecked();

    fireEvent.mouseEnter(ratingInputs[4]); // Hover over 4th star
    // The component logic for hover is internal and doesn't change `checked` state directly on DOM
    // We can't easily test the visual change without a more complex setup
    // But we can check if the change handler is not called on hover
    const handleChange = jest.fn();
    render(<Rating onChange={handleChange} />);
    fireEvent.mouseEnter(screen.getAllByRole('radio')[4]);
    expect(handleChange).not.toHaveBeenCalled();
  });
});