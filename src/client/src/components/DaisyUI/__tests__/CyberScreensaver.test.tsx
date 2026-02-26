import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import CyberScreensaver from '../CyberScreensaver';

describe('CyberScreensaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the clock and date', () => {
    render(<CyberScreensaver />);

    // Check for time format (XX:XX:XX)
    // The time appears in the main clock AND potentially in the logs.
    // We just want to ensure at least one instance is present.
    const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);

    // Check for date
    const dateElement = screen.getByText(/[A-Z]+, [A-Z]+ \d{1,2}, \d{4}/);
    expect(dateElement).toBeInTheDocument();
  });

  it('renders system logs', () => {
    render(<CyberScreensaver />);

    const logHeader = screen.getByText(/root@hivemind:~# system_monitor --live/);
    expect(logHeader).toBeInTheDocument();
  });

  it('renders system stats', () => {
    render(<CyberScreensaver />);

    const uptime = screen.getByText(/UPTIME:/);
    expect(uptime).toBeInTheDocument();

    const cpu = screen.getByText(/CPU LOAD:/);
    expect(cpu).toBeInTheDocument();
  });
});
