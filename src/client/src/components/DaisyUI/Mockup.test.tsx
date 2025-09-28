import React from 'react';
import { render, screen } from '@testing-library/react';
import Mockup from './Mockup';

describe('Mockup Component', () => {
  const defaultProps = {
    type: 'code' as const,
    content: 'console.log("Hello, world!");',
  };

  it('renders code mockup correctly', () => {
    render(<Mockup {...defaultProps} type="code" />);
    expect(screen.getByRole('region', { name: /Mockup component/i })).toBeInTheDocument();
    expect(screen.getByText('console.log("Hello, world!");')).toBeInTheDocument();
  });

  it('renders browser mockup correctly', () => {
    render(<Mockup {...defaultProps} type="browser" content="https://example.com" />);
    expect(screen.getByRole('region', { name: /Mockup component/i })).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('renders phone mockup correctly', () => {
    render(<Mockup {...defaultProps} type="phone" content="Mobile content" />);
    expect(screen.getByRole('region', { name: /Mockup component/i })).toBeInTheDocument();
    expect(screen.getByText('Mobile content')).toBeInTheDocument();
  });

  it('renders window mockup correctly', () => {
    render(<Mockup {...defaultProps} type="window" content="Window content" />);
    expect(screen.getByRole('region', { name: /Mockup component/i })).toBeInTheDocument();
    expect(screen.getByText('Window content')).toBeInTheDocument();
  });

  it('applies light theme by default', () => {
    render(<Mockup {...defaultProps} />);
    const mockupElement = screen.getByRole('region', { name: /Mockup component/i });
    expect(mockupElement).toHaveClass('bg-white text-black');
  });

  it('applies dark theme when specified', () => {
    render(<Mockup {...defaultProps} theme="dark" />);
    const mockupElement = screen.getByRole('region', { name: /Mockup component/i });
    expect(mockupElement).toHaveClass('bg-gray-800 text-white');
  });

  it('applies color scheme when specified', () => {
    render(<Mockup {...defaultProps} colorScheme="primary" />);
    const mockupElement = screen.getByRole('region', { name: /Mockup component/i });
    expect(mockupElement).toHaveClass('bg-primary');
  });

  it('applies custom width and height', () => {
    render(<Mockup {...defaultProps} width="500px" height="300px" />);
    const mockupElement = screen.getByRole('region', { name: /Mockup component/i });
    expect(mockupElement).toHaveStyle({ width: '500px', height: '300px' });
  });

  it('applies custom class name', () => {
    render(<Mockup {...defaultProps} className="custom-class" />);
    const mockupElement = screen.getByRole('region', { name: /Mockup component/i });
    expect(mockupElement).toHaveClass('custom-class');
  });

  it('uses custom aria label', () => {
    render(<Mockup {...defaultProps} ariaLabel="Custom mockup" />);
    expect(screen.getByRole('region', { name: /Custom mockup/i })).toBeInTheDocument();
 });
});