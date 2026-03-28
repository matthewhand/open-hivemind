import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from '../Toggle';

describe('Toggle Component', () => {
  it('renders a switch input', () => {
    render(<Toggle />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
  });

  it('associates the label properly and handles aria-checked', () => {
    render(<Toggle label="Enable Feature" checked={true} onChange={() => {}} />);
    const toggle = screen.getByRole('switch', { name: 'Enable Feature' });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});
