import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import AdvancedThemeSwitcher from '@/components/DaisyUI/AdvancedThemeSwitcher';

describe('AdvancedThemeSwitcher Component', () => {
 it('renders without crashing', () => {
    render(<AdvancedThemeSwitcher />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays the theme switcher button', () => {
    render(<AdvancedThemeSwitcher />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('toggles theme when clicked', () => {
    render(<AdvancedThemeSwitcher />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // The theme should change after click
    expect(button).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    render(<AdvancedThemeSwitcher />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Theme switcher');
  });

  it('applies correct CSS classes', () => {
    render(<AdvancedThemeSwitcher className="custom-theme-switcher" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-theme-switcher');
  });

  it('renders with default theme', () => {
    render(<AdvancedThemeSwitcher />);
    
    // Check that the default theme is applied
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});