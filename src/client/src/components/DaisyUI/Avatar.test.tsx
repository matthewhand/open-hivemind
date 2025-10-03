import React from 'react';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  test('renders with default props', () => {
    render(<Avatar />);
    const avatar = document.querySelector('img');
    expect(avatar).toBeInTheDocument();
  });

  test('renders with custom alt text', () => {
    render(<Avatar alt="Test avatar" />);
    const avatar = document.querySelector('img');
    expect(avatar).toHaveAttribute('alt', 'Test avatar');
  });

  test('renders with different sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
    sizes.forEach((size) => {
      render(<Avatar size={size} />);
      const avatar = document.querySelector('.avatar');
      expect(avatar).toBeInTheDocument();
    });
  });

  test('renders with different shapes', () => {
    const shapes = ['circle', 'square'];
    shapes.forEach((shape) => {
      render(<Avatar shape={shape} />);
      const avatar = document.querySelector('.avatar');
      expect(avatar).toBeInTheDocument();
    });
  });

  test('renders with online status indicator', () => {
    render(<Avatar online={true} />);
    const avatar = document.querySelector('.avatar');
    expect(avatar).toBeInTheDocument();
  });

  test('renders placeholder when placeholder prop is true', () => {
    render(<Avatar placeholder={true}>A</Avatar>);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  test('renders image when placeholder prop is false', () => {
    render(<Avatar src="/test-image.jpg" />);
    const avatar = document.querySelector('img');
    expect(avatar).toHaveAttribute('src', '/test-image.jpg');
  });

  test('renders with children when placeholder is true', () => {
    render(<Avatar placeholder={true}>U</Avatar>);
    expect(screen.getByText('U')).toBeInTheDocument();
  });
});