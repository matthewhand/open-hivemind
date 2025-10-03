import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import Carousel from '@/components/DaisyUI/Carousel';

describe('Carousel Component', () => {
  const mockItems = [
    { id: 1, content: <div>Slide 1</div>, caption: 'First slide' },
    { id: 2, content: <div>Slide 2</div>, caption: 'Second slide' },
    { id: 3, content: <div>Slide 3</div>, caption: 'Third slide' }
  ];

  it('renders without crashing', () => {
    render(<Carousel items={mockItems} />);
    
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
  });

  it('displays all slides', () => {
    render(<Carousel items={mockItems} />);
    
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
    expect(screen.getByText('Slide 2')).toBeInTheDocument();
    expect(screen.getByText('Slide 3')).toBeInTheDocument();
  });

  it('shows captions when provided', () => {
    render(<Carousel items={mockItems} showCaptions />);
    
    expect(screen.getByText('First slide')).toBeInTheDocument();
    expect(screen.getByText('Second slide')).toBeInTheDocument();
    expect(screen.getByText('Third slide')).toBeInTheDocument();
  });

  it('navigates to next slide on next button click', async () => {
    render(<Carousel items={mockItems} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Slide 2')).toBeInTheDocument();
    });
  });

  it('navigates to previous slide on prev button click', async () => {
    render(<Carousel items={mockItems} />);
    
    // First go to second slide
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Slide 2')).toBeInTheDocument();
    });
    
    // Then go back
    const prevButton = screen.getByRole('button', { name: /prev/i });
    fireEvent.click(prevButton);
    
    await waitFor(() => {
      expect(screen.getByText('Slide 1')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes', () => {
    render(<Carousel items={mockItems} className="custom-carousel" />);
    
    const carousel = screen.getByRole('region');
    expect(carousel).toHaveClass('custom-carousel');
  });

  it('handles auto-play when enabled', () => {
    jest.useFakeTimers();
    render(<Carousel items={mockItems} autoPlay interval={1000} />);
    
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
    
    jest.advanceTimersByTime(1000);
    
    expect(screen.getByText('Slide 2')).toBeInTheDocument();
    
    jest.useRealTimers();
  });

  it('shows navigation indicators', () => {
    render(<Carousel items={mockItems} showIndicators />);
    
    const indicators = screen.getAllByRole('button', { name: /go to slide/i });
    expect(indicators).toHaveLength(3);
  });

  it('is accessible', () => {
    render(<Carousel items={mockItems} />);
    
    const carousel = screen.getByRole('region');
    expect(carousel).toHaveAttribute('aria-label', 'Image carousel');
  });

  it('handles empty items array', () => {
    render(<Carousel items={[]} />);
    
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});