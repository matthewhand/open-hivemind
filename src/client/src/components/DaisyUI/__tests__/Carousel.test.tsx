import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Carousel from '../Carousel';

describe('Carousel Component', () => {
  const mockItems = [
    { title: 'Slide 1', description: 'Desc 1', image: 'img1.jpg' },
    { title: 'Slide 2', description: 'Desc 2', image: 'img2.jpg' },
    { title: 'Slide 3', description: 'Desc 3', image: 'img3.jpg' },
  ];

  it('renders correctly with given items', () => {
    render(<Carousel items={mockItems} autoplay={false} />);
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
    expect(screen.getByText('Slide 2')).toBeInTheDocument();
    expect(screen.getByText('Slide 3')).toBeInTheDocument();
  });

  it('updates active slide on next/prev button clicks', () => {
    render(<Carousel items={mockItems} autoplay={false} />);

    // Initial active slide is 0
    const nextButtons = screen.getAllByLabelText('Next slide');
    const prevButtons = screen.getAllByLabelText('Previous slide');

    // Click next
    fireEvent.click(nextButtons[0]);

    // Check if indicator 2 is selected
    const tab2 = screen.getByRole('tab', { name: 'Go to slide 2' });
    expect(tab2).toHaveAttribute('aria-selected', 'true');

    // Click prev
    fireEvent.click(prevButtons[1]);
    const tab1 = screen.getByRole('tab', { name: 'Go to slide 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
  });

  it('updates active slide on keyboard navigation', () => {
    render(<Carousel items={mockItems} autoplay={false} />);

    const carouselContainer = screen.getByLabelText('Carousel');

    // Arrow Right
    fireEvent.keyDown(carouselContainer, { key: 'ArrowRight' });
    const tab2 = screen.getByRole('tab', { name: 'Go to slide 2' });
    expect(tab2).toHaveAttribute('aria-selected', 'true');

    // Arrow Left
    fireEvent.keyDown(carouselContainer, { key: 'ArrowLeft' });
    const tab1 = screen.getByRole('tab', { name: 'Go to slide 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');
  });

  it('updates active slide when clicking specific indicators', () => {
    render(<Carousel items={mockItems} autoplay={false} />);

    const tab3 = screen.getByRole('tab', { name: 'Go to slide 3' });
    fireEvent.click(tab3);

    expect(tab3).toHaveAttribute('aria-selected', 'true');
  });
});
